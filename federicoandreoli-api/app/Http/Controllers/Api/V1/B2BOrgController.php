<?php

namespace App\Http\Controllers\Api\V1;

use App\Domains\Auth\Enums\UserRole;
use App\Mail\B2B\TeamInviteMail;
use App\Models\Application;
use App\Models\JobPosting;
use App\Models\Organization;
use App\Models\OrganizationLocation;
use App\Models\StaffMember;
use App\Models\TeamMember;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;

class B2BOrgController
{
    public function overview(Request $request): JsonResponse
    {
        $org = $this->orgFor($request);
        if ($org instanceof JsonResponse) {
            return $org;
        }

        $postings = JobPosting::query()->where('user_id', $request->user()->id)->get();
        $active = $postings->where('status', 'active')->count();
        $applications = Application::query()
            ->where('owner_id', $request->user()->id)
            ->where('target_type', 'job_posting')
            ->count();

        $chart = [];
        for ($i = 29; $i >= 0; $i--) {
            $day = now()->subDays($i)->startOfDay();
            $chart[] = Application::query()
                ->where('owner_id', $request->user()->id)
                ->where('created_at', '>=', $day)
                ->where('created_at', '<', $day->copy()->addDay())
                ->count();
        }

        $latest = $postings->sortByDesc('updated_at')->take(3)->values()->map(fn (JobPosting $p) => [
            'id' => (string) $p->id,
            'title' => $p->title,
            'applications' => Application::query()
                ->where('target_type', 'job_posting')
                ->where('target_id', $p->id)
                ->count(),
            'status' => $p->status,
        ]);

        return response()->json([
            'organization' => [
                'id' => (string) $org->id,
                'name' => $org->name,
                'kind' => $org->kind,
                'comune' => $org->comune,
                'coverageHint' => $org->coverage_hint,
                'bio' => $org->bio,
                'services' => $org->services ?? [],
                'roleLabel' => $org->role_label,
            ],
            'stats' => [
                'activePostings' => $active,
                'applicationsReceived' => $applications,
                'networkProfessionals' => $org->kind === 'agency' ? 24 : StaffMember::query()->where('organization_id', $org->id)->count(),
            ],
            'chartLast30Days' => $chart,
            'latestPostings' => $latest,
        ]);
    }

