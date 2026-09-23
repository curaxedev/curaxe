<?php

namespace App\Services\Stripe;

use App\Models\BillingRefund;
use App\Models\BillingSetting;
use App\Models\StripeWebhookEvent;
use App\Models\Subscription;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Stripe\Exception\SignatureVerificationException;
use Stripe\Webhook;

class StripeWebhookProcessor
{
    public function __construct(
        private readonly SubscriptionBillingService $billing,
        private readonly StripeClientFactory $clients,
    ) {}

    /**
     * @return array{received: bool, duplicate?: bool, ignored?: bool}
     */
    public function handle(string $payload, string $signatureHeader): array
    {
        if ($signatureHeader === '') {
            throw new \InvalidArgumentException('Firma webhook mancante.');
        }

        $settings = BillingSetting::current();
        $secret = $settings->decryptedWebhookSecret();
        if ($secret === null || $secret === '') {
            throw new \RuntimeException('Webhook non configurato.');
        }

        try {
            $event = Webhook::constructEvent($payload, $signatureHeader, $secret);
        } catch (\UnexpectedValueException $e) {
            throw new \InvalidArgumentException('Payload webhook non valido.');
        } catch (SignatureVerificationException $e) {
            throw new \InvalidArgumentException('Firma webhook non valida.');
        }

        $eventId = (string) $event->id;
        $type = (string) $event->type;

        // Solo eventi noti: ignora il resto (riduce superficie e rumore).
        $known = [
            'checkout.session.completed',
            'customer.subscription.created',
            'customer.subscription.updated',
            'customer.subscription.deleted',
            'invoice.paid',
            'invoice.payment_failed',
            'invoice.payment_action_required',
            'charge.refunded',
            'refund.created',
            'refund.updated',
            'refund.failed',
            'customer.subscription.trial_will_end',
        ];
        if (! in_array($type, $known, true)) {
            return ['received' => true, 'ignored' => true];
        }

        return DB::transaction(function () use ($eventId, $type, $event) {
            // lockForUpdate evita race su retry paralleli Stripe.
            $existing = StripeWebhookEvent::query()
                ->where('event_id', $eventId)
                ->lockForUpdate()
                ->first();
            if ($existing !== null) {
                return ['received' => true, 'duplicate' => true];
            }

            StripeWebhookEvent::query()->create([
                'event_id' => $eventId,
                'type' => $type,
                'processed_at' => now(),
            ]);

            $object = $event->data->object;
            match ($type) {
                'checkout.session.completed' => $this->onCheckoutCompleted($object),
                'customer.subscription.created',
                'customer.subscription.updated' => $this->onSubscriptionUpsert($object),
                'customer.subscription.deleted' => $this->onSubscriptionDeleted($object),
                'invoice.paid' => $this->onInvoicePaid($object),
                'invoice.payment_failed' => $this->onInvoiceFailed($object),
                'invoice.payment_action_required' => $this->onInvoiceActionRequired($object),
                'charge.refunded',
                'refund.created',
                'refund.updated',
                'refund.failed' => $this->onRefund($type, $object),
                'customer.subscription.trial_will_end' => $this->onTrialWillEnd($object),
                default => null,
            };

            return ['received' => true];
        });
    }

    private function onCheckoutCompleted(object $session): void
    {
        $user = $this->resolveUserFromCheckout($session);
        if ($user === null) {
            Log::warning('stripe.checkout.no_user', ['session' => $session->id ?? null]);

            return;
        }

        $sub = $this->billing->ensureSubscription($user);
        if (isset($session->customer) && is_string($session->customer)) {
            $sub->stripe_customer_id = $session->customer;
        }
        if (isset($session->subscription)) {
            $stripeSubId = is_string($session->subscription)
                ? $session->subscription
                : ($session->subscription->id ?? null);
            if (is_string($stripeSubId)) {
                $sub->stripe_subscription_id = $stripeSubId;
                $client = $this->clients->make();
                if ($client !== null) {
                    $stripeSub = $client->subscriptions->retrieve($stripeSubId);
                    $this->billing->applyStripeSubscription($sub, $stripeSub, $user);
                } else {
                    $sub->status = 'active';
                    $sub->plan_type = $this->billing->planTypeFor($user);
                }
            }
        }
        $sub->pushHistory('stripe_checkout_completed', ['sessionId' => $session->id ?? null]);
        $sub->save();
    }

