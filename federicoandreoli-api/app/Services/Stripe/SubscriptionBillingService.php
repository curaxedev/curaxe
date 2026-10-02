<?php

namespace App\Services\Stripe;

use App\Domains\Auth\Enums\UserRole;
use App\Models\AuditLog;
use App\Models\BillingRefund;
use App\Models\BillingSetting;
use App\Models\Subscription;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;
use Stripe\Checkout\Session as CheckoutSession;
use Stripe\Exception\ApiErrorException;

class SubscriptionBillingService
{
    public function __construct(
        private readonly StripeClientFactory $clients,
    ) {}

    public function ensureSubscription(User $user): Subscription
    {
        $audience = $this->audienceFor($user);

        return Subscription::query()->firstOrCreate(
            ['user_id' => $user->id],
            [
                'audience' => $audience,
                'plan_type' => 'free',
                'status' => 'incomplete',
                'history' => [],
            ],
        );
    }

    public function audienceFor(User $user): string
    {
        return match ($user->role) {
            UserRole::Agency => 'agency',
            UserRole::Structure => 'structure',
            default => 'professional',
        };
    }

    public function planTypeFor(User $user): string
    {
        return match ($user->role) {
            UserRole::Agency => 'agency_business',
            UserRole::Structure => 'structure_business',
            default => 'professional_premium',
        };
    }

    /**
     * Mock Stripe consentito solo in local/testing (mai staging/production).
     */
    public function allowsMockBilling(): bool
    {
        return app()->environment(['local', 'testing']);
    }

    public function assertBillable(User $user): void
    {
        if (! in_array($user->role, [UserRole::Professional, UserRole::Agency, UserRole::Structure], true)) {
            throw new \InvalidArgumentException('Questo account non può sottoscrivere un abbonamento.');
        }
    }

    /**
     * @return array{sessionId: string, mode: string, url: string|null, audience: string}
     */
    public function createCheckout(User $user, ?string $audience, ?string $successUrl, ?string $cancelUrl): array
    {
        $this->assertBillable($user);

        // Audience sempre derivata dal ruolo: il client non sceglie il prezzo.
        $audience = $this->audienceFor($user);

        $settings = BillingSetting::current();
        $frontend = rtrim((string) config('app.frontend_url'), '/');
        $successUrl = $this->safeReturnUrl($successUrl, $frontend.'/dashboard?billing=success');
        $cancelUrl = $this->safeReturnUrl($cancelUrl, $frontend.'/dashboard?billing=cancel');

        $secret = $settings->decryptedSecretKey();
        if ($secret === null || $secret === '') {
            if (! $this->allowsMockBilling()) {
                throw new \RuntimeException('Stripe non configurato. Completa la procedura guidata Pagamenti.');
            }
            $sessionId = 'cs_test_'.Str::lower(Str::random(24));

            return [
                'sessionId' => $sessionId,
                'mode' => 'mock',
                'url' => null,
                'audience' => $audience,
            ];
        }

        if (! $settings->isSetupComplete()) {
            throw new \InvalidArgumentException('Configurazione Stripe incompleta. Contatta l’amministratore.');
        }

        $priceId = $settings->priceIdForAudience($audience);
        if ($priceId === null || $priceId === '') {
            throw new \InvalidArgumentException('Price ID Stripe non configurato per questo piano.');
        }

        $sub = $this->ensureSubscription($user);
        $client = $this->clients->requireClient($settings);

        $customerId = $sub->stripe_customer_id;
        if (! is_string($customerId) || $customerId === '') {
            $customer = $client->customers->create([
                'email' => $user->email,
                'name' => $user->name,
                'metadata' => [
                    'user_id' => (string) $user->id,
                    'audience' => $audience,
                ],
            ]);
            $customerId = $customer->id;
            $sub->stripe_customer_id = $customerId;
            $sub->save();
        }

        $trialDays = $settings->trialDaysForAudience($audience);
        $params = [
            'mode' => 'subscription',
            'customer' => $customerId,
            'client_reference_id' => (string) $user->id,
            'success_url' => $successUrl.(str_contains($successUrl, '?') ? '&' : '?').'session_id={CHECKOUT_SESSION_ID}',
            'cancel_url' => $cancelUrl,
            'line_items' => [['price' => $priceId, 'quantity' => 1]],
            'payment_method_collection' => 'always',
            'allow_promotion_codes' => true,
            'metadata' => [
                'user_id' => (string) $user->id,
                'audience' => $audience,
                'plan_type' => $this->planTypeFor($user),
            ],
            'subscription_data' => [
                'metadata' => [
                    'user_id' => (string) $user->id,
                    'audience' => $audience,
                ],
            ],
        ];

        if ($trialDays > 0) {
            $params['subscription_data']['trial_period_days'] = $trialDays;
        }

        /** @var CheckoutSession $session */
        $session = $client->checkout->sessions->create($params);

        $sub->pushHistory('checkout_session_created', ['sessionId' => $session->id]);
        $sub->save();

        return [
            'sessionId' => $session->id,
            'mode' => 'redirect',
            'url' => $session->url,
            'audience' => $audience,
        ];
    }

