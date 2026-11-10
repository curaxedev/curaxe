<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\AuditLog;
use App\Models\BillingSetting;
use App\Models\Subscription;
use App\Services\Auth\AdminStepUpService;
use App\Services\Stripe\PlanCatalogLockService;
use App\Services\Stripe\StripeDiagnosticService;
use App\Services\Stripe\StripePlanCatalogSyncService;
use App\Services\Stripe\SubscriptionBillingService;
use App\Support\AdminSensitiveAction;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\HttpException;

class AdminBillingController
{
    public function __construct(
        private readonly StripeDiagnosticService $diagnostic,
        private readonly SubscriptionBillingService $billing,
        private readonly AdminStepUpService $stepUp,
        private readonly PlanCatalogLockService $planLocks,
        private readonly StripePlanCatalogSyncService $planSync,
    ) {}

    public function settings(): JsonResponse
    {
        return response()->json(BillingSetting::current()->publicPayload());
    }

    public function updateSettings(Request $request): JsonResponse
    {
        $data = $request->validate([
            'mode' => ['sometimes', 'in:test,live'],
            'publishableKey' => ['nullable', 'string', 'max:255'],
            'secretKey' => ['nullable', 'string', 'max:255'],
            'webhookSecret' => ['nullable', 'string', 'max:255'],
            'priceProfessional' => ['nullable', 'string', 'max:120'],
            'priceAgency' => ['nullable', 'string', 'max:120'],
            'priceStructure' => ['nullable', 'string', 'max:120'],
            'trialDaysProfessional' => ['nullable', 'integer', 'min:0', 'max:90'],
            'trialDaysAgency' => ['nullable', 'integer', 'min:0', 'max:90'],
            'trialDaysStructure' => ['nullable', 'integer', 'min:0', 'max:90'],
            'portalConfigurationId' => ['nullable', 'string', 'max:120'],
            'markSetupComplete' => ['sometimes', 'boolean'],
            'plans' => ['sometimes', 'array', 'min:1'],
            'plans.*.key' => ['required_with:plans', 'string', 'max:80'],
            'plans.*.audience' => ['required_with:plans', 'in:professional,agency,structure'],
            'plans.*.label' => ['required_with:plans', 'string', 'max:80'],
            'plans.*.tagline' => ['nullable', 'string', 'max:200'],
            'plans.*.amountCents' => ['required_with:plans', 'integer', 'min:0', 'max:10000000'],
            'plans.*.currency' => ['nullable', 'in:eur'],
            'plans.*.interval' => ['nullable', 'in:month,year'],
            'plans.*.trialDays' => ['nullable', 'integer', 'min:0', 'max:90'],
            'plans.*.stripePriceId' => ['nullable', 'string', 'max:120'],
            'plans.*.stripeProductId' => ['nullable', 'string', 'max:120'],
            'plans.*.features' => ['nullable', 'array'],
            'plans.*.features.*' => ['string', 'max:160'],
            'plans.*.active' => ['nullable', 'boolean'],
            'plans.*.sortOrder' => ['nullable', 'integer', 'min:0', 'max:100'],
            'plans.*.syncStripe' => ['nullable', 'boolean'],
        ]);

        $touchesKeys = ! empty($data['secretKey'])
            || ! empty($data['webhookSecret'])
            || array_key_exists('publishableKey', $data);
        $touchesPlans = isset($data['plans'])
            || array_key_exists('priceProfessional', $data)
            || array_key_exists('priceAgency', $data)
            || array_key_exists('priceStructure', $data);

        try {
            if ($touchesKeys) {
                $this->stepUp->requireIfEnabled($request, AdminSensitiveAction::BILLING_STRIPE_KEYS);
            } elseif ($touchesPlans) {
                $this->stepUp->requireIfEnabled($request, AdminSensitiveAction::BILLING_PLANS);
            }
        } catch (HttpException $e) {
            $action = $touchesKeys
                ? AdminSensitiveAction::BILLING_STRIPE_KEYS
                : AdminSensitiveAction::BILLING_PLANS;

            return response()->json([
                'message' => $e->getMessage(),
                'error_code' => 'step_up_required',
                'action' => $action,
            ], 403);
        }

        $settings = BillingSetting::current();
        $mode = $data['mode'] ?? $settings->mode ?? 'test';
        $expectLive = $mode === 'live';

        if (! empty($data['publishableKey'])) {
            $pk = trim((string) $data['publishableKey']);
            $okPk = $expectLive
                ? str_starts_with($pk, 'pk_live_')
                : str_starts_with($pk, 'pk_test_');
            if (! $okPk) {
                return ApiResponse::error(
                    $expectLive
                        ? 'In modalità Live serve una Publishable key pk_live_…'
                        : 'In modalità Test serve una Publishable key pk_test_…',
                    422,
                    ['publishableKey' => ['Prefisso non valido per la modalità scelta.']],
                    'validation',
                );
            }
            $data['publishableKey'] = $pk;
        }

        if (! empty($data['secretKey'])) {
            $sk = trim((string) $data['secretKey']);
            $okSk = $expectLive
                ? str_starts_with($sk, 'sk_live_')
                : str_starts_with($sk, 'sk_test_');
            if (! $okSk) {
                return ApiResponse::error(
                    $expectLive
                        ? 'In modalità Live serve una Secret key sk_live_…'
                        : 'In modalità Test serve una Secret key sk_test_…',
                    422,
                    ['secretKey' => ['Prefisso non valido per la modalità scelta.']],
                    'validation',
                );
            }
            // Mai accettare chiavi publishable nel campo secret.
            if (str_starts_with($sk, 'pk_')) {
                return ApiResponse::error(
                    'Hai incollato una Publishable key nel campo Secret. Usa sk_test_ / sk_live_.',
                    422,
                    ['secretKey' => ['Chiave errata.']],
                    'validation',
                );
            }
            $data['secretKey'] = $sk;
        }

        if (! empty($data['webhookSecret'])) {
            $wh = trim((string) $data['webhookSecret']);
            if (! str_starts_with($wh, 'whsec_')) {
                return ApiResponse::error(
                    'Il webhook signing secret deve iniziare con whsec_.',
                    422,
                    ['webhookSecret' => ['Formato non valido.']],
                    'validation',
                );
            }
            $data['webhookSecret'] = $wh;
        }

        foreach (['priceProfessional', 'priceAgency', 'priceStructure'] as $priceField) {
            if (! empty($data[$priceField]) && ! str_starts_with(trim((string) $data[$priceField]), 'price_')) {
                return ApiResponse::error(
                    'I Price ID devono iniziare con price_.',
                    422,
                    [$priceField => ['Formato non valido.']],
                    'validation',
                );
            }
        }

        if (isset($data['mode'])) {
            $settings->mode = $data['mode'];
        }
        if (array_key_exists('publishableKey', $data) && is_string($data['publishableKey']) && $data['publishableKey'] !== '') {
            $settings->publishable_key = $data['publishableKey'];
        }
        if (! empty($data['secretKey'])) {
            $settings->setSecretKey($data['secretKey']);
        }
        if (! empty($data['webhookSecret'])) {
            $settings->setWebhookSecret($data['webhookSecret']);
        }
        foreach ([
            'priceProfessional' => 'price_professional',
            'priceAgency' => 'price_agency',
            'priceStructure' => 'price_structure',
            'trialDaysProfessional' => 'trial_days_professional',
            'trialDaysAgency' => 'trial_days_agency',
            'trialDaysStructure' => 'trial_days_structure',
            'portalConfigurationId' => 'portal_configuration_id',
        ] as $input => $column) {
            if (array_key_exists($input, $data)) {
                $settings->{$column} = $data[$input];
            }
        }

        if (isset($data['plans']) && is_array($data['plans'])) {
            $normalized = [];
            foreach ($data['plans'] as $i => $plan) {
                $priceId = isset($plan['stripePriceId']) ? trim((string) $plan['stripePriceId']) : '';
                if ($priceId !== '' && ! str_starts_with($priceId, 'price_')) {
                    return ApiResponse::error(
                        'Ogni Stripe Price ID deve iniziare con price_.',
                        422,
                        ["plans.{$i}.stripePriceId" => ['Formato non valido.']],
                        'validation',
                    );
                }
                $productId = isset($plan['stripeProductId']) ? trim((string) $plan['stripeProductId']) : '';
                if ($productId !== '' && ! str_starts_with($productId, 'prod_')) {
                    return ApiResponse::error(
                        'Ogni Stripe Product ID deve iniziare con prod_.',
                        422,
                        ["plans.{$i}.stripeProductId" => ['Formato non valido.']],
                        'validation',
                    );
                }
                $previousPriceId = isset($plan['stripePreviousPriceId'])
                    ? trim((string) $plan['stripePreviousPriceId'])
                    : '';
                $normalized[] = [
                    'key' => (string) $plan['key'],
                    'audience' => (string) $plan['audience'],
                    'label' => (string) $plan['label'],
                    'tagline' => (string) ($plan['tagline'] ?? ''),
                    'amountCents' => (int) $plan['amountCents'],
                    'currency' => (string) ($plan['currency'] ?? 'eur'),
                    'interval' => (string) ($plan['interval'] ?? 'month'),
                    'trialDays' => (int) ($plan['trialDays'] ?? 14),
                    'stripePriceId' => $priceId !== '' ? $priceId : null,
                    'stripeProductId' => $productId !== '' ? $productId : null,
                    'stripePreviousPriceId' => $previousPriceId !== '' && str_starts_with($previousPriceId, 'price_')
                        ? $previousPriceId
                        : null,
                    'features' => array_values(array_filter(
                        array_map('strval', $plan['features'] ?? []),
                        static fn ($f) => trim($f) !== '',
                    )),
                    'active' => (bool) ($plan['active'] ?? true),
                    'sortOrder' => (int) ($plan['sortOrder'] ?? $i + 1),
                ];
            }

            $lockError = $this->planLocks->validateCatalogUpdate($settings, $normalized);
            if ($lockError !== null) {
                return ApiResponse::error($lockError, 422, [], 'plan_locked');
            }

            $previousPlans = $settings->resolvedPlansCatalog();

            // Sync Stripe: Prices immutabili → nuovo Price solo se importo/intervallo/valuta cambiano;
            // il Price precedente viene archiviato; Product.default_price aggiornato.
            try {
                $this->planSync->archiveRemovedPlanPrices($settings, $previousPlans, $normalized);
                $normalized = $this->planSync->ensurePrices($settings, $normalized);
            } catch (\RuntimeException $e) {
                return ApiResponse::error($e->getMessage(), 502, [], 'stripe_price_sync_failed');
            }

            $settings->plans_catalog = $normalized;
            $settings->syncLegacyColumnsFromCatalog();

            // Se chiavi + prezzi ok, marca setup completo senza richiedere il click «Fine» del wizard.
            if (
                $settings->setup_completed_at === null
                && $settings->decryptedSecretKey() !== null
                && $settings->decryptedWebhookSecret() !== null
                && $settings->catalogHasRequiredPrices()
            ) {
                $settings->setup_completed_at = now();
            }
        }

        if (! empty($data['markSetupComplete'])) {
            $settings->setup_completed_at = now();
        }

        $settings->save();

        AuditLog::record($request->user()->id, 'billing.settings_updated', BillingSetting::class, (string) $settings->id, [
            'mode' => $settings->mode,
            'keys_updated' => [
                'secret' => ! empty($data['secretKey']),
                'webhook' => ! empty($data['webhookSecret']),
                'publishable' => array_key_exists('publishableKey', $data),
            ],
        ]);

        return response()->json($settings->fresh()->publicPayload());
    }

