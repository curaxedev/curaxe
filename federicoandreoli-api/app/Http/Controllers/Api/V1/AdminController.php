<?php

namespace App\Http\Controllers\Api\V1;

use App\Domains\Auth\Enums\UserRole;
use App\Mail\Registration\AccountDeletedMail;
use App\Models\AuditLog;
use App\Models\JobPosting;
use App\Models\User;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
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

        $users = $query->limit(100)->get()->map(fn (User $u) => [
            'id' => (string) $u->id,
            'name' => $u->name,
            'email' => $u->email,
            'role' => $u->role->value,
            'status' => $u->suspended_at ? 'suspended' : 'active',
            'createdAt' => $u->created_at?->toIso8601String(),
            'emailVerifiedAt' => $u->email_verified_at?->toIso8601String(),
        ]);

        return response()->json($users);
    }

    public function showUser(int $id): JsonResponse
    {
        $u = User::query()->find($id);
        if ($u === null) {
            return ApiResponse::error('Utente non trovato.', 404, [], 'not_found');
        }

        return response()->json([
            'id' => (string) $u->id,
            'name' => $u->name,
            'email' => $u->email,
            'role' => $u->role->value,
            'status' => $u->suspended_at ? 'suspended' : 'active',
            'createdAt' => $u->created_at?->toIso8601String(),
            'emailVerifiedAt' => $u->email_verified_at?->toIso8601String(),
            'suspendedAt' => $u->suspended_at?->toIso8601String(),
        ]);
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

        $u->forceFill(['suspended_at' => now()])->save();
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
        AuditLog::record($request->user()->id, 'user.reactivate', 'user', (string) $u->id);

        return $this->showUser($id);
    }

    public function destroyUser(Request $request, int $id): JsonResponse
    {
        $actor = $request->user();
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
        $name = $u->name;
        $subjectId = (string) $u->id;

        DB::transaction(function () use ($u, $actor, $subjectId) {
            $u->tokens()->delete();
            AuditLog::record($actor->id, 'user.delete', 'user', $subjectId);
            $u->delete();
        });

        Mail::to($email)->send(new AccountDeletedMail($name));

        return ApiResponse::noContent();
    }

    public function pendingJobs(): JsonResponse
    {
        $jobs = JobPosting::query()
            ->whereIn('status', ['pending_review', 'pending'])
            ->orderByDesc('id')
            ->limit(100)
            ->get()
            ->map(fn (JobPosting $j) => [
                'id' => (string) $j->id,
                'title' => $j->title,
                'ownerId' => (string) $j->user_id,
                'ownerType' => $j->owner_type,
                'status' => $j->status,
                'createdAt' => $j->created_at?->toIso8601String(),
            ]);

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
        $job = JobPosting::query()->find($id);
        if ($job === null) {
            return ApiResponse::error('Annuncio non trovato.', 404, [], 'not_found');
        }
        $job->status = 'rejected';
        $job->save();
        AuditLog::record($request->user()->id, 'job.reject', 'job_posting', (string) $job->id);

        return response()->json(['id' => (string) $job->id, 'status' => $job->status]);
    }
}