    /**
     * Sync-only: non attiva abbonamenti senza webhook quando Stripe è configurato.
     */
    public function completeCheckout(User $user, string $sessionId): Subscription
    {
        $this->assertBillable($user);
        $sub = $this->ensureSubscription($user);
        $settings = BillingSetting::current();
        $client = $this->clients->make($settings);

        if ($client === null) {
            if (! $this->allowsMockBilling()) {
                throw new \RuntimeException('Stripe non configurato.');
            }
            // Modalità mock solo local/testing
            $sub->plan_type = $this->planTypeFor($user);
            $sub->status = 'active';
            $sub->current_period_end = now()->addMonth();
            $sub->cancel_at_period_end = false;
            $sub->pushHistory('checkout_completed', ['sessionId' => $sessionId, 'mode' => 'mock']);
            $sub->save();

            return $sub->fresh();
        }

        try {
            $session = $client->checkout->sessions->retrieve($sessionId, [
                'expand' => ['subscription'],
            ]);
        } catch (ApiErrorException $e) {
            throw new \InvalidArgumentException('Sessione Checkout non valida: '.$e->getMessage());
        }

        if ((string) ($session->client_reference_id ?? '') !== (string) $user->id
            && (string) ($session->metadata['user_id'] ?? '') !== (string) $user->id) {
            throw new \InvalidArgumentException('Sessione non appartenente all’utente.');
        }

        if ($session->status === 'complete' && (is_string($session->subscription) || is_object($session->subscription))) {
            $stripeSubId = is_object($session->subscription)
                ? $session->subscription->id
                : $session->subscription;
            $stripeSub = is_object($session->subscription)
                ? $session->subscription
                : $client->subscriptions->retrieve($stripeSubId);
            $this->applyStripeSubscription($sub, $stripeSub, $user);
            $sub->pushHistory('checkout_synced', ['sessionId' => $sessionId]);
            $sub->save();
        }

        return $sub->fresh();
    }

    public function cancelAtPeriodEnd(User $user): Subscription
    {
        $sub = $this->ensureSubscription($user);
        $settings = BillingSetting::current();
        $client = $this->clients->make($settings);

        if ($client !== null && is_string($sub->stripe_subscription_id) && $sub->stripe_subscription_id !== '') {
            $client->subscriptions->update($sub->stripe_subscription_id, [
                'cancel_at_period_end' => true,
            ]);
        }

        $sub->cancel_at_period_end = true;
        $sub->pushHistory('cancel_requested');
        $sub->save();

        return $sub->fresh();
    }