    public function diagnostic(): JsonResponse
    {
        $settings = BillingSetting::current();
        $result = $this->diagnostic->run($settings);

        AuditLog::record(request()->user()?->id, 'billing.diagnostic', BillingSetting::class, (string) $settings->id, [
            'ok' => $result['ok'],
        ]);

        return response()->json($result);
    }

    public function requiredEvents(): JsonResponse
    {
        return response()->json([
            'events' => StripeDiagnosticService::REQUIRED_EVENTS,
            'webhookUrl' => rtrim((string) config('app.url'), '/').'/api/v1/webhooks/stripe',
        ]);
    }

    public function refund(Request $request, string $id): JsonResponse
    {
        $data = $request->validate([
            'amountCents' => ['nullable', 'integer', 'min:1'],
            'reason' => ['nullable', 'string', 'max:120'],
        ]);

        $sub = Subscription::query()->findOrFail($id);

        try {
            $refund = $this->billing->adminRefund(
                $request->user(),
                $sub,
                $data['amountCents'] ?? null,
                $data['reason'] ?? null,
            );
        } catch (\InvalidArgumentException $e) {
            return ApiResponse::error($e->getMessage(), 422, [], 'refund_failed');
        } catch (\Throwable $e) {
            return ApiResponse::error('Rimborso Stripe non riuscito.', 502, [], 'stripe_error');
        }

        return response()->json([
            'id' => (string) $refund->id,
            'stripeRefundId' => $refund->stripe_refund_id,
            'amountCents' => $refund->amount_cents,
            'status' => $refund->status,
        ], 201);
    }

