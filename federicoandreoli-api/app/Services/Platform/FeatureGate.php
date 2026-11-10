<?php

namespace App\Services\Platform;

use App\Models\Application;
use App\Models\FamilyRequest;
use App\Models\Subscription;
use App\Models\User;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Schema;

/**
 * Enforcement lato API per feature flags e limiti piano FREE.
 */
final class FeatureGate
{
    /** Stati candidatura ancora “attivi” ai fini del limite FREE. */
    public const ACTIVE_APPLICATION_STATUSES = [
        'submitted',
        'viewed',
        'shortlisted',
        'interview',
        'offer',
    ];

    public function __construct(
        private readonly PlatformSettingsReader $settings,
    ) {}

    public function assertFeature(string $flag, string $message): ?JsonResponse
    {
        if ($this->settings->feature($flag, true)) {
            return null;
        }

        return ApiResponse::error($message, 503, [], 'feature_disabled');
    }

    public function assertMaintenanceWrites(): ?JsonResponse
    {
        $m = $this->settings->maintenance();
        if (! $m['enabled']) {
            return null;
        }

        return ApiResponse::error(
            $m['message'] !== '' ? $m['message'] : 'Piattaforma in manutenzione.',
            503,
            [],
            'maintenance_mode',
        );
    }

    /**
     * Limite mensile richieste assistenza (famiglie). Bozze escluse.
     */
    public function assertFamilyRequestMonthLimit(User $user, ?int $excludeRequestId = null): ?JsonResponse
    {
        $limit = $this->settings->freeLimit('maxRequestsPerMonth', 3);
        if ($limit <= 0) {
            return ApiResponse::error(
                'Le nuove richieste sono temporaneamente disabilitate.',
                422,
                [],
                'plan_limit',
            );
        }

        $count = FamilyRequest::query()
            ->where('user_id', $user->id)
            ->where('status', '!=', 'draft')
            ->where('created_at', '>=', now()->startOfMonth())
            ->when($excludeRequestId !== null, fn ($q) => $q->where('id', '!=', $excludeRequestId))
            ->count();

        if ($count >= $limit) {
            return ApiResponse::error(
                "Hai raggiunto il limite di {$limit} richieste questo mese sul piano gratuito. Metti in pausa o attendi il mese successivo, oppure contatta il supporto.",
                422,
                [],
                'plan_limit',
            );
        }

        return null;
    }

    /**
     * Limite candidature attive per professionisti senza abbonamento premium.
     */
    public function assertFreeApplicationLimit(User $user): ?JsonResponse
    {
        if ($this->userHasActivePremium($user)) {
            return null;
        }

        $limit = $this->settings->freeLimit('maxActiveApplications', 5);
        if ($limit <= 0) {
            return ApiResponse::error(
                'Le candidature sono temporaneamente disabilitate sul piano gratuito.',
                422,
                [],
                'plan_limit',
            );
        }

        $count = Application::query()
            ->where('applicant_id', $user->id)
            ->whereIn('status', self::ACTIVE_APPLICATION_STATUSES)
            ->count();

        if ($count >= $limit) {
            return ApiResponse::error(
                "Hai raggiunto il limite di {$limit} candidature attive sul piano gratuito. Ritira una candidatura o passa a Premium.",
                422,
                [],
                'plan_limit',
            );
        }

        return null;
    }

    public function userHasActivePremium(User $user): bool
    {
        if (! Schema::hasTable('subscriptions')) {
            return false;
        }

        $sub = Subscription::query()->where('user_id', $user->id)->first();
        if ($sub === null) {
            return false;
        }
        if (! in_array($sub->status, ['active', 'trialing'], true)) {
            return false;
        }

        $plan = (string) ($sub->plan_type ?? 'free');

        return $plan !== '' && $plan !== 'free';
    }
}