    /**
     * @return array{url: string}
     */
    public function createPortalSession(User $user, ?string $returnUrl = null): array
    {
        $sub = $this->ensureSubscription($user);
        if (! is_string($sub->stripe_customer_id) || $sub->stripe_customer_id === '') {
            throw new \InvalidArgumentException('Nessun cliente Stripe associato.');
        }

        $settings = BillingSetting::current();
        $client = $this->clients->requireClient($settings);
        $frontend = rtrim((string) config('app.frontend_url'), '/');
        $returnUrl = $this->safeReturnUrl($returnUrl, $frontend.'/dashboard');

        $params = [
            'customer' => $sub->stripe_customer_id,
            'return_url' => $returnUrl,
        ];
        if (is_string($settings->portal_configuration_id) && $settings->portal_configuration_id !== '') {
            $params['configuration'] = $settings->portal_configuration_id;
        }

        $session = $client->billingPortal->sessions->create($params);

        AuditLog::record($user->id, 'billing.portal_session', Subscription::class, (string) $sub->id, [
            'return_host' => parse_url($returnUrl, PHP_URL_HOST),
        ]);

        return ['url' => $session->url];
    }

    /**
     * Elenco fatture Stripe del solo customer legato all'utente autenticato.
     * Mai accettare customer ID dal client.
     *
     * @return list<array{
     *   id: string,
     *   number: string|null,
     *   status: string|null,
     *   amountDue: int,
     *   amountPaid: int,
     *   currency: string,
     *   createdAt: string|null,
     *   hostedInvoiceUrl: string|null,
     *   invoicePdf: string|null
     * }>
     */
    public function listInvoices(User $user, int $limit = 24): array
    {
        $sub = $this->ensureSubscription($user);
        if (! is_string($sub->stripe_customer_id) || $sub->stripe_customer_id === '') {
            return [];
        }

        $limit = max(1, min(24, $limit));
        $settings = BillingSetting::current();
        $client = $this->clients->requireClient($settings);

        $page = $client->invoices->all([
            'customer' => $sub->stripe_customer_id,
            'limit' => $limit,
        ]);

        $out = [];
        foreach ($page->data as $invoice) {
            $hosted = isset($invoice->hosted_invoice_url) && is_string($invoice->hosted_invoice_url)
                ? $invoice->hosted_invoice_url
                : null;
            $pdf = isset($invoice->invoice_pdf) && is_string($invoice->invoice_pdf)
                ? $invoice->invoice_pdf
                : null;

            // Solo URL https Stripe-hosted; evita XSS / open-redirect via campi anomali.
            if ($hosted !== null && ! str_starts_with($hosted, 'https://')) {
                $hosted = null;
            }
            if ($pdf !== null && ! str_starts_with($pdf, 'https://')) {
                $pdf = null;
            }

            $created = isset($invoice->created) ? Carbon::createFromTimestamp((int) $invoice->created) : null;

            $out[] = [
                'id' => (string) $invoice->id,
                'number' => isset($invoice->number) && is_string($invoice->number) ? $invoice->number : null,
                'status' => isset($invoice->status) && is_string($invoice->status) ? $invoice->status : null,
                'amountDue' => (int) ($invoice->amount_due ?? 0),
                'amountPaid' => (int) ($invoice->amount_paid ?? 0),
                'currency' => strtolower((string) ($invoice->currency ?? 'eur')),
                'createdAt' => $created?->toIso8601String(),
                'hostedInvoiceUrl' => $hosted,
                'invoicePdf' => $pdf,
            ];
        }

        return $out;
    }