    public function extendTrial(Request $request, string $id): JsonResponse
    {
        $data = $request->validate([
            'days' => ['required', 'integer', 'min:1', 'max:90'],
        ]);

        $sub = Subscription::query()->findOrFail($id);

        try {
            $updated = $this->billing->adminExtendTrial($request->user(), $sub, (int) $data['days']);
        } catch (\InvalidArgumentException $e) {
            return ApiResponse::error($e->getMessage(), 422, [], 'trial_failed');
        } catch (\Throwable $e) {
            return ApiResponse::error('Estensione prova non riuscita.', 502, [], 'stripe_error');
        }

        return response()->json($this->billing->payload($updated));
    }

    public function adminCancel(Request $request, string $id): JsonResponse
    {
        $sub = Subscription::query()->with('user')->findOrFail($id);
        if ($sub->user === null) {
            return ApiResponse::error('Utente non trovato.', 404, [], 'not_found');
        }

        try {
            $updated = $this->billing->cancelAtPeriodEnd($sub->user);
        } catch (\Throwable $e) {
            return ApiResponse::error('Cancellazione non riuscita.', 502, [], 'stripe_error');
        }

        AuditLog::record($request->user()->id, 'billing.admin_cancel', Subscription::class, (string) $sub->id);

        return response()->json($this->billing->payload($updated));
    }

