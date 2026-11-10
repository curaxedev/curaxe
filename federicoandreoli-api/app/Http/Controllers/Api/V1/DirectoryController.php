<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Resources\DirectoryOpenPositionResource;
use App\Http\Resources\DirectoryProfessionalDetailResource;
use App\Http\Resources\DirectoryProfileSummaryResource;
use App\Http\Resources\DirectoryStructureResource;
use App\Models\JobPosting;
use App\Models\Organization;
use App\Models\ProfessionalProfile;
use App\Models\ProfessionalProfileView;
use App\Support\ApiResponse;
use App\Support\DirectoryCache;
use App\Support\ItaliaGeoIndex;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;

class DirectoryController
{
    /** Se il profilo non ha radius_km, copertura operativa di default. */
    private const DEFAULT_PROFILE_COVERAGE_KM = 50.0;

    /**
     * Tetto tecnico = max radius_km consentito in validazione profilo.
     * Non è un limite UX sul cercatore: chi ha raggio 200 può coprire fino a 200 km.
     */
    private const MAX_COVERAGE_KM = 200.0;

    private const COVERAGE_CANDIDATE_LIMIT = 2000;

    private ?ItaliaGeoIndex $geoIndex = null;

    private function geo(): ItaliaGeoIndex
    {
        return $this->geoIndex ??= new ItaliaGeoIndex;
    }

    public function profiles(Request $request): JsonResponse
    {
        $data = $request->validate([
            'intent' => ['nullable', 'in:cerco,offro'],
            'istat' => ['nullable', 'string', 'max:12'],
            'comune' => ['nullable', 'string', 'max:120'],
            'regione' => ['nullable', 'string', 'max:120'],
            'category' => ['nullable', 'string', 'max:40'],
            'q' => ['nullable', 'string', 'max:120'],
            'page' => ['nullable', 'integer', 'min:1'],
            'pageSize' => ['nullable', 'integer', 'min:1', 'max:50'],
        ]);

        $page = (int) ($data['page'] ?? 1);
        $pageSize = (int) ($data['pageSize'] ?? 12);
        $cacheKey = DirectoryCache::profilesKey($data);

        $payload = Cache::remember($cacheKey, DirectoryCache::TTL_SECONDS, function () use ($data, $page, $pageSize) {
            return $this->buildProfilesPayload($data, $page, $pageSize);
        });

        if (isset($payload['data'])) {
            $payload['data'] = array_values(
                $payload['data'] instanceof Collection
                    ? $payload['data']->all()
                    : (array) $payload['data']
            );
        }

        return response()->json($payload);
    }

    /**
     * @param  array{istat?: string, comune?: string, regione?: string, category?: string, q?: string, intent?: string}  $data
     * @return array{data: list<array<string, mixed>>, meta: array<string, mixed>}
     */
    private function buildProfilesPayload(array $data, int $page, int $pageSize): array
    {
        if ($this->hasPlaceQuery($data)) {
            $coverage = $this->collectCoverageMatches($data);
            $merged = $coverage['items'];
            $metaExtra = [
                'geoMode' => $merged->isEmpty() ? 'none' : 'coverage',
                'searchPlace' => $coverage['meta']['searchPlace'] ?? null,
            ];
        } else {
            $merged = $this->collectListingMatches($data);
            $metaExtra = ['geoMode' => 'listing'];
        }

        $total = $merged->count();
        $totalPages = max(1, (int) ceil($total / $pageSize));
        $safePage = min(max(1, $page), $totalPages);
        $slice = $merged->slice(($safePage - 1) * $pageSize, $pageSize)->values();

        return [
            'data' => $slice->all(),
            'meta' => array_filter([
                'total' => $total,
                'page' => $safePage,
                'pageSize' => $pageSize,
                'totalPages' => $totalPages,
                ...$metaExtra,
            ], static fn ($v) => $v !== null),
        ];
    }

    /**
     * @param  array{regione?: string, category?: string, q?: string, intent?: string}  $data
     * @return Collection<int, array<string, mixed>>
     */
    private function collectListingMatches(array $data): Collection
    {
        $profiles = ProfessionalProfile::query()
            ->with('user')
            ->where('is_published', true);
        $this->constrainActiveOwner($profiles);
        $this->applyRegioneExactFilter($profiles, $data);
        $this->applyCategoryAndQ($profiles, $data);

        $orgs = Organization::query()->where('is_published', true);
        $this->constrainActiveOwner($orgs);
        $this->applyOrgRegioneExactFilter($orgs, $data);

        $profileItems = $profiles->orderByDesc('rating_avg')->limit(500)->get();
        $orgItems = ($data['intent'] ?? 'cerco') === 'cerco'
            ? $orgs->orderByDesc('rating_avg')->limit(200)->get()
            : collect();

        return $profileItems
            ->map(fn ($p) => (new DirectoryProfileSummaryResource($p))->resolve())
            ->concat($orgItems->map(fn ($o) => (new DirectoryProfileSummaryResource($o))->resolve()))
            ->values();
    }

