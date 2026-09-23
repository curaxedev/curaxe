<?php

namespace App\Http\Controllers\Api\V1;

use App\Domains\Auth\Enums\UserRole;
use App\Models\Application;
use App\Models\JobPosting;
use App\Models\Organization;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class B2BJobPostingController
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! in_array($user->role, [UserRole::Agency, UserRole::Structure], true)) {
            return ApiResponse::error('Non autorizzato.', 403, [], 'forbidden');
        }

        $ownerType = $user->role === UserRole::Structure ? 'structure' : 'agency';
        $postings = JobPosting::query()
            ->where('user_id', $user->id)
            ->orderByDesc('updated_at')
            ->get()
            ->map(fn (JobPosting $job) => $this->toJobPosting($job, $ownerType));

        return response()->json($postings);
    }

    public function store(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! in_array($user->role, [UserRole::Agency, UserRole::Structure], true)) {
            return ApiResponse::error('Non autorizzato.', 403, [], 'forbidden');
        }

        $data = $this->validatedForm($request);
        $ownerType = $user->role === UserRole::Structure ? 'structure' : 'agency';
        $publishAs = $request->input('publishAs', 'draft');
        $status = $publishAs === 'active' ? 'active' : 'draft';

        $org = Organization::query()->where('user_id', $user->id)->first();
        $location = $data['location'];
        $comp = $data['compensation'];
        $rateLabel = $this->rateLabel($comp);

        $job = JobPosting::query()->create([
            'organization_id' => $org?->id,
            'user_id' => $user->id,
            'owner_type' => $ownerType,
            'status' => $status,
            'category' => $data['roleId'],
            'poster_type' => $ownerType === 'structure' ? 'struttura' : 'agenzia',
            'poster_display_name' => $org?->name ?? $user->name,
            'contract_bucket' => $this->contractBucket($data['contractType']),
            'contract_type' => $data['contractType'],
            'department' => $data['department'] ?? '',
            'title' => $data['title'],
            'excerpt' => mb_substr($data['description'], 0, 280),
            'location_label' => trim(($location['comune'] ?? '').' '.($location['address'] ?? '')),
            'comune' => $location['comune'] ?? '',
            'regione' => '',
            'rate_label' => $rateLabel,
            'schedule_label' => implode(', ', $data['availability']['days'] ?? []),
            'description_intro' => $data['description'],
            'duties' => [],
            'requirements' => array_values(array_filter(array_map('trim', explode("\n", $data['requirementsText'])))),
            'payload' => $data,
            'version' => 1,
            'change_history' => [['at' => now()->toIso8601String(), 'version' => 1, 'summary' => 'Creazione']],
            'published_at' => $status === 'active' ? now() : null,
        ]);

        Cache::flush();

        return response()->json($this->toJobPosting($job, $ownerType), 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $job = JobPosting::query()->where('user_id', $user->id)->find($id);
        if ($job === null) {
            return ApiResponse::error('Annuncio non trovato.', 404, [], 'not_found');
        }

        $ownerType = $user->role === UserRole::Structure ? 'structure' : 'agency';

        if ($request->has('publishAs') && is_string($request->input('publishAs')) && ! $request->has('title')) {
            $status = $request->string('publishAs')->toString();
            if (! in_array($status, ['draft', 'pending_review', 'active', 'paused', 'closed', 'rejected'], true)) {
                return ApiResponse::error('Stato non valido.', 422, [], 'validation');
            }
            $job->status = $status;
            if ($status === 'active' && $job->published_at === null) {
                $job->published_at = now();
            }
            $job->save();
            Cache::flush();

            return response()->json($this->toJobPosting($job, $ownerType));
        }

        $data = $this->validatedForm($request, partial: true);
        $payload = array_replace_recursive($job->payload ?? [], $data);
        $job->payload = $payload;
        if (isset($data['title'])) {
            $job->title = $data['title'];
        }
        if (isset($data['description'])) {
            $job->excerpt = mb_substr($data['description'], 0, 280);
            $job->description_intro = $data['description'];
        }
        if (isset($data['roleId'])) {
            $job->category = $data['roleId'];
        }
        if (isset($data['location']['comune'])) {
            $job->comune = $data['location']['comune'];
            $job->location_label = trim(($data['location']['comune'] ?? '').' '.($data['location']['address'] ?? ''));
        }
        if (isset($data['contractType'])) {
            $job->contract_type = $data['contractType'];
            $job->contract_bucket = $this->contractBucket($data['contractType']);
        }
        if ($request->filled('publishAs')) {
            $job->status = $request->string('publishAs')->toString();
            if ($job->status === 'active' && $job->published_at === null) {
                $job->published_at = now();
            }
        }
        $job->version = (int) $job->version + 1;
        $history = $job->change_history ?? [];
        $history[] = [
            'at' => now()->toIso8601String(),
            'version' => $job->version,
            'summary' => $request->input('changeSummary', 'Aggiornamento'),
        ];
        $job->change_history = $history;
        $job->save();
        Cache::flush();

        return response()->json($this->toJobPosting($job->fresh(), $ownerType));
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $job = JobPosting::query()->where('user_id', $request->user()->id)->find($id);
        if ($job === null) {
            return ApiResponse::error('Annuncio non trovato.', 404, [], 'not_found');
        }
        $job->delete();
        Cache::flush();

        return ApiResponse::noContent();
    }

    /**
     * @return array<string, mixed>
     */
    private function validatedForm(Request $request, bool $partial = false): array
    {
        $required = $partial ? 'sometimes' : 'required';

        return $request->validate([
            'roleId' => [$required, 'string', 'max:40'],
            'title' => [$required, 'string', 'max:255'],
            'description' => [$required, 'string', 'max:5000'],
            'requirementsText' => [$required, 'string', 'max:5000'],
            'availability' => [$required, 'array'],
            'availability.days' => [$required, 'array'],
            'availability.scheduleNotes' => ['nullable', 'string', 'max:500'],
            'availability.startDate' => ['nullable', 'string', 'max:40'],
            'compensation' => [$required, 'array'],
            'compensation.minAmount' => ['nullable', 'numeric'],
            'compensation.maxAmount' => ['nullable', 'numeric'],
            'compensation.period' => ['nullable', 'in:monthly,hourly'],
            'compensation.notes' => ['nullable', 'string', 'max:500'],
            'contractType' => [$required, 'string', 'max:40'],
            'location' => [$required, 'array'],
            'location.comune' => [$required, 'string', 'max:120'],
            'location.provincia' => ['nullable', 'string', 'max:120'],
            'location.cap' => ['nullable', 'string', 'max:10'],
            'location.address' => ['nullable', 'string', 'max:255'],
            'location.organizationLocationId' => ['nullable', 'string', 'max:40'],
            'department' => ['nullable', 'string', 'max:120'],
            'publishAs' => ['nullable', 'string', 'max:40'],
            'changeSummary' => ['nullable', 'string', 'max:255'],
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function toJobPosting(JobPosting $job, string $ownerType): array
    {
        $payload = $job->payload ?? [];
        $count = Application::query()
            ->where('target_type', 'job_posting')
            ->where('target_id', $job->id)
            ->count();

        return [
            'id' => (string) $job->id,
            'ownerId' => (string) $job->user_id,
            'ownerType' => $job->owner_type ?: $ownerType,
            'ownerDisplayName' => $job->poster_display_name,
            'status' => $job->status === 'pending' ? 'pending_review' : $job->status,
            'applicationCount' => $count,
            'createdAt' => $job->created_at?->toIso8601String(),
            'updatedAt' => $job->updated_at?->toIso8601String(),
            'version' => (int) $job->version,
            'changeHistory' => $job->change_history ?? [],
            'roleId' => $payload['roleId'] ?? $job->category,
            'title' => $job->title,
            'description' => $payload['description'] ?? (string) $job->description_intro,
            'requirementsText' => $payload['requirementsText'] ?? implode("\n", $job->requirements ?? []),
            'availability' => $payload['availability'] ?? [
                'days' => [],
                'scheduleNotes' => $job->schedule_label,
                'startDate' => '',
            ],
            'compensation' => $payload['compensation'] ?? [
                'minAmount' => null,
                'maxAmount' => null,
                'period' => 'monthly',
                'notes' => $job->rate_label,
            ],
            'contractType' => $payload['contractType'] ?? $job->contract_type ?? 'permanent',
            'location' => $payload['location'] ?? [
                'comune' => $job->comune,
                'provincia' => '',
                'cap' => '',
                'address' => '',
            ],
            'department' => $payload['department'] ?? $job->department ?? '',
        ];
    }

    private function contractBucket(string $type): string
    {
        return match ($type) {
            'hourly', 'part_time' => 'hourly',
            'freelance' => 'other',
            default => 'ccnl',
        };
    }

    /**
     * @param  array<string, mixed>  $comp
     */
    private function rateLabel(array $comp): string
    {
        $min = $comp['minAmount'] ?? null;
        $max = $comp['maxAmount'] ?? null;
        $period = ($comp['period'] ?? 'monthly') === 'hourly' ? '/ora' : '/mese';
        if ($min && $max) {
            return '€'.$min.' – '.$max.' '.$period;
        }
        if ($min) {
            return '€'.$min.' '.$period;
        }

        return (string) ($comp['notes'] ?? '');
    }
}