    /**
     * CRM-driven: genera URL Stripe Checkout (hosted) per l’utente del subscription row.
     * Nessuna carta su Curaxe — solo redirect al Checkout Stripe.
     */
    public function createCheckoutLink(Request $request, string $id): JsonResponse
    {
        $data = $request->validate([
            'successUrl' => ['nullable', 'string', 'max:500'],
            'cancelUrl' => ['nullable', 'string', 'max:500'],
        ]);

        $sub = Subscription::query()->with('user')->findOrFail($id);
        if ($sub->user === null) {
            return ApiResponse::error('Utente non trovato.', 404, [], 'not_found');
        }

        try {
            $result = $this->billing->createCheckout(
                $sub->user,
                null,
                $data['successUrl'] ?? null,
                $data['cancelUrl'] ?? null,
            );
        } catch (\InvalidArgumentException $e) {
            return ApiResponse::error($e->getMessage(), 422, [], 'billing_config');
        } catch (\RuntimeException $e) {
            return ApiResponse::error($e->getMessage(), 503, [], 'stripe_error');
        } catch (\Throwable $e) {
            return ApiResponse::error('Checkout non creato.', 502, [], 'stripe_error');
        }

        AuditLog::record($request->user()->id, 'billing.admin_checkout_link', Subscription::class, (string) $sub->id, [
            'sessionId' => $result['sessionId'] ?? null,
        ]);

        return response()->json($result, 201);
    }