    public function updateProfile(Request $request): JsonResponse
    {
        $org = $this->orgFor($request);
        if ($org instanceof JsonResponse) {
            return $org;
        }

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'roleLabel' => ['sometimes', 'string', 'max:255'],
            'bio' => ['sometimes', 'string', 'max:5000'],
            'coverageHint' => ['sometimes', 'string', 'max:500'],
            'comune' => ['sometimes', 'string', 'max:120'],
            'services' => ['sometimes', 'array'],
            'services.*' => ['string', 'max:120'],
        ]);

        $map = [
            'name' => 'name',
            'roleLabel' => 'role_label',
            'bio' => 'bio',
            'coverageHint' => 'coverage_hint',
            'comune' => 'comune',
            'services' => 'services',
        ];
        foreach ($map as $input => $column) {
            if (array_key_exists($input, $data)) {
                $org->{$column} = $data[$input];
            }
        }
        $org->save();

        return $this->overview($request);
    }

    public function teamIndex(Request $request): JsonResponse
    {
        $org = $this->orgFor($request);
        if ($org instanceof JsonResponse) {
            return $org;
        }

        $members = TeamMember::query()->where('organization_id', $org->id)->orderByDesc('id')->get()
            ->map(fn (TeamMember $m) => [
                'id' => (string) $m->id,
                'email' => $m->email,
                'name' => $m->name,
                'role' => $m->role_label,
                'status' => $m->status,
                'invitedAt' => $m->invited_at?->toIso8601String(),
            ]);

        return response()->json($members);
    }

    public function teamInvite(Request $request): JsonResponse
    {
        $org = $this->orgFor($request);
        if ($org instanceof JsonResponse) {
            return $org;
        }

        $data = $request->validate([
            'email' => ['required', 'email'],
            'name' => ['nullable', 'string', 'max:120'],
            'role' => ['nullable', 'string', 'max:120'],
        ]);

        $member = TeamMember::query()->updateOrCreate(
            ['organization_id' => $org->id, 'email' => strtolower($data['email'])],
            [
                'name' => $data['name'] ?? '',
                'role_label' => $data['role'] ?? 'Operatore',
                'status' => 'invited',
                'invited_at' => now(),
            ],
        );

        Mail::to($member->email)->send(new TeamInviteMail($member, $org->name));

        return response()->json([
            'id' => (string) $member->id,
            'email' => $member->email,
            'name' => $member->name,
            'role' => $member->role_label,
            'status' => $member->status,
            'invitedAt' => $member->invited_at?->toIso8601String(),
        ], 201);
    }

    public function teamDestroy(Request $request, int|string $orgId, int $memberId): JsonResponse
    {
        $org = $this->orgFor($request);
        if ($org instanceof JsonResponse) {
            return $org;
        }

        $member = TeamMember::query()->where('organization_id', $org->id)->find($memberId);
        if ($member === null) {
            return ApiResponse::error('Membro non trovato.', 404, [], 'not_found');
        }
        $member->delete();

        return ApiResponse::noContent();
    }

    public function staffIndex(Request $request): JsonResponse
    {
        $org = $this->orgFor($request);
        if ($org instanceof JsonResponse) {
            return $org;
        }

        $members = StaffMember::query()->where('organization_id', $org->id)->orderByDesc('id')->get()
            ->map(fn (StaffMember $m) => [
                'id' => (string) $m->id,
                'name' => $m->name,
                'role' => $m->role_label,
                'status' => $m->status,
                'shift' => $m->shift,
                'notes' => $m->notes,
            ]);

        return response()->json($members);
    }

    public function staffStore(Request $request): JsonResponse
    {
        $org = $this->orgFor($request);
        if ($org instanceof JsonResponse) {
            return $org;
        }

        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'role' => ['required', 'string', 'max:120'],
            'status' => ['nullable', 'in:active,on_leave,ended'],
            'shift' => ['nullable', 'string', 'max:120'],
            'notes' => ['nullable', 'string', 'max:500'],
        ]);

        $member = StaffMember::query()->create([
            'organization_id' => $org->id,
            'name' => $data['name'],
            'role_label' => $data['role'],
            'status' => $data['status'] ?? 'active',
            'shift' => $data['shift'] ?? '',
            'notes' => $data['notes'] ?? '',
        ]);

        return response()->json([
            'id' => (string) $member->id,
            'name' => $member->name,
            'role' => $member->role_label,
            'status' => $member->status,
            'shift' => $member->shift,
            'notes' => $member->notes,
        ], 201);
    }

    public function staffUpdate(Request $request, int|string $orgId, int $id): JsonResponse
    {
        $org = $this->orgFor($request);
        if ($org instanceof JsonResponse) {
            return $org;
        }

        $member = StaffMember::query()->where('organization_id', $org->id)->find($id);
        if ($member === null) {
            return ApiResponse::error('Membro staff non trovato.', 404, [], 'not_found');
        }

        $data = $request->validate([
            'status' => ['required', 'in:active,on_leave,ended'],
        ]);
        $member->status = $data['status'];
        $member->save();

        return response()->json([
            'id' => (string) $member->id,
            'name' => $member->name,
            'role' => $member->role_label,
            'status' => $member->status,
            'shift' => $member->shift,
            'notes' => $member->notes,
        ]);
    }

    public function staffDestroy(Request $request, int|string $orgId, int $id): JsonResponse
    {
        $org = $this->orgFor($request);
        if ($org instanceof JsonResponse) {
            return $org;
        }

        $member = StaffMember::query()->where('organization_id', $org->id)->find($id);
        if ($member === null) {
            return ApiResponse::error('Membro staff non trovato.', 404, [], 'not_found');
        }
        $member->delete();

        return ApiResponse::noContent();
    }

    public function locationsIndex(Request $request): JsonResponse
    {
        $org = $this->orgFor($request);
        if ($org instanceof JsonResponse) {
            return $org;
        }

        return response()->json(
            OrganizationLocation::query()->where('organization_id', $org->id)->orderByDesc('is_primary')->get()
                ->map(fn (OrganizationLocation $l) => $this->locationPayload($l))
        );
    }

    public function locationsStore(Request $request): JsonResponse
    {
        $org = $this->orgFor($request);
        if ($org instanceof JsonResponse) {
            return $org;
        }

        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'comune' => ['required', 'string', 'max:120'],
            'cap' => ['nullable', 'string', 'max:10'],
            'address' => ['nullable', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:40'],
            'isPrimary' => ['nullable', 'boolean'],
        ]);

        if (! empty($data['isPrimary'])) {
            OrganizationLocation::query()->where('organization_id', $org->id)->update(['is_primary' => false]);
        }

        $location = OrganizationLocation::query()->create([
            'organization_id' => $org->id,
            'name' => $data['name'],
            'comune' => $data['comune'],
            'cap' => $data['cap'] ?? '',
            'address' => $data['address'] ?? '',
            'phone' => $data['phone'] ?? '',
            'is_primary' => (bool) ($data['isPrimary'] ?? false),
        ]);

        return response()->json($this->locationPayload($location), 201);
    }

    public function locationsUpdate(Request $request, int|string $orgId, int $id): JsonResponse
    {
        $org = $this->orgFor($request);
        if ($org instanceof JsonResponse) {
            return $org;
        }

        $location = OrganizationLocation::query()->where('organization_id', $org->id)->find($id);
        if ($location === null) {
            return ApiResponse::error('Sede non trovata.', 404, [], 'not_found');
        }

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:120'],
            'comune' => ['sometimes', 'string', 'max:120'],
            'cap' => ['sometimes', 'string', 'max:10'],
            'address' => ['sometimes', 'string', 'max:255'],
            'phone' => ['sometimes', 'string', 'max:40'],
            'isPrimary' => ['sometimes', 'boolean'],
        ]);

        foreach (['name', 'comune', 'cap', 'address', 'phone'] as $field) {
            if (array_key_exists($field, $data)) {
                $location->{$field} = $data[$field];
            }
        }
        if (array_key_exists('isPrimary', $data)) {
            if ($data['isPrimary']) {
                OrganizationLocation::query()->where('organization_id', $org->id)->update(['is_primary' => false]);
            }
            $location->is_primary = (bool) $data['isPrimary'];
        }
        $location->save();

        return response()->json($this->locationPayload($location));
    }

    public function locationsDestroy(Request $request, int|string $orgId, int $id): JsonResponse
    {
        $org = $this->orgFor($request);
        if ($org instanceof JsonResponse) {
            return $org;
        }

        $location = OrganizationLocation::query()->where('organization_id', $org->id)->find($id);
        if ($location === null) {
            return ApiResponse::error('Sede non trovata.', 404, [], 'not_found');
        }
        $location->delete();

        return ApiResponse::noContent();
    }

    public function locationsSetPrimary(Request $request, int|string $orgId, int $id): JsonResponse
    {
        $request->merge(['isPrimary' => true]);

        return $this->locationsUpdate($request, $orgId, $id);
    }

    private function orgFor(Request $request): Organization|JsonResponse
    {
        $user = $request->user();
        if (! in_array($user->role, [UserRole::Agency, UserRole::Structure], true)) {
            return ApiResponse::error('Non autorizzato.', 403, [], 'forbidden');
        }

        $org = Organization::query()->where('user_id', $user->id)->first();
        if ($org === null) {
            return ApiResponse::error('Organizzazione non configurata.', 404, [], 'not_found');
        }

        return $org;
    }

    /**
     * @return array<string, mixed>
     */
    private function locationPayload(OrganizationLocation $l): array
    {
        return [
            'id' => (string) $l->id,
            'name' => $l->name,
            'comune' => $l->comune,
            'cap' => $l->cap,
            'address' => $l->address,
            'phone' => $l->phone,
            'isPrimary' => $l->is_primary,
        ];
    }
}
