<?php

namespace App\Http\Controllers\Api\V1;

use App\Domains\Auth\Enums\UserRole;
use App\Mail\Gdpr\ConsentReminderMail;
use App\Mail\Registration\AccountDeletedMail;
use App\Models\AuditLog;
use App\Models\ConsentRecord;
use App\Models\JobPosting;
use App\Models\LoginOtp;
use App\Models\MessageThread;
use App\Models\Organization;
use App\Models\ProfessionalProfile;
use App\Models\ProfessionalProfileView;
use App\Models\Subscription;
use App\Models\User;
use App\Support\ApiResponse;
use App\Support\DirectoryCache;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;

class AdminController
{
    public function users(Request $request): JsonResponse
    {
        $q = $request->string('q')->toString();
        $query = User::query()->orderByDesc('id');
        if ($q !== '') {
            $query->where(function ($builder) use ($q) {
                $builder->where('name', 'like', "%{$q}%")
                    ->orWhere('email', 'like', "%{$q}%");
            });
        }

        $users = $query
            ->with([
                'professionalProfile',
                'professionalDocuments',
                'organization',
                'subscriptions' => fn ($builder) => $builder->notTrashed()->orderByDesc('id'),
            ])
            ->limit(100)
            ->get();

        $latestConsents = $this->latestConsentsByUserIds($users->pluck('id')->all());

        $payload = $users->map(fn (User $u) => $this->serializeAdminUser(
            $u,
            $latestConsents[(int) $u->id] ?? null,
        ));

        return response()->json($payload);
    }

    public function showUser(int $id): JsonResponse
    {
        $u = User::query()->find($id);
        if ($u === null) {
            return ApiResponse::error('Utente non trovato.', 404, [], 'not_found');
        }

        $u->loadMissing([
            'professionalProfile',
            'professionalDocuments',
            'organization',
            'subscriptions' => fn ($builder) => $builder->notTrashed()->orderByDesc('id'),
        ]);

        $consent = ConsentRecord::latestForUser((int) $u->id);
        $payload = $this->serializeAdminUser($u, $consent);
        $payload['suspendedAt'] = $u->suspended_at?->toIso8601String();
        $payload['kycDocuments'] = $u->professionalDocuments->map(fn ($d) => [
            'id' => (string) $d->id,
            'type' => $d->slot,
            'label' => $d->original_name,
            'status' => $d->review_status ?? 'pending',
        ])->values()->all();
        $payload['activity'] = AuditLog::query()
            ->where('subject_type', 'user')
            ->where('subject_id', (string) $u->id)
            ->orderByDesc('id')
            ->limit(20)
            ->get()
            ->map(fn (AuditLog $log) => [
                'id' => (string) $log->id,
                'action' => $log->action,
                'at' => $log->created_at?->toIso8601String(),
            ])
            ->values()
            ->all();
        $payload['consentHistory'] = ConsentRecord::query()
            ->where('user_id', $u->id)
            ->orderByDesc('id')
            ->limit(10)
            ->get()
            ->map(fn (ConsentRecord $record) => $this->consentSnapshot($record))
            ->values()
            ->all();
        $payload['visibility'] = $this->buildVisibilityDetail($u);

        return response()->json($payload);
    }

    public function setUserVisibility(Request $request, int $id): JsonResponse
    {
        $data = $request->validate([
            'published' => ['required', 'boolean'],
        ]);
        $published = (bool) $data['published'];

        $u = User::query()->with(['professionalProfile', 'organization'])->find($id);
        if ($u === null) {
            return ApiResponse::error('Utente non trovato.', 404, [], 'not_found');
        }

        if ($u->suspended_at !== null && $published) {
            return ApiResponse::error(
                'Account sospeso: riattivalo prima di renderlo visibile in directory.',
                422,
                [],
                'validation',
            );
        }

        $profile = $u->professionalProfile;
        $org = $u->organization;

        if ($profile === null && $org === null) {
            return ApiResponse::error(
                'Questo account non ha un profilo pubblicabile in directory (es. famiglia o admin).',
                422,
                [],
                'validation',
            );
        }

        if ($profile !== null) {
            $profile->forceFill(['is_published' => $published])->save();
        }
        if ($org !== null) {
            $org->forceFill(['is_published' => $published])->save();
        }

        DirectoryCache::bump();
        AuditLog::record(
            $request->user()->id,
            $published ? 'user.visibility.publish' : 'user.visibility.hide',
            'user',
            (string) $u->id,
        );

        return $this->showUser($id);
    }