    public function adminRefund(User $admin, Subscription $sub, ?int $amountCents, ?string $reason): BillingRefund
    {
        $client = $this->clients->requireClient();
        if (! is_string($sub->stripe_subscription_id) || $sub->stripe_subscription_id === '') {
            throw new \InvalidArgumentException('Abbonamento senza ID Stripe.');
        }

        $stripeSub = $client->subscriptions->retrieve($sub->stripe_subscription_id, [
            'expand' => ['latest_invoice.payment_intent'],
        ]);
        $invoice = $stripeSub->latest_invoice;
        if (is_string($invoice) && $invoice !== '') {
            $invoice = $client->invoices->retrieve($invoice, ['expand' => ['payment_intent']]);
        }
        $paymentIntent = is_object($invoice) ? ($invoice->payment_intent ?? null) : null;
        if (is_string($paymentIntent) && $paymentIntent !== '') {
            $paymentIntent = $client->paymentIntents->retrieve($paymentIntent);
        }
        $chargeId = null;
        if (is_object($paymentIntent) && isset($paymentIntent->latest_charge)) {
            $chargeId = is_string($paymentIntent->latest_charge)
                ? $paymentIntent->latest_charge
                : ($paymentIntent->latest_charge->id ?? null);
        }
        // Fail closed: mai rimborsare "l'ultimo charge del customer" (potrebbe essere un altro abbonamento).
        if (! is_string($chargeId) || $chargeId === '') {
            throw new \InvalidArgumentException('Nessun addebito rimborsabile trovato sull’ultima fattura dell’abbonamento.');
        }

        $params = ['charge' => $chargeId];
        if ($amountCents !== null && $amountCents > 0) {
            $params['amount'] = $amountCents;
        }
        if (is_string($reason) && $reason !== '') {
            $params['reason'] = in_array($reason, ['duplicate', 'fraudulent', 'requested_by_customer'], true)
                ? $reason
                : 'requested_by_customer';
            $params['metadata'] = ['admin_reason' => $reason];
        }

        $refund = $client->refunds->create($params);

        $row = BillingRefund::query()->create([
            'subscription_id' => $sub->id,
            'actor_admin_id' => $admin->id,
            'stripe_refund_id' => $refund->id,
            'amount_cents' => (int) ($refund->amount ?? $amountCents ?? 0),
            'currency' => (string) ($refund->currency ?? 'eur'),
            'status' => (string) ($refund->status ?? 'pending'),
            'reason' => $reason,
            'meta' => ['charge' => $chargeId],
        ]);

        $sub->pushHistory('admin_refund', ['refundId' => $refund->id]);
        $sub->save();

        AuditLog::record($admin->id, 'billing.refund', Subscription::class, (string) $sub->id, [
            'refund_id' => $refund->id,
            'amount' => $row->amount_cents,
        ]);

        return $row;
    }

    public function adminExtendTrial(User $admin, Subscription $sub, int $extraDays): Subscription
    {
        if ($extraDays < 1 || $extraDays > 90) {
            throw new \InvalidArgumentException('Giorni di prova tra 1 e 90.');
        }

        $client = $this->clients->requireClient();
        if (! is_string($sub->stripe_subscription_id) || $sub->stripe_subscription_id === '') {
            throw new \InvalidArgumentException('Abbonamento senza ID Stripe.');
        }

        $base = $sub->trial_ends_at && $sub->trial_ends_at->isFuture()
            ? $sub->trial_ends_at->copy()
            : now();
        $trialEnd = $base->addDays($extraDays);

        $client->subscriptions->update($sub->stripe_subscription_id, [
            'trial_end' => $trialEnd->timestamp,
            'proration_behavior' => 'none',
        ]);

        $sub->trial_ends_at = $trialEnd;
        $sub->status = 'trialing';
        $sub->pushHistory('admin_trial_extended', ['days' => $extraDays, 'trial_end' => $trialEnd->toIso8601String()]);
        $sub->save();

        AuditLog::record($admin->id, 'billing.trial_extend', Subscription::class, (string) $sub->id, [
            'days' => $extraDays,
        ]);

        return $sub->fresh();
    }

