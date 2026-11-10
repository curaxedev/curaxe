<?php

namespace App\Http\Controllers\Api\V1;

use App\Domains\Auth\Enums\UserRole;
use App\Models\AuditLog;
use App\Models\JobPosting;
use App\Models\PlatformSetting;
use App\Services\Platform\PlatformSettingsReader;
use App\Models\ProfessionalDocument;
use App\Models\ProfessionalProfile;
use App\Models\Subscription;
use App\Models\User;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AdminOpsController
{
    public function overview(): JsonResponse
    {
        $usersByRole = User::query()
            ->selectRaw('role, count(*) as c')
            ->groupBy('role')
            ->pluck('c', 'role');

        $professionals = (int) ($usersByRole[UserRole::Professional->value] ?? 0);
        $families = (int) ($usersByRole[UserRole::PublicUser->value] ?? 0);
        $agencies = (int) ($usersByRole[UserRole::Agency->value] ?? 0);
        $structures = (int) ($usersByRole[UserRole::Structure->value] ?? 0);
        $totalUsers = User::query()->count();

        $activeSubs = Subscription::query()->whereIn('status', ['active', 'trialing'])->count();
        $pendingJobs = JobPosting::query()->whereIn('status', ['pending_review', 'pending'])->count();
        $pendingKyc = ProfessionalProfile::query()
            ->where('is_verified', false)
            ->whereHas('user.professionalDocuments')
            ->count();

        $billing = \App\Models\BillingSetting::current();
        $mrrEstimate = (int) round(
            Subscription::query()
                ->whereIn('status', ['active', 'trialing'])
                ->get(['audience'])
                ->sum(fn ($s) => $billing->amountCentsForAudience((string) $s->audience)) / 100
        );

        $months = [];
        for ($i = 9; $i >= 0; $i--) {
            $start = now()->startOfMonth()->subMonths($i);
            $end = (clone $start)->endOfMonth();
            $count = Subscription::query()
                ->whereIn('status', ['active', 'trialing'])
                ->where('created_at', '<=', $end)
                ->where(function ($q) use ($start) {
                    $q->whereNull('current_period_end')
                        ->orWhere('current_period_end', '>=', $start);
                })
                ->count();
            $months[] = [
                'month' => $start->translatedFormat('M'),
                'amountEur' => $count * 29,
            ];
        }

        return response()->json([
            'generatedAt' => now()->toIso8601String(),
            'kpis' => [
                'totalUsers' => $totalUsers,
                'professionals' => $professionals,
                'families' => $families,
                'agenciesStructures' => $agencies + $structures,
                'premiumSubscriptions' => $activeSubs,
                'mrrEstimateEur' => $mrrEstimate,
                'pendingJobs' => $pendingJobs,
                'pendingKyc' => $pendingKyc,
            ],
            'revenueMonthly' => $months,
        ]);
    }


    public function kycPending(): JsonResponse
    {
        $profiles = ProfessionalProfile::query()
            ->with(['user.professionalDocuments'])
            ->where('is_verified', false)
            ->whereHas('user.professionalDocuments')
            ->orderByDesc('updated_at')
            ->limit(100)
            ->get();

        $items = $profiles->map(function (ProfessionalProfile $p) {
            $user = $p->user;
            $docs = ($user?->professionalDocuments ?? collect())
                ->filter(fn (ProfessionalDocument $d) => ($d->review_status ?? 'pending') !== 'rejected')
                ->values()
                ->map(fn (ProfessionalDocument $d) => $this->mapKycDocument($d));

            if ($docs->isEmpty()) {
                return null;
            }

            $name = trim(($p->first_name.' '.$p->last_name)) ?: ($user?->name ?? 'Professionista');
            $parts = preg_split('/\s+/', $name) ?: [];
            $initials = strtoupper(
                mb_substr($parts[0] ?? 'P', 0, 1).mb_substr($parts[1] ?? '', 0, 1)
            );

            return [
                'id' => (string) $p->user_id,
                'professionalId' => (string) $p->user_id,
                'name' => $name,
                'initials' => $initials !== '' ? $initials : 'PR',
                'email' => $user?->email ?? '',
                'category' => $p->category !== '' ? $p->category : 'Professionista',
                'documents' => $docs->all(),
                'submittedAt' => $docs->max('uploadedAt')
                    ?? $p->updated_at?->toIso8601String()
                    ?? now()->toIso8601String(),
            ];
        })->filter()->values();

        return response()->json($items);
    }

    public function kycApprove(Request $request, int $id): JsonResponse
    {
        $profile = ProfessionalProfile::query()->where('user_id', $id)->first();
        if ($profile === null) {
            return ApiResponse::error('Profilo non trovato.', 404, [], 'not_found');
        }

        $profile->is_verified = true;
        $profile->save();

        ProfessionalDocument::query()
            ->where('user_id', $id)
            ->where('review_status', 'pending')
            ->update(['review_status' => 'approved', 'reject_reason' => null]);

        AuditLog::record($request->user()->id, 'kyc.approve', 'user', (string) $id);

        return response()->json(['id' => (string) $id, 'decision' => 'approved']);
    }

    public function kycReject(Request $request, int $id): JsonResponse
    {
        $data = $request->validate([
            'reason' => ['required', 'string', 'min:10', 'max:1000'],
        ]);

        $profile = ProfessionalProfile::query()->where('user_id', $id)->first();
        if ($profile === null) {
            return ApiResponse::error('Profilo non trovato.', 404, [], 'not_found');
        }

        $profile->is_verified = false;
        $profile->save();

        ProfessionalDocument::query()
            ->where('user_id', $id)
            ->update([
                'review_status' => 'rejected',
                'reject_reason' => $data['reason'],
            ]);

        AuditLog::record($request->user()->id, 'kyc.reject', 'user', (string) $id, [
            'reason' => $data['reason'],
        ]);

        return response()->json(['id' => (string) $id, 'decision' => 'rejected']);
    }

    public function kycDocumentFile(Request $request, int $id): StreamedResponse|JsonResponse
    {
        $doc = ProfessionalDocument::query()->find($id);
        if ($doc === null || ! Storage::exists($doc->path)) {
            return ApiResponse::error('Documento non trovato.', 404, [], 'not_found');
        }

        return Storage::response($doc->path, $doc->original_name, [
            'Content-Type' => $doc->mime ?: 'application/octet-stream',
        ]);
    }

    public function settings(): JsonResponse
    {
        return response()->json($this->settingsPayload());
    }

    public function updateSettings(Request $request): JsonResponse
    {
        $data = $request->validate([
            'pricing' => ['sometimes', 'array'],
            'pricing.premiumMonthlyEur' => ['sometimes', 'numeric', 'min:0', 'max:9999'],
            'pricing.premiumYearlyEur' => ['sometimes', 'numeric', 'min:0', 'max:99999'],
            'emailNotifications' => ['sometimes', 'array'],
            'emailTemplates' => ['sometimes', 'array'],
            'maintenance' => ['sometimes', 'array'],
            'featureFlags' => ['sometimes', 'array'],
            'freeLimits' => ['sometimes', 'array'],
        ]);

        // Commissioni marketplace: bloccate (pianificate / non operative) — non modificabili via API.
        unset($data['commissionRates']);

        $row = PlatformSetting::query()->firstOrCreate(
            ['key' => 'platform'],
            ['value' => []],
        );

        $current = is_array($row->value) ? $row->value : [];
        foreach ($data as $key => $value) {
            if (is_array($value) && isset($current[$key]) && is_array($current[$key])) {
                $current[$key] = array_replace($current[$key], $value);
            } else {
                $current[$key] = $value;
            }
        }
        if (! isset($current['commissionRates']) || ! is_array($current['commissionRates'])) {
            $current['commissionRates'] = PlatformSettingsReader::defaults()['commissionRates'];
        }
        $current['commissionRates']['plannedOnly'] = true;
        $current['commissionRates']['active'] = false;

        $row->value = $current;
        $row->save();
        PlatformSettingsReader::bump();

        AuditLog::record($request->user()->id, 'settings.update', 'platform_settings', 'platform');

        return response()->json($this->settingsPayload());
    }

    /**
     * @return array<string, mixed>
     */
    private function settingsPayload(): array
    {
        $reader = app(PlatformSettingsReader::class);
        $value = $reader->all();
        $row = PlatformSetting::query()->where('key', 'platform')->first();

        return array_merge($value, [
            'updatedAt' => $row?->updated_at?->toIso8601String() ?? now()->toIso8601String(),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function mapKycDocument(ProfessionalDocument $d): array
    {
        $type = match ($d->slot) {
            'identita' => 'id_card',
            'attestati' => 'diploma',
            'referenze' => 'other',
            default => 'other',
        };
        $mimeType = str_contains((string) $d->mime, 'pdf') ? 'pdf' : 'image';

        return [
            'id' => (string) $d->id,
            'type' => $type,
            'label' => $d->original_name,
            'url' => '/api/v1/admin/kyc/documents/'.$d->id.'/file',
            'mimeType' => $mimeType,
            'status' => $d->review_status ?? 'pending',
            'uploadedAt' => $d->created_at?->toIso8601String(),
        ];
    }
}