    private function onSubscriptionUpsert(object $stripeSub): void
    {
        $sub = $this->findSubscriptionByStripe($stripeSub);
        if ($sub === null) {
            $userId = $stripeSub->metadata->user_id ?? null;
            if ($userId) {
                $user = User::query()->find($userId);
                if ($user !== null) {
                    $sub = $this->billing->ensureSubscription($user);
                }
            }
        }
        if ($sub === null) {
            return;
        }
        $user = $sub->user;
        $this->billing->applyStripeSubscription($sub, $stripeSub, $user);
        $sub->pushHistory('stripe_subscription_synced', ['status' => $sub->status]);
        $sub->save();
    }

    private function onSubscriptionDeleted(object $stripeSub): void
    {
        $sub = $this->findSubscriptionByStripe($stripeSub);
        if ($sub === null) {
            return;
        }
        $sub->status = 'canceled';
        $sub->plan_type = 'free';
        $sub->cancel_at_period_end = false;
        $sub->pushHistory('stripe_subscription_deleted');
        $sub->save();
    }

    private function onInvoicePaid(object $invoice): void
    {
        $sub = $this->findByCustomer((string) ($invoice->customer ?? ''));
        if ($sub === null) {
            return;
        }
        $sub->latest_invoice_id = $invoice->id ?? $sub->latest_invoice_id;
        if ($sub->status === 'past_due' || $sub->status === 'unpaid') {
            $sub->status = 'active';
        }
        $sub->pushHistory('invoice_paid', ['invoiceId' => $invoice->id ?? null]);
        $sub->save();
    }

    private function onInvoiceFailed(object $invoice): void
    {
        $sub = $this->findByCustomer((string) ($invoice->customer ?? ''));
        if ($sub === null) {
            return;
        }
        $sub->status = 'past_due';
        $sub->latest_invoice_id = $invoice->id ?? $sub->latest_invoice_id;
        $sub->pushHistory('invoice_payment_failed', ['invoiceId' => $invoice->id ?? null]);
        $sub->save();
        Log::warning('stripe.invoice.payment_failed', ['invoice' => $invoice->id ?? null]);
    }

    private function onInvoiceActionRequired(object $invoice): void
    {
        $sub = $this->findByCustomer((string) ($invoice->customer ?? ''));
        if ($sub === null) {
            return;
        }
        $sub->pushHistory('invoice_payment_action_required', ['invoiceId' => $invoice->id ?? null]);
        $sub->save();
    }

    private function onRefund(string $type, object $object): void
    {
        $refundIds = [];
        if ($type === 'charge.refunded') {
            $list = $object->refunds->data ?? [];
            foreach ($list as $refund) {
                if (is_object($refund) && isset($refund->id)) {
                    $refundIds[] = [(string) $refund->id, (string) ($refund->status ?? 'succeeded')];
                }
            }
        } else {
            $id = $object->id ?? null;
            if (is_string($id)) {
                $refundIds[] = [$id, (string) ($object->status ?? 'pending')];
            }
        }

        foreach ($refundIds as [$refundId, $status]) {
            $row = BillingRefund::query()->where('stripe_refund_id', $refundId)->first();
            if ($row !== null) {
                $row->status = $status;
                $row->save();
            }
            Log::info('stripe.refund', ['type' => $type, 'id' => $refundId]);
        }
    }

    private function onTrialWillEnd(object $stripeSub): void
    {
        $sub = $this->findSubscriptionByStripe($stripeSub);
        if ($sub === null) {
            return;
        }
        $sub->pushHistory('trial_will_end');
        $sub->save();
    }

    private function resolveUserFromCheckout(object $session): ?User
    {
        // Solo ID affidabili: niente fallback email (collisioni / account sbagliato).
        $ref = $session->client_reference_id ?? null;
        if (! is_string($ref) || $ref === '') {
            $ref = $session->metadata->user_id ?? null;
        }
        if (is_string($ref) && $ref !== '') {
            return User::query()->find($ref);
        }

        Log::warning('stripe.checkout.missing_user_id', ['session' => $session->id ?? null]);

        return null;
    }

    private function findSubscriptionByStripe(object $stripeSub): ?Subscription
    {
        $id = $stripeSub->id ?? null;
        if (is_string($id) && $id !== '') {
            $found = Subscription::query()->where('stripe_subscription_id', $id)->first();
            if ($found !== null) {
                return $found;
            }
        }
        $customer = is_string($stripeSub->customer ?? null)
            ? $stripeSub->customer
            : ($stripeSub->customer->id ?? null);

        return is_string($customer) ? $this->findByCustomer($customer) : null;
    }

    private function findByCustomer(string $customerId): ?Subscription
    {
        if ($customerId === '') {
            return null;
        }

        return Subscription::query()->where('stripe_customer_id', $customerId)->first();
    }
}