    /**
     * Ricerca per comune/istat risolto a coordinate.
     * Solo profili con lat/lng; regola: distance <= radius_km (default 50).
     * Ordinamento: distanza ASC, poi rating. Nessun tetto UX tipo 40 km.
     *
     * @param  array{istat?: string, comune?: string, category?: string, q?: string, intent?: string}  $data
     * @return array{items: Collection<int, array<string, mixed>>, meta: array{searchPlace: string}}
     */
    private function collectCoverageMatches(array $data): array
    {
        $origin = $this->geo()->resolve(
            $data['istat'] ?? null,
            $data['comune'] ?? null,
        );

        if ($origin === null) {
            return [
                'items' => collect(),
                'meta' => ['searchPlace' => trim((string) ($data['comune'] ?? $data['istat'] ?? ''))],
            ];
        }

        // Prefiltro bbox = max raggio profilo consentito (chi può coprire il punto sta dentro).
        $bbox = ItaliaGeoIndex::bbox($origin['lat'], $origin['lng'], self::MAX_COVERAGE_KM);

        $profiles = ProfessionalProfile::query()
            ->with('user')
            ->where('is_published', true)
            ->whereNotNull('lat')
            ->whereNotNull('lng')
            ->whereBetween('lat', [$bbox['minLat'], $bbox['maxLat']])
            ->whereBetween('lng', [$bbox['minLng'], $bbox['maxLng']]);
        $this->constrainActiveOwner($profiles);
        $this->applyCategoryAndQ($profiles, $data);

        $candidates = $profiles->limit(self::COVERAGE_CANDIDATE_LIMIT)->get();

        $items = collect();

        foreach ($candidates as $profile) {
            $distanceKm = ItaliaGeoIndex::haversineKm(
                $origin['lat'],
                $origin['lng'],
                (float) $profile->lat,
                (float) $profile->lng,
            );
            $coverageKm = $profile->radius_km !== null
                ? (float) $profile->radius_km
                : self::DEFAULT_PROFILE_COVERAGE_KM;
            $coverageKm = min($coverageKm, self::MAX_COVERAGE_KM);

            if ($distanceKm > $coverageKm) {
                continue;
            }

            $card = (new DirectoryProfileSummaryResource($profile))->resolve();
            $card['distanceKm'] = round($distanceKm, 1);
            $card['coverageKm'] = $coverageKm;
            $items->push($card);
        }

        if (($data['intent'] ?? 'cerco') === 'cerco') {
            foreach ($this->orgCoverageCandidates($origin, $data) as $card) {
                $items->push($card);
            }
        }

        $sorted = $items
            ->sortBy([
                ['distanceKm', 'asc'],
                ['stars', 'desc'],
            ])
            ->values();

        return [
            'items' => $sorted,
            'meta' => ['searchPlace' => $origin['n']],
        ];
    }

    /**
     * Organizzazioni: solo match su istat esatto o istat risolvibile (no LIKE).
     *
     * @param  array{n: string, lat: float, lng: float, istat: string}  $origin
     * @param  array{category?: string}  $data
     * @return list<array<string, mixed>>
     */
    private function orgCoverageCandidates(array $origin, array $data): array
    {
        $neighborIstats = array_map(
            static fn ($n) => $n['istat'],
            $this->geo()->withinKm($origin['istat'], self::MAX_COVERAGE_KM, 300),
        );
        $neighborIstats[] = $origin['istat'];
        $neighborIstats = array_values(array_unique($neighborIstats));

        $orgs = Organization::query()
            ->where('is_published', true)
            ->whereIn('istat', $neighborIstats);
        $this->constrainActiveOwner($orgs);
        $orgs = $orgs->limit(300)->get();

        $out = [];
        foreach ($orgs as $org) {
            $loc = $this->geo()->byIstat((string) $org->istat);
            if ($loc === null) {
                continue;
            }
            $distanceKm = ItaliaGeoIndex::haversineKm(
                $origin['lat'],
                $origin['lng'],
                $loc['lat'],
                $loc['lng'],
            );
            $coverageKm = self::DEFAULT_PROFILE_COVERAGE_KM;
            if ($distanceKm > $coverageKm) {
                continue;
            }
            $card = (new DirectoryProfileSummaryResource($org))->resolve();
            $card['distanceKm'] = round($distanceKm, 1);
            $card['coverageKm'] = $coverageKm;
            $out[] = $card;
        }

        return $out;
    }