    /**
     * @param  object  $stripeSub  Stripe Subscription object
     */
    public function applyStripeSubscription(Subscription $sub, object $stripeSub, ?User $user = null): void
    {
        $sub->stripe_subscription_id = $stripeSub->id ?? $sub->stripe_subscription_id;
        $sub->stripe_customer_id = is_string($stripeSub->customer ?? null)
            ? $stripeSub->customer
            : ($stripeSub->customer->id ?? $sub->stripe_customer_id);
        $sub->status = (string) ($stripeSub->status ?? $sub->status);
        $sub->cancel_at_period_end = (bool) ($stripeSub->cancel_at_period_end ?? false);
        $priceId = null;
        if (isset($stripeSub->items->data[0]->price)) {
            $price = $stripeSub->items->data[0]->price;
            $priceId = is_string($price) ? $price : ($price->id ?? null);
        }
        if (is_string($priceId) && $priceId !== '') {
            $sub->price_id = $priceId;
        }

        if (isset($stripeSub->current_period_start)) {
            $sub->current_period_start = Carbon::createFromTimestamp((int) $stripeSub->current_period_start);
        }
        if (isset($stripeSub->current_period_end)) {
            $sub->current_period_end = Carbon::createFromTimestamp((int) $stripeSub->current_period_end);
        }
        if (isset($stripeSub->trial_end) && $stripeSub->trial_end) {
            $sub->trial_ends_at = Carbon::createFromTimestamp((int) $stripeSub->trial_end);
        }
        if (isset($stripeSub->cancel_at) && $stripeSub->cancel_at) {
            $sub->cancel_at = Carbon::createFromTimestamp((int) $stripeSub->cancel_at);
        }

        $status = $sub->status;
        if (in_array($status, ['active', 'trialing'], true) && $user !== null) {
            $sub->plan_type = $this->planTypeFor($user);
        }
        if ($status === 'canceled') {
            $sub->plan_type = 'free';
        }

        if (isset($stripeSub->latest_invoice)) {
            $sub->latest_invoice_id = is_string($stripeSub->latest_invoice)
                ? $stripeSub->latest_invoice
                : ($stripeSub->latest_invoice->id ?? $sub->latest_invoice_id);
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function payload(Subscription $s): array
    {
        return [
            'userId' => (string) $s->user_id,
            'audience' => $s->audience,
            'planType' => $s->plan_type,
            'status' => $s->status,
            'stripeCustomerId' => $s->stripe_customer_id,
            'stripeSubscriptionId' => $s->stripe_subscription_id,
            'priceId' => $s->price_id,
            'currentPeriodStart' => $s->current_period_start?->toIso8601String(),
            'currentPeriodEnd' => $s->current_period_end?->toIso8601String(),
            'trialEndsAt' => $s->trial_ends_at?->toIso8601String(),
            'cancelAt' => $s->cancel_at?->toIso8601String(),
            'cancelAtPeriodEnd' => $s->cancel_at_period_end,
            'history' => array_slice($s->history ?? [], -50),
        ];
    }

    /**
     * Allowlist host-exact per return URL Stripe (niente prefix bypass @ / sibling).
     */
    private function safeReturnUrl(?string $url, string $fallback): string
    {
        if (! is_string($url) || $url === '') {
            return $fallback;
        }

        $parts = parse_url($url);
        if (! is_array($parts) || empty($parts['scheme']) || empty($parts['host'])) {
            return $fallback;
        }

        $scheme = strtolower((string) $parts['scheme']);
        $host = strtolower((string) $parts['host']);
        if (isset($parts['user']) || isset($parts['pass'])) {
            return $fallback; // blocca https://curaxe.it@evil.com
        }

        $local = app()->environment(['local', 'testing']);
        if (! $local && $scheme !== 'https') {
            return $fallback;
        }
        if (! in_array($scheme, ['http', 'https'], true)) {
            return $fallback;
        }

        $allowedHosts = [];
        foreach (config('app.frontend_urls', []) as $origin) {
            $o = parse_url((string) $origin);
            if (is_array($o) && ! empty($o['host'])) {
                $allowedHosts[] = strtolower((string) $o['host']);
            }
        }
        $primary = parse_url((string) config('app.frontend_url'));
        if (is_array($primary) && ! empty($primary['host'])) {
            $allowedHosts[] = strtolower((string) $primary['host']);
        }
        $allowedHosts = array_values(array_unique($allowedHosts));

        if (! in_array($host, $allowedHosts, true)) {
            return $fallback;
        }

        // Ricostruisci URL senza userinfo; path/query/fragment preservati.
        $port = isset($parts['port']) ? ':'.$parts['port'] : '';
        $path = $parts['path'] ?? '/';
        $query = isset($parts['query']) ? '?'.$parts['query'] : '';
        $fragment = isset($parts['fragment']) ? '#'.$parts['fragment'] : '';

        return $scheme.'://'.$host.$port.$path.$query.$fragment;
    }
}