    /**
     * CSV iscritti newsletter (ultimo consenso con comunicazioni = true).
     */
    public function exportNewsletterSubscribers(): Response
    {
        $latestIds = ConsentRecord::query()
            ->selectRaw('MAX(id) as id')
            ->groupBy('user_id')
            ->pluck('id');

        $rows = ConsentRecord::query()
            ->with('user:id,name,email,role,created_at')
            ->whereIn('id', $latestIds)
            ->where('comunicazioni', true)
            ->orderBy('id')
            ->get();

        $lines = [
            ['user_id', 'name', 'email', 'role', 'privacy_accepted_at', 'newsletter', 'consent_version', 'registered_at'],
        ];
        foreach ($rows as $record) {
            $user = $record->user;
            if ($user === null) {
                continue;
            }
            $lines[] = [
                (string) $user->id,
                $user->name,
                $user->email,
                $user->role->value,
                $record->created_at?->toIso8601String() ?? '',
                $record->comunicazioni ? 'yes' : 'no',
                (string) $record->version,
                $user->created_at?->toIso8601String() ?? '',
            ];
        }

        $csv = collect($lines)
            ->map(fn (array $cols) => collect($cols)->map(function ($cell) {
                $value = str_replace('"', '""', (string) $cell);

                return '"'.$value.'"';
            })->implode(','))
            ->implode("\n");

        return response($csv."\n", 200, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="newsletter-subscribers.csv"',
        ]);
    }

    public function resendConsents(Request $request, int $id): JsonResponse
    {
        $u = User::query()->find($id);
        if ($u === null) {
            return ApiResponse::error('Utente non trovato.', 404, [], 'not_found');
        }

        $consent = ConsentRecord::latestForUser((int) $u->id);
        $frontend = rtrim((string) config('app.frontend_url'), '/');
        $manageUrl = $frontend.'/dashboard?section=account';

        Mail::to($u->email)->send(new ConsentReminderMail(
            $u->name,
            $manageUrl,
            $consent?->created_at?->timezone(config('app.timezone'))->format('d/m/Y H:i') ?? '',
            (bool) ($consent?->comunicazioni ?? false),
        ));

        AuditLog::record($request->user()->id, 'user.resend_consents', 'user', (string) $u->id);

        return response()->json([
            'ok' => true,
            'sentTo' => $u->email,
            'privacyAcceptedAt' => $consent?->created_at?->toIso8601String(),
            'newsletterConsent' => (bool) ($consent?->comunicazioni ?? false),
        ]);
    }

    /**
     * @param  list<int|string>  $userIds
     * @return array<int, ConsentRecord>
     */
    private function latestConsentsByUserIds(array $userIds): array
    {
        if ($userIds === []) {
            return [];
        }

        $latestIds = ConsentRecord::query()
            ->selectRaw('MAX(id) as id')
            ->whereIn('user_id', $userIds)
            ->groupBy('user_id')
            ->pluck('id');

        $map = [];
        foreach (ConsentRecord::query()->whereIn('id', $latestIds)->get() as $record) {
            $map[(int) $record->user_id] = $record;
        }

        return $map;
    }

    /**
     * @return array<string, mixed>
     */
    private function consentSnapshot(?ConsentRecord $record): array
    {
        if ($record === null) {
            return [
                'privacy' => false,
                'termini' => false,
                'maggiorenne' => false,
                'comunicazioni' => false,
                'profilazione' => false,
                'version' => null,
                'recordedAt' => null,
                'source' => null,
            ];
        }

        return [
            'privacy' => (bool) $record->privacy,
            'termini' => (bool) $record->termini,
            'maggiorenne' => (bool) $record->maggiorenne,
            'comunicazioni' => (bool) $record->comunicazioni,
            'profilazione' => (bool) $record->profilazione,
            'version' => $record->version,
            'recordedAt' => $record->created_at?->toIso8601String(),
            'source' => $record->source,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function serializeAdminUser(User $u, ?ConsentRecord $consent = null): array
    {
        $status = 'active';
        if ($u->suspended_at) {
            $status = 'suspended';
        } elseif (
            $u->professionalProfile !== null
            && ! $u->professionalProfile->is_verified
            && $u->professionalDocuments->isNotEmpty()
        ) {
            $status = 'verify';
        }

        /** @var Subscription|null $sub */
        $sub = $u->relationLoaded('subscriptions')
            ? $u->subscriptions->first()
            : $u->subscriptions()->notTrashed()->orderByDesc('id')->first();

        $subscriptionActive = $sub !== null && in_array($sub->status, ['active', 'trialing'], true);
        $visibility = $this->buildVisibilitySummary($u);
        $professionalId = $u->professionalProfile?->id;
        $consent ??= ConsentRecord::latestForUser((int) $u->id);
        $snap = $this->consentSnapshot($consent);

        return [
            'id' => (string) $u->id,
            'name' => $u->name,
            'email' => $u->email,
            'role' => $u->role->value,
            'status' => $status,
            'createdAt' => $u->created_at?->toIso8601String(),
            'emailVerifiedAt' => $u->email_verified_at?->toIso8601String(),
            'professionalId' => $professionalId !== null ? (string) $professionalId : null,
            'organizationId' => $u->organization?->id !== null ? (string) $u->organization->id : null,
            'profileVisible' => $visibility['profileVisible'],
            'visibilityReason' => $visibility['reason'],
            'visibilityReasonLabel' => $visibility['reasonLabel'],
            'visibilityBlockers' => $visibility['blockers'],
            'canToggleVisibility' => $visibility['canToggle'],
            'subscriptionActive' => $subscriptionActive,
            'subscriptionStatus' => $sub?->status,
            'subscriptionPlan' => $sub?->plan_type,
            'trialEndsAt' => $sub?->trial_ends_at?->toIso8601String(),
            'subscriptionPeriodEnd' => $sub?->current_period_end?->toIso8601String(),
            'cancelAtPeriodEnd' => $sub?->cancel_at_period_end ?? false,
            'privacyAccepted' => (bool) $snap['privacy'],
            'privacyAcceptedAt' => $snap['recordedAt'],
            'newsletterConsent' => (bool) $snap['comunicazioni'],
            'consentVersion' => $snap['version'],
            'consents' => $snap,
        ];
    }

    /**
     * @return array{
     *   profileVisible: ?bool,
     *   reason: string,
     *   reasonLabel: string,
     *   blockers: list<string>,
     *   canToggle: bool,
     *   kind: 'professional'|'organization'|'none',
     *   publicProfileId: ?string
     * }
     */
    private function buildVisibilitySummary(User $u): array
    {
        $profile = $u->professionalProfile;
        $org = $u->organization;
        $blockers = [];

        if ($u->suspended_at !== null) {
            $blockers[] = 'Account sospeso: la directory resta nascosta finché non riattivi l\'account.';
        }

        if ($profile !== null) {
            $blockers = array_merge($blockers, $this->professionalCompletenessBlockers($profile));
            $visible = (bool) $profile->is_published;
            $reason = $visible ? 'published' : ($blockers !== [] ? 'incomplete_or_hidden' : 'hidden_manual');
            $reasonLabel = $visible
                ? 'Profilo professionista pubblicato in directory.'
                : ($blockers !== []
                    ? 'Non visibile: profilo incompleto o nascosto. Vedi i motivi sotto.'
                    : 'Profilo professionista nascosto manualmente (is_published = false).');

            return [
                'profileVisible' => $visible,
                'reason' => $reason,
                'reasonLabel' => $reasonLabel,
                'blockers' => array_values(array_unique($blockers)),
                'canToggle' => true,
                'kind' => 'professional',
                'publicProfileId' => (string) $profile->id,
            ];
        }

        if ($org !== null) {
            $blockers = array_merge($blockers, $this->organizationCompletenessBlockers($org));
            $visible = (bool) $org->is_published;
            $reason = $visible ? 'published' : ($blockers !== [] ? 'incomplete_or_hidden' : 'hidden_manual');
            $reasonLabel = $visible
                ? 'Organizzazione pubblicata in directory.'
                : ($blockers !== []
                    ? 'Non visibile: scheda organizzazione incompleta o nascosta.'
                    : 'Organizzazione nascosta manualmente (is_published = false).');

            return [
                'profileVisible' => $visible,
                'reason' => $reason,
                'reasonLabel' => $reasonLabel,
                'blockers' => array_values(array_unique($blockers)),
                'canToggle' => true,
                'kind' => 'organization',
                'publicProfileId' => (string) $org->id,
            ];
        }

        $roleLabel = match ($u->role) {
            UserRole::PublicUser => 'account famiglia',
            UserRole::PlatformAdmin => 'account admin',
            default => 'questo ruolo',
        };

        return [
            'profileVisible' => null,
            'reason' => 'not_applicable',
            'reasonLabel' => "N/D: {$roleLabel} non ha un profilo in directory pubblica.",
            'blockers' => ["La visibilità directory non si applica a {$roleLabel}."],
            'canToggle' => false,
            'kind' => 'none',
            'publicProfileId' => null,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function buildVisibilityDetail(User $u): array
    {
        $summary = $this->buildVisibilitySummary($u);
        $viewsTotal = 0;
        $viewsLast7 = 0;
        $recentViews = [];

        if ($summary['kind'] === 'professional' && $u->professionalProfile !== null) {
            $profileId = (int) $u->professionalProfile->id;
            $viewsTotal = ProfessionalProfileView::query()
                ->where('professional_profile_id', $profileId)
                ->count();
            $viewsLast7 = ProfessionalProfileView::query()
                ->where('professional_profile_id', $profileId)
                ->whereDate('viewed_on', '>=', now()->subDays(6)->toDateString())
                ->count();

            $rows = ProfessionalProfileView::query()
                ->where('professional_profile_id', $profileId)
                ->orderByDesc('viewed_on')
                ->orderByDesc('id')
                ->limit(20)
                ->get(['id', 'viewer_user_id', 'viewer_key', 'viewed_on']);

            $viewerIds = $rows->pluck('viewer_user_id')->filter()->unique()->values()->all();
            $viewers = $viewerIds === []
                ? collect()
                : User::query()->whereIn('id', $viewerIds)->get(['id', 'name', 'email'])->keyBy('id');

            $recentViews = $rows->map(function (ProfessionalProfileView $row) use ($viewers) {
                $viewer = $row->viewer_user_id ? $viewers->get($row->viewer_user_id) : null;

                return [
                    'id' => (string) $row->id,
                    'viewedOn' => $row->viewed_on?->toDateString(),
                    'viewerName' => $viewer?->name,
                    'viewerEmail' => $viewer?->email,
                    'anonymous' => $viewer === null,
                ];
            })->values()->all();
        }

        $contactsCount = $this->countUserConversations((int) $u->id);

        return [
            ...$summary,
            'stats' => [
                'profileViewsTotal' => $viewsTotal,
                'profileViewsLast7Days' => $viewsLast7,
                'conversationsCount' => $contactsCount,
            ],
            'recentViews' => $recentViews,
            'previewPath' => $this->publicPreviewPath($summary['kind'], $summary['publicProfileId']),
        ];
    }

    /**
     * @return list<string>
     */
    private function professionalCompletenessBlockers(ProfessionalProfile $profile): array
    {
        $blockers = [];
        if (trim((string) $profile->first_name) === '' || trim((string) $profile->last_name) === '') {
            $blockers[] = 'Nome o cognome mancanti sul profilo professionista.';
        }
        if (trim((string) $profile->professional_title) === '' && trim((string) $profile->bio) === '') {
            $blockers[] = 'Mancano titolo professionale e biografia (profilo incompleto).';
        }
        if (
            trim((string) $profile->comune) === ''
            && trim((string) ($profile->primary_zone ?? '')) === ''
        ) {
            $blockers[] = 'Zona / comune non impostati: difficile comparire in directory locale.';
        }
        if (trim((string) ($profile->photo_path ?? '')) === '') {
            $blockers[] = 'Foto profilo assente (consigliata per la directory).';
        }

        return $blockers;
    }

    /**
     * @return list<string>
     */
    private function organizationCompletenessBlockers(Organization $org): array
    {
        $blockers = [];
        if (trim((string) $org->name) === '') {
            $blockers[] = 'Nome organizzazione mancante.';
        }
        if (trim((string) ($org->comune ?? '')) === '') {
            $blockers[] = 'Comune non impostato sulla scheda organizzazione.';
        }

        return $blockers;
    }

    private function countUserConversations(int $userId): int
    {
        try {
            return MessageThread::query()
                ->where(function ($q) use ($userId): void {
                    $q->whereJsonContains('participant_ids', $userId)
                        ->orWhereJsonContains('participant_ids', (string) $userId);
                })
                ->count();
        } catch (\Throwable) {
            return MessageThread::query()
                ->get(['participant_ids'])
                ->filter(function (MessageThread $thread) use ($userId): bool {
                    $ids = $thread->participant_ids ?? [];

                    return in_array($userId, $ids, false) || in_array((string) $userId, $ids, true);
                })
                ->count();
        }
    }

    private function publicPreviewPath(string $kind, ?string $publicProfileId): ?string
    {
        if ($publicProfileId === null) {
            return null;
        }
        if ($kind === 'professional') {
            return '/profili/'.$publicProfileId;
        }
        if ($kind === 'organization') {
            return '/strutture/'.$publicProfileId;
        }

        return null;
    }

    public function suspendUser(Request $request, int $id): JsonResponse
    {
        $u = User::query()->find($id);
        if ($u === null) {
            return ApiResponse::error('Utente non trovato.', 404, [], 'not_found');
        }
        if ($u->role === UserRole::PlatformAdmin) {
            return ApiResponse::error('Non puoi sospendere un admin.', 422, [], 'validation');
        }

        DB::transaction(function () use ($u): void {
            $u->forceFill(['suspended_at' => now()])->save();
            $u->tokens()->delete();
            ProfessionalProfile::query()->where('user_id', $u->id)->update(['is_published' => false]);
            Organization::query()->where('user_id', $u->id)->update(['is_published' => false]);
            JobPosting::query()
                ->where('user_id', $u->id)
                ->where('status', 'active')
                ->update(['status' => 'paused']);
        });
        DirectoryCache::bump();
        AuditLog::record($request->user()->id, 'user.suspend', 'user', (string) $u->id);

        return $this->showUser($id);
    }

    public function reactivateUser(Request $request, int $id): JsonResponse
    {
        $u = User::query()->find($id);
        if ($u === null) {
            return ApiResponse::error('Utente non trovato.', 404, [], 'not_found');
        }
        $u->forceFill(['suspended_at' => null])->save();
        // Non ripubblica automaticamente: l’utente/admin ripubblica quando pronto.
        DirectoryCache::bump();
        AuditLog::record($request->user()->id, 'user.reactivate', 'user', (string) $u->id);

        return $this->showUser($id);
    }

    public function destroyUser(Request $request, int $id): JsonResponse
    {
        $actor = $request->user();
        // Defense-in-depth: middleware already enforces platform_admin.
        if ($actor === null || $actor->role !== UserRole::PlatformAdmin) {
            return ApiResponse::error('Non hai i permessi per questa operazione.', 403, [], 'forbidden');
        }

        $data = $request->validate([
            'confirm_email' => ['required', 'email:rfc'],
        ]);

        $u = User::query()->find($id);
        if ($u === null) {
            return ApiResponse::error('Utente non trovato.', 404, [], 'not_found');
        }
        if ((int) $u->id === (int) $actor->id) {
            return ApiResponse::error('Non puoi eliminare il tuo stesso account da qui.', 422, [], 'validation');
        }
        if ($u->role === UserRole::PlatformAdmin) {
            return ApiResponse::error('Non puoi eliminare un admin della piattaforma.', 422, [], 'validation');
        }

        $email = $u->email;
        $confirm = strtolower(trim($data['confirm_email']));
        if ($confirm !== strtolower($email)) {
            return ApiResponse::error(
                'L’email di conferma non corrisponde all’account selezionato.',
                422,
                ['confirm_email' => ['L’email di conferma non corrisponde all’account selezionato.']],
                'validation',
            );
        }

        $name = $u->name;
        $subjectId = (string) $u->id;
        $emailKey = strtolower($email);

        DB::transaction(function () use ($u, $actor, $subjectId, $emailKey) {
            $u->tokens()->delete();
            LoginOtp::query()->where('email', $emailKey)->delete();
            DB::table('password_reset_tokens')->where('email', $emailKey)->delete();
            AuditLog::record($actor->id, 'user.delete', 'user', $subjectId);
            $u->delete();
        });
        DirectoryCache::bump();

        Mail::to($email)->send(new AccountDeletedMail($name));

        return ApiResponse::noContent();
    }

    public function pendingJobs(): JsonResponse
    {
        $jobs = JobPosting::query()
            ->with('user')
            ->whereIn('status', ['pending_review', 'pending'])
            ->orderByDesc('id')
            ->limit(100)
            ->get()
            ->map(function (JobPosting $j) {
                $payload = is_array($j->payload) ? $j->payload : [];

                return [
                    'id' => (string) $j->id,
                    'title' => $j->title,
                    'ownerId' => (string) $j->user_id,
                    'ownerType' => $j->owner_type === 'structure' ? 'structure' : 'agency',
                    'ownerDisplayName' => $j->poster_display_name !== ''
                        ? $j->poster_display_name
                        : ($j->user?->name ?? 'Organizzazione'),
                    'roleId' => $j->category !== '' ? $j->category : 'caregiver',
                    'locationLabel' => $j->location_label !== ''
                        ? $j->location_label
                        : ($j->comune !== '' ? $j->comune : '—'),
                    'submittedAt' => $j->updated_at?->toIso8601String() ?? $j->created_at?->toIso8601String(),
                    'status' => $j->status,
                    'payload' => $payload,
                ];
            });

        return response()->json($jobs);
    }

    public function approveJob(Request $request, int $id): JsonResponse
    {
        $job = JobPosting::query()->find($id);
        if ($job === null) {
            return ApiResponse::error('Annuncio non trovato.', 404, [], 'not_found');
        }
        $job->status = 'active';
        $job->published_at = $job->published_at ?? now();
        $job->save();
        AuditLog::record($request->user()->id, 'job.approve', 'job_posting', (string) $job->id);

        return response()->json(['id' => (string) $job->id, 'status' => $job->status]);
    }

    public function rejectJob(Request $request, int $id): JsonResponse
    {
        $data = $request->validate([
            'reason' => ['nullable', 'string', 'min:10', 'max:1000'],
        ]);

        $job = JobPosting::query()->find($id);
        if ($job === null) {
            return ApiResponse::error('Annuncio non trovato.', 404, [], 'not_found');
        }
        $job->status = 'rejected';
        $job->save();
        AuditLog::record($request->user()->id, 'job.reject', 'job_posting', (string) $job->id, [
            'reason' => $data['reason'] ?? null,
        ]);

        return response()->json(['id' => (string) $job->id, 'status' => $job->status]);
    }
}