    /**
     * CRM-driven: URL Customer Portal Stripe (gestione carta/disdetta/fatture).
     */
    public function createPortalLink(Request $request, string $id): JsonResponse
    {
        $data = $request->validate([
            'returnUrl' => ['nullable', 'string', 'max:500'],
        ]);

        $sub = Subscription::query()->with('user')->findOrFail($id);
        if ($sub->user === null) {
            return ApiResponse::error('Utente non trovato.', 404, [], 'not_found');
        }

        try {
            $result = $this->billing->createPortalSession(
                $sub->user,
                $data['returnUrl'] ?? null,
            );
        } catch (\InvalidArgumentException $e) {
            return ApiResponse::error($e->getMessage(), 422, [], 'portal_unavailable');
        } catch (\RuntimeException $e) {
            return ApiResponse::error($e->getMessage(), 503, [], 'stripe_error');
        } catch (\Throwable $e) {
            return ApiResponse::error('Portal non creato.', 502, [], 'stripe_error');
        }

        AuditLog::record($request->user()->id, 'billing.admin_portal_link', Subscription::class, (string) $sub->id);

        return response()->json($result);
    }

    /** Sposta abbonamento fallito/scaduto nel cestino (soft). */
    public function trashSubscription(Request $request, string $id): JsonResponse
    {
        $sub = Subscription::query()->findOrFail($id);
        if (! $sub->canMoveToTrash()) {
            return ApiResponse::error(
                'Puoi cestinare solo abbonamenti falliti, scaduti o già in cancellazione — non quelli attivi.',
                422,
                [],
                'trash_not_allowed',
            );
        }

        $sub->trashed_at = now();
        $sub->pushHistory('admin_trashed', ['by' => $request->user()->id]);
        $sub->save();

        AuditLog::record($request->user()->id, 'billing.subscription_trashed', Subscription::class, (string) $sub->id);

        return response()->json(['ok' => true, 'id' => (string) $sub->id, 'trashedAt' => $sub->trashed_at?->toIso8601String()]);
    }

    public function restoreSubscription(Request $request, string $id): JsonResponse
    {
        $sub = Subscription::query()->findOrFail($id);
        if (! $sub->isTrashed()) {
            return ApiResponse::error('Abbonamento non è nel cestino.', 422, [], 'not_trashed');
        }

        $sub->trashed_at = null;
        $sub->pushHistory('admin_restored', ['by' => $request->user()->id]);
        $sub->save();

        AuditLog::record($request->user()->id, 'billing.subscription_restored', Subscription::class, (string) $sub->id);

        return response()->json(['ok' => true, 'id' => (string) $sub->id]);
    }

    /** Eliminazione definitiva dal DB (solo se già nel cestino). */
    public function forceDeleteSubscription(Request $request, string $id): JsonResponse
    {
        $sub = Subscription::query()->findOrFail($id);
        if (! $sub->isTrashed()) {
            return ApiResponse::error('Sposta prima l’abbonamento nel cestino.', 422, [], 'not_trashed');
        }

        $sid = (string) $sub->id;
        AuditLog::record($request->user()->id, 'billing.subscription_force_deleted', Subscription::class, $sid, [
            'userId' => (string) $sub->user_id,
            'status' => $sub->status,
        ]);
        $sub->delete();

        return response()->json(['ok' => true, 'id' => $sid]);
    }
}
