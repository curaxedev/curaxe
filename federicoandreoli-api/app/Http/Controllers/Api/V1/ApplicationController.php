<?php

namespace App\Http\Controllers\Api\V1;

use App\Domains\Applications\ApplicationStatusTransitions;
use App\Domains\Auth\Enums\UserRole;
use App\Http\Resources\ApplicationResource;
use App\Mail\Applications\ApplicationReceivedMail;
use App\Mail\Applications\ApplicationStatusChangedMail;
use App\Models\Application;
use App\Models\FamilyRequest;
use App\Models\JobPosting;
use App\Models\ProfessionalProfile;
use App\Models\User;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;

class ApplicationController
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $role = $request->query('role', $user->role->value);

        $query = Application::query()->orderByDesc('updated_at');

        if ($role === 'professional' || $user->role === UserRole::Professional) {
            $query->where('applicant_id', $user->id);
        } else {
            $query->where('owner_id', $user->id);
        }

        return response()->json(
            ApplicationResource::collection($query->get())->resolve()
        );
    }

    public function applyToJobPosting(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        if ($user->role !== UserRole::Professional) {
            return ApiResponse::error('Solo i professionisti possono candidarsi.', 403, [], 'forbidden');
        }

        $job = JobPosting::query()->where('status', 'active')->find($id);
        if ($job === null) {
            return ApiResponse::error('Annuncio non trovato o non attivo.', 404, [], 'not_found');
        }

        return $this->createApplication($request, $user, [
            'target_type' => 'job_posting',
            'target_id' => $job->id,
            'owner_id' => $job->user_id,
            'target_title' => $job->title,
            'target_publisher_name' => $job->poster_display_name,
            'target_publisher_kind' => $job->poster_type === 'struttura' ? 'struttura' : ($job->poster_type === 'famiglia' ? 'famiglia' : 'agenzia'),
        ]);
    }

    public function applyToFamilyRequest(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        if ($user->role !== UserRole::Professional) {
            return ApiResponse::error('Solo i professionisti possono candidarsi.', 403, [], 'forbidden');
        }

        $familyRequest = FamilyRequest::query()->where('status', 'active')->find($id);
        if ($familyRequest === null) {
            return ApiResponse::error('Richiesta non trovata o non attiva.', 404, [], 'not_found');
        }

        return $this->createApplication($request, $user, [
            'target_type' => 'family_request',
            'target_id' => $familyRequest->id,
            'owner_id' => $familyRequest->user_id,
            'target_title' => $familyRequest->title,
            'target_publisher_name' => $familyRequest->user?->name ?? 'Famiglia',
            'target_publisher_kind' => 'famiglia',
        ]);
    }

    public function updateStatus(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $data = $request->validate([
            'status' => ['required', 'string', 'max:32'],
        ]);

        $application = Application::query()->find($id);
        if ($application === null) {
            return ApiResponse::error('Candidatura non trovata.', 404, [], 'not_found');
        }

        $isOwner = $application->owner_id === $user->id;
        $isApplicant = $application->applicant_id === $user->id;
        if (! $isOwner && ! $isApplicant) {
            return ApiResponse::error('Non autorizzato.', 403, [], 'forbidden');
        }

        if (! ApplicationStatusTransitions::allows(
            $user->role,
            $application->target_type,
            $application->status,
            $data['status'],
        )) {
            return ApiResponse::error('Transizione di stato non consentita.', 422, [], 'validation');
        }

        $application->status = $data['status'];
        $application->save();

        $recipient = $isOwner ? $application->applicant : $application->owner;
        if ($recipient !== null) {
            Mail::to($recipient->email)->send(new ApplicationStatusChangedMail($application));
        }

        return (new ApplicationResource($application))->response()->setStatusCode(200);
    }

    /**
     * @param  array{target_type: string, target_id: int, owner_id: int, target_title: string, target_publisher_name: string, target_publisher_kind: string}  $target
     */
    private function createApplication(Request $request, User $user, array $target): JsonResponse
    {
        $data = $request->validate([
            'message' => ['nullable', 'string', 'max:2000'],
        ]);

        $exists = Application::query()
            ->where('target_type', $target['target_type'])
            ->where('target_id', $target['target_id'])
            ->where('applicant_id', $user->id)
            ->exists();

        if ($exists) {
            return ApiResponse::error('Hai già inviato una candidatura.', 422, [], 'duplicate');
        }

        $profile = ProfessionalProfile::query()->where('user_id', $user->id)->first();
        $name = $profile
            ? trim($profile->first_name.' '.$profile->last_name)
            : $user->name;
        $parts = preg_split('/\s+/', $name) ?: [];
        $initials = strtoupper(mb_substr($parts[0] ?? 'P', 0, 1).mb_substr($parts[1] ?? '', 0, 1));

        $application = Application::query()->create([
            ...$target,
            'applicant_id' => $user->id,
            'status' => 'submitted',
            'message' => $data['message'] ?? null,
            'applicant_name' => $name !== '' ? $name : $user->name,
            'applicant_initials' => $initials !== '' ? $initials : 'PR',
            'applicant_category' => $profile?->category ?? 'Professionista',
            'applicant_zone' => $profile?->primary_zone ?: ($profile?->comune ?? ''),
            'applicant_stars' => $profile?->rating_avg ?? 0,
            'applicant_preview' => mb_substr((string) ($profile?->bio ?? ''), 0, 200),
        ]);

        $owner = User::query()->find($target['owner_id']);
        if ($owner !== null) {
            Mail::to($owner->email)->send(new ApplicationReceivedMail($application));
        }

        return (new ApplicationResource($application))->response()->setStatusCode(201);
    }
}