    /**
     * @param  \Illuminate\Database\Eloquent\Builder<\App\Models\ProfessionalProfile>  $query
     * @param  array{category?: string, q?: string}  $data
     */
    private function applyCategoryAndQ($query, array $data): void
    {
        if (! empty($data['category'])) {
            $query->where('category', 'like', '%'.$data['category'].'%');
        }
        if (! empty($data['q'])) {
            $q = $data['q'];
            $query->where(function ($builder) use ($q) {
                $builder->where('first_name', 'like', "%{$q}%")
                    ->orWhere('last_name', 'like', "%{$q}%")
                    ->orWhere('professional_title', 'like', "%{$q}%")
                    ->orWhere('bio', 'like', "%{$q}%");
            });
        }
    }

    private function hasPlaceQuery(array $data): bool
    {
        return trim((string) ($data['istat'] ?? '')) !== ''
            || trim((string) ($data['comune'] ?? '')) !== '';
    }

    /**
     * @param  \Illuminate\Database\Eloquent\Builder<\App\Models\ProfessionalProfile>  $query
     * @param  array{regione?: string}  $data
     */
    private function applyRegioneExactFilter($query, array $data): void
    {
        $regione = trim((string) ($data['regione'] ?? ''));
        if ($regione === '') {
            return;
        }
        $query->where('regione', $regione);
    }

    /**
     * @param  \Illuminate\Database\Eloquent\Builder<\App\Models\Organization>  $query
     * @param  array{regione?: string}  $data
     */
    private function applyOrgRegioneExactFilter($query, array $data): void
    {
        $regione = trim((string) ($data['regione'] ?? ''));
        if ($regione === '') {
            return;
        }
        $query->where('regione', $regione);
    }

    public function showProfile(Request $request, string $id): JsonResponse
    {
        $profile = ProfessionalProfile::query()
            ->with('user')
            ->where('is_published', true)
            ->where('user_id', $id);
        $this->constrainActiveOwner($profile);
        $profile = $profile->first();

        if ($profile === null) {
            return ApiResponse::error('Profilo non trovato.', 404, [], 'not_found');
        }

        $this->recordProfileView($request, $profile);

        return (new DirectoryProfessionalDetailResource($profile))
            ->response()
            ->setStatusCode(200);
    }

    private function recordProfileView(Request $request, ProfessionalProfile $profile): void
    {
        try {
            $viewer = $request->user('sanctum');
            if ($viewer !== null && (int) $viewer->id === (int) $profile->user_id) {
                return;
            }

            $viewerKey = $viewer !== null
                ? 'u:'.$viewer->id
                : 'a:'.hash('sha256', $request->ip().'|'.substr((string) $request->userAgent(), 0, 160));

            ProfessionalProfileView::query()->firstOrCreate(
                [
                    'professional_profile_id' => $profile->id,
                    'viewer_key' => $viewerKey,
                    'viewed_on' => now()->toDateString(),
                ],
                [
                    'viewer_user_id' => $viewer?->id,
                ],
            );
        } catch (\Throwable) {
            // Best-effort
        }
    }

    public function showStructure(string $id): JsonResponse
    {
        $numericId = str_starts_with($id, 'org-') ? substr($id, 4) : $id;

        $org = Organization::query()
            ->where('is_published', true)
            ->where(function ($q) use ($id, $numericId) {
                $q->where('id', $numericId)->orWhere('slug', $id);
            });
        $this->constrainActiveOwner($org);
        $org = $org->first();

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
        $cacheKey = DirectoryCache::openPositionsKey($data);

        $payload = Cache::remember($cacheKey, DirectoryCache::TTL_SECONDS, function () use ($data, $page, $pageSize) {
            $query = JobPosting::query()
                ->where('status', 'active')
                ->whereNotNull('published_at');
            $this->constrainActiveOwner($query);

            if (! empty($data['citta'])) {
                $place = $this->geo()->byName((string) $data['citta']);
                if ($place !== null) {
                    $query->where('comune', $place['n']);
                } else {
                    $query->whereRaw('1 = 0');
                }
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
            ->where('id', $id);
        $this->constrainActiveOwner($job);
        $job = $job->first();

        if ($job === null) {
            return ApiResponse::error('Posizione non trovata.', 404, [], 'not_found');
        }

        return (new DirectoryOpenPositionResource($job))
            ->response()
            ->setStatusCode(200);
    }

    /**
     * Esclude contenuti di account sospesi o senza utente (hard-delete).
     *
     * @param  \Illuminate\Database\Eloquent\Builder<\Illuminate\Database\Eloquent\Model>  $query
     */
    private function constrainActiveOwner($query): void
    {
        $query->whereHas('user', static function ($q): void {
            $q->whereNull('suspended_at');
        });
    }
}
