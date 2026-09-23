<?php

namespace App\Http\Controllers\Api\V1;

use App\Domains\Auth\Enums\UserRole;
use App\Http\Resources\ApplicationResource;
use App\Http\Resources\FamilyRequestResource;
use App\Models\Application;
use App\Models\FamilyRequest;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FamilyRequestController
{
    private const FREE_PLAN_MAX_ACTIVE = 1;

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        if ($user->role !== UserRole::PublicUser) {
            return ApiResponse::error('Solo le famiglie possono gestire le richieste.', 403, [], 'forbidden');
        }

        $requests = FamilyRequest::query()
            ->withCount('applications')
            ->where('user_id', $user->id)
            ->orderByDesc('id')
            ->get();

        $applications = Application::query()
            ->where('owner_id', $user->id)
            ->where('target_type', 'family_request')
            ->orderByDesc('id')
            ->get()
            ->map(fn (Application $app) => (new ApplicationResource($app))->toFamilyApplication())
            ->values();

        return response()->json([
            'requests' => FamilyRequestResource::collection($requests)->resolve(),
            'applications' => $applications,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $user = $request->user();
        if ($user->role !== UserRole::PublicUser) {
            return ApiResponse::error('Solo le famiglie possono creare richieste.', 403, [], 'forbidden');
        }

        $data = $request->validate([
            'assistanceType' => ['required', 'in:badante,oss,infermiere,family_assistant,other'],
            'beneficiary' => ['required', 'in:self_sufficient_elderly,non_autosufficient_elderly,disabled,post_surgery,other'],
            'employmentType' => ['required', 'in:live_in,hourly,part_time,weekend,night_only'],
            'comune' => ['required', 'string', 'max:120'],
            'budgetMonthly' => ['nullable', 'integer', 'min:0', 'max:20000'],
            'days' => ['required', 'array', 'min:1'],
            'days.*' => ['string', 'max:20'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'asDraft' => ['nullable', 'boolean'],
        ]);

        $asDraft = (bool) ($data['asDraft'] ?? false);
        $status = $asDraft ? 'draft' : 'active';

        if ($status === 'active') {
            $activeCount = FamilyRequest::query()
                ->where('user_id', $user->id)
                ->where('status', 'active')
                ->count();
            if ($activeCount >= self::FREE_PLAN_MAX_ACTIVE) {
                return ApiResponse::error(
                    'Hai già una richiesta attiva. Mettila in pausa o chiudila prima di pubblicarne un’altra.',
                    422,
                    [],
                    'plan_limit',
                );
            }
        }

        $title = match ($data['assistanceType']) {
            'badante' => 'Cerco badante',
            'oss' => 'Cerco OSS',
            'infermiere' => 'Cerco infermiere',
            'family_assistant' => 'Cerco assistente familiare',
            default => 'Cerco assistenza',
        }.' — '.$data['comune'];

        $familyRequest = FamilyRequest::query()->create([
            'user_id' => $user->id,
            'title' => $title,
            'status' => $status,
            'assistance_type' => $data['assistanceType'],
            'beneficiary' => $data['beneficiary'],
            'employment_type' => $data['employmentType'],
            'comune' => $data['comune'],
            'budget_monthly' => $data['budgetMonthly'] ?? null,
            'days' => $data['days'],
            'notes' => $data['notes'] ?? '',
        ]);

        return (new FamilyRequestResource($familyRequest->loadCount('applications')))
            ->response()
            ->setStatusCode(201);
    }

    public function updateStatus(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $data = $request->validate([
            'status' => ['required', 'in:active,paused,closed,draft'],
        ]);

        $familyRequest = FamilyRequest::query()->where('user_id', $user->id)->find($id);
        if ($familyRequest === null) {
            return ApiResponse::error('Richiesta non trovata.', 404, [], 'not_found');
        }

        if ($data['status'] === 'active' && $familyRequest->status !== 'active') {
            $activeCount = FamilyRequest::query()
                ->where('user_id', $user->id)
                ->where('status', 'active')
                ->where('id', '!=', $familyRequest->id)
                ->count();
            if ($activeCount >= self::FREE_PLAN_MAX_ACTIVE) {
                return ApiResponse::error(
                    'Hai già una richiesta attiva.',
                    422,
                    [],
                    'plan_limit',
                );
            }
        }

        $familyRequest->status = $data['status'];
        $familyRequest->save();

        return (new FamilyRequestResource($familyRequest->loadCount('applications')))
            ->response()
            ->setStatusCode(200);
    }

    public function applications(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $familyRequest = FamilyRequest::query()->where('user_id', $user->id)->find($id);
        if ($familyRequest === null) {
            return ApiResponse::error('Richiesta non trovata.', 404, [], 'not_found');
        }

        $apps = Application::query()
            ->where('target_type', 'family_request')
            ->where('target_id', $id)
            ->orderByDesc('id')
            ->get()
            ->map(fn (Application $app) => (new ApplicationResource($app))->toFamilyApplication())
            ->values();

        return response()->json($apps);
    }
}
