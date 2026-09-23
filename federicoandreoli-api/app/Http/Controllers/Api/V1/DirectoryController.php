<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Resources\DirectoryOpenPositionResource;
use App\Http\Resources\DirectoryProfessionalDetailResource;
use App\Http\Resources\DirectoryProfileSummaryResource;
use App\Http\Resources\DirectoryStructureResource;
use App\Models\JobPosting;
use App\Models\Organization;
use App\Models\ProfessionalProfile;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class DirectoryController
{
    public function profiles(Request $request): JsonResponse
    {
        $data = $request->validate([
            'intent' => ['nullable', 'in:cerco,offro'],
            'comune' => ['nullable', 'string', 'max:120'],
            'regione' => ['nullable', 'string', 'max:120'],
            'category' => ['nullable', 'string', 'max:40'],
            'q' => ['nullable', 'string', 'max:120'],
            'page' => ['nullable', 'integer', 'min:1'],
            'pageSize' => ['nullable', 'integer', 'min:1', 'max:50'],
        ]);

        $page = (int) ($data['page'] ?? 1);
        $pageSize = (int) ($data['pageSize'] ?? 12);
        $cacheKey = 'directory.profiles.'.md5(json_encode($data));

        $payload = Cache::remember($cacheKey, 60, function () use ($data, $page, $pageSize) {
            $profiles = ProfessionalProfile::query()
                ->with('user')
                ->where('is_published', true);

            if (! empty($data['comune'])) {
                $profiles->where('comune', 'like', '%'.$data['comune'].'%');
            }
            if (! empty($data['regione'])) {
                $profiles->where('regione', 'like', '%'.$data['regione'].'%');
            }
            if (! empty($data['category'])) {
                $profiles->where('category', 'like', '%'.$data['category'].'%');
            }
            if (! empty($data['q'])) {
                $q = $data['q'];
                $profiles->where(function ($builder) use ($q) {
                    $builder->where('first_name', 'like', "%{$q}%")
                        ->orWhere('last_name', 'like', "%{$q}%")
                        ->orWhere('professional_title', 'like', "%{$q}%")
                        ->orWhere('bio', 'like', "%{$q}%");
                });
            }

            $orgs = Organization::query()->where('is_published', true);
            if (! empty($data['comune'])) {
                $orgs->where('comune', 'like', '%'.$data['comune'].'%');
            }
            if (! empty($data['regione'])) {
                $orgs->where('regione', 'like', '%'.$data['regione'].'%');
            }

            $profileItems = $profiles->orderByDesc('rating_avg')->get();
            $orgItems = ($data['intent'] ?? 'cerco') === 'cerco' ? $orgs->orderByDesc('rating_avg')->get() : collect();

            $merged = $profileItems
                ->map(fn ($p) => (new DirectoryProfileSummaryResource($p))->resolve())
                ->concat($orgItems->map(fn ($o) => (new DirectoryProfileSummaryResource($o))->resolve()))
                ->values();

            $total = $merged->count();
            $totalPages = max(1, (int) ceil($total / $pageSize));
            $safePage = min(max(1, $page), $totalPages);
            $slice = $merged->slice(($safePage - 1) * $pageSize, $pageSize)->values();

            return [
                'data' => $slice,
                'meta' => [
                    'total' => $total,
                    'page' => $safePage,
                    'pageSize' => $pageSize,
                    'totalPages' => $totalPages,
                ],
            ];
        });

        return response()->json($payload);
    }

    public function showProfile(string $id): JsonResponse
    {
        $profile = ProfessionalProfile::query()
            ->with('user')
            ->where('is_published', true)
            ->where('user_id', $id)
            ->first();

        if ($profile === null) {
            return ApiResponse::error('Profilo non trovato.', 404, [], 'not_found');
        }

        return (new DirectoryProfessionalDetailResource($profile))
            ->response()
            ->setStatusCode(200);
    }

    public function showStructure(string $id): JsonResponse
    {
        $numericId = str_starts_with($id, 'org-') ? substr($id, 4) : $id;

        $org = Organization::query()
            ->where('is_published', true)
            ->where(function ($q) use ($id, $numericId) {
                $q->where('id', $numericId)->orWhere('slug', $id);
            })
            ->first();

        if ($org === null) {
            return ApiResponse::error('Struttura non trovata.', 404, [], 'not_found');
        }

        return (new DirectoryStructureResource($org))
            ->response()
            ->setStatusCode(200);
    }

    public function openPositions(Request $request): JsonResponse
    {
        $data = $request->validate([
            'citta' => ['nullable', 'string', 'max:120'],
            'category' => ['nullable', 'string', 'max:40'],
            'page' => ['nullable', 'integer', 'min:1'],
            'pageSize' => ['nullable', 'integer', 'min:1', 'max:50'],
        ]);

        $page = (int) ($data['page'] ?? 1);
        $pageSize = (int) ($data['pageSize'] ?? 12);
        $cacheKey = 'directory.open_positions.'.md5(json_encode($data));

        $payload = Cache::remember($cacheKey, 60, function () use ($data, $page, $pageSize) {
            $query = JobPosting::query()
                ->where('status', 'active')
                ->whereNotNull('published_at');

            if (! empty($data['citta'])) {
                $query->where(function ($q) use ($data) {
                    $q->where('comune', 'like', '%'.$data['citta'].'%')
                        ->orWhere('location_label', 'like', '%'.$data['citta'].'%');
                });
            }
            if (! empty($data['category'])) {
                $query->where('category', $data['category']);
            }

            $total = (clone $query)->count();
            $totalPages = max(1, (int) ceil($total / $pageSize));
            $safePage = min(max(1, $page), $totalPages);

            $items = $query->orderByDesc('published_at')
                ->forPage($safePage, $pageSize)
                ->get()
                ->map(fn ($job) => (new DirectoryOpenPositionResource($job))->resolve())
                ->values();

            return [
                'data' => $items,
                'meta' => [
                    'total' => $total,
                    'page' => $safePage,
                    'pageSize' => $pageSize,
                    'totalPages' => $totalPages,
                ],
            ];
        });

        return response()->json($payload);
    }

    public function showOpenPosition(string $id): JsonResponse
    {
        $job = JobPosting::query()
            ->where('status', 'active')
            ->whereNotNull('published_at')
            ->where('id', $id)
            ->first();

        if ($job === null) {
            return ApiResponse::error('Posizione non trovata.', 404, [], 'not_found');
        }

        return (new DirectoryOpenPositionResource($job))
            ->response()
            ->setStatusCode(200);
    }
}
