<?php

namespace App\Http\Controllers\Api\V1;

use App\Domains\Auth\Enums\UserRole;
use App\Models\BillingSetting;
use App\Models\Subscription;
use App\Services\Platform\FeatureGate;
use App\Services\Stripe\SubscriptionBillingService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BillingController
{
    public function __construct(
        private readonly SubscriptionBillingService $billing,
        private readonly FeatureGate $gate,
    ) {}

    public function subscription(Request $request): JsonResponse
    {
        $sub = $this->billing->ensureSubscription($request->user());

        return response()->json($this->billing->payload($sub));
    }

    public function createCheckout(Request $request): JsonResponse
    {
        if ($blocked = $this->gate->assertMaintenanceWrites()) {
            return $blocked;
        }
        if ($blocked = $this->gate->assertFeature(
            'stripeCheckout',
            'Il checkout abbonamenti è temporaneamente disabilitato.',
        )) {
            return $blocked;
        }

        $data = $request->validate([
            'audience' => ['nullable', 'in:professional,agency,structure'],
            'successUrl' => ['nullable', 'string', 'max:500'],
            'cancelUrl' => ['nullable', 'string', 'max:500'],
        ]);

        try {
            $result = $this->billing->createCheckout(
                $request->user(),
                $data['audience'] ?? null,
                $data['successUrl'] ?? null,
                $data['cancelUrl'] ?? null,
            );
        } catch (\InvalidArgumentException $e) {
            return ApiResponse::error($e->getMessage(), 422, [], 'billing_config');
        } catch (\RuntimeException $e) {
            return ApiResponse::error($e->getMessage(), 503, [], 'not_configured');
        } catch (\Throwable $e) {
            return ApiResponse::error('Creazione Checkout non riuscita.', 502, [], 'stripe_error');
        }

        return response()->json($result, 201);
    }

    public function completeCheckout(Request $request, string $sessionId): JsonResponse
    {
        if (! app()->environment(['local', 'testing'])) {
            if ($blocked = $this->gate->assertFeature(
                'stripeCheckout',
                'Il checkout abbonamenti è temporaneamente disabilitato.',
            )) {
                return $blocked;
            }
        }

        try {
            $sub = $this->billing->completeCheckout($request->user(), $sessionId);
        } catch (\InvalidArgumentException $e) {
            return ApiResponse::error($e->getMessage(), 422, [], 'invalid_session');
        } catch (\RuntimeException $e) {
            return ApiResponse::error($e->getMessage(), 503, [], 'not_configured');
        }

        return response()->json($this->billing->payload($sub));
    }

    public function cancel(Request $request): JsonResponse
    {
        try {
            $sub = $this->billing->cancelAtPeriodEnd($request->user());
        } catch (\Throwable $e) {
            return ApiResponse::error('Cancellazione non riuscita.', 502, [], 'stripe_error');
        }

        return response()->json($this->billing->payload($sub));
    }

    public function portal(Request $request): JsonResponse
    {
        $data = $request->validate([
            'returnUrl' => ['nullable', 'string', 'max:500'],
        ]);

        try {
            $result = $this->billing->createPortalSession(
                $request->user(),
                $data['returnUrl'] ?? null,
            );
        } catch (\InvalidArgumentException $e) {
            return ApiResponse::error($e->getMessage(), 422, [], 'portal_unavailable');
        } catch (\RuntimeException $e) {
            return ApiResponse::error($e->getMessage(), 503, [], 'not_configured');
        } catch (\Throwable $e) {
            return ApiResponse::error('Customer Portal non disponibile.', 502, [], 'stripe_error');
        }

        return response()->json($result);
    }

    public function invoices(Request $request): JsonResponse
    {
        try {
            $invoices = $this->billing->listInvoices($request->user());
        } catch (\RuntimeException $e) {
            return ApiResponse::error($e->getMessage(), 503, [], 'not_configured');
        } catch (\Throwable $e) {
            return ApiResponse::error('Impossibile caricare le fatture.', 502, [], 'stripe_error');
        }

        return response()->json(['invoices' => $invoices]);
    }

    public function adminSubscriptions(Request $request): JsonResponse
    {
        if ($request->user()->role !== UserRole::PlatformAdmin) {
            return ApiResponse::error('Non autorizzato.', 403, [], 'forbidden');
        }

        $trash = filter_var($request->query('trash', false), FILTER_VALIDATE_BOOLEAN);
        $query = Subscription::query()->with('user')->orderByDesc('updated_at');
        if ($trash) {
            $query->onlyTrashed();
        } else {
            $query->notTrashed();
        }

        $rows = $query->get()
            ->map(fn (Subscription $s) => [
                'id' => (string) $s->id,
                'userId' => (string) $s->user_id,
                'userName' => $s->user?->name ?? '',
                'userEmail' => $s->user?->email ?? '',
                'audience' => $s->audience,
                'planType' => $s->plan_type,
                'status' => $s->status,
                'trialEndsAt' => $s->trial_ends_at?->toIso8601String(),
                'currentPeriodEnd' => $s->current_period_end?->toIso8601String(),
                'cancelAtPeriodEnd' => $s->cancel_at_period_end,
                'stripeSubscriptionId' => $s->stripe_subscription_id,
                'trashedAt' => $s->trashed_at?->toIso8601String(),
                'canTrash' => $s->canMoveToTrash(),
            ]);

        return response()->json($rows);
    }

    public function adminStats(Request $request): JsonResponse
    {
        if ($request->user()->role !== UserRole::PlatformAdmin) {
            return ApiResponse::error('Non autorizzato.', 403, [], 'forbidden');
        }

        $settings = BillingSetting::current();
        $mrrCents = 0;
        Subscription::query()
            ->notTrashed()
            ->whereIn('status', ['active', 'trialing'])
            ->get(['audience'])
            ->each(function (Subscription $s) use ($settings, &$mrrCents) {
                $mrrCents += $settings->amountCentsForAudience((string) $s->audience);
            });

        $active = Subscription::query()->notTrashed()->whereIn('status', ['active', 'trialing'])->count();
        $canceling = Subscription::query()->notTrashed()->where('cancel_at_period_end', true)->count();
        $pastDue = Subscription::query()->notTrashed()->where('status', 'past_due')->count();
        $trialing = Subscription::query()->notTrashed()->where('status', 'trialing')->count();
        $trashed = Subscription::query()->onlyTrashed()->count();

        return response()->json([
            'activeSubscriptions' => $active,
            'cancelingAtPeriodEnd' => $canceling,
            'pastDue' => $pastDue,
            'trialing' => $trialing,
            'trashed' => $trashed,
            'mrrEstimate' => (int) round($mrrCents / 100),
            'mrrCents' => $mrrCents,
        ]);
    }

    /** Catalogo piani pubblico (allineato a ciò che vede il cliente). */
    public function plans(): JsonResponse
    {
        return response()->json([
            'plans' => BillingSetting::current()->publicPlansPayload(),
        ]);
    }
}
