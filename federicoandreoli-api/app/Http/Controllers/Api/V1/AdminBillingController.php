<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\AuditLog;
use App\Models\BillingSetting;
use App\Models\Subscription;
use App\Services\Stripe\StripeDiagnosticService;
use App\Services\Stripe\SubscriptionBillingService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminBillingController
{
    public function __construct(
        private readonly StripeDiagnosticService $diagnostic,
        private readonly SubscriptionBillingService $billing,
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
        ]);

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
}
