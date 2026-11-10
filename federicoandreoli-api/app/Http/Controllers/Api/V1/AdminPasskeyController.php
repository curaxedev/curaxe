<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Resources\UserResource;
use App\Services\Auth\AdminLoginAlertService;
use App\Services\Auth\AdminPasskeyService;
use App\Services\Auth\AdminStepUpService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\HttpException;

class AdminPasskeyController
{
    public function __construct(
        private readonly AdminPasskeyService $passkeys,
        private readonly AdminStepUpService $stepUp,
        private readonly AdminLoginAlertService $loginAlerts,
    ) {}

    public function index(Request $request): JsonResponse
    {
        return response()->json(['passkeys' => $this->passkeys->list($request->user())]);
    }

    public function beginRegister(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'password' => ['nullable', 'string', 'max:255'],
        ]);

        try {
            $this->stepUp->requireForPasskeyManage($request, isFirstRegistration: true);
            $result = $this->passkeys->beginRegistration($request->user(), $data['name']);
        } catch (HttpException $e) {
            return response()->json([
                'message' => $e->getMessage(),
                'error_code' => 'step_up_required',
                'action' => 'passkey.manage',
            ], $e->getStatusCode());
        } catch (\InvalidArgumentException $e) {
            return ApiResponse::error($e->getMessage(), 422, [], 'passkey_error');
        }

        return response()->json($result);
    }

    public function completeRegister(Request $request): JsonResponse
    {
        $data = $request->validate([
            'challengeId' => ['required', 'string', 'max:64'],
            'credential' => ['required', 'array'],
        ]);

        try {
            $passkey = $this->passkeys->completeRegistration(
                $request->user(),
                $data['challengeId'],
                $data['credential'],
            );
        } catch (\InvalidArgumentException $e) {
            return ApiResponse::error($e->getMessage(), 422, [], 'passkey_error');
        }

        return response()->json([
            'id' => (string) $passkey->id,
            'name' => $passkey->name,
            'createdAt' => $passkey->created_at?->toIso8601String(),
            'lastUsedAt' => null,
            'transports' => $passkey->transports ?? [],
            'aaguid' => $passkey->aaguid,
        ], 201);
    }

    public function rename(Request $request, string $id): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
        ]);

        try {
            $this->stepUp->requireForPasskeyManage($request);
            $passkey = $this->passkeys->rename($request->user(), (int) $id, $data['name']);
        } catch (HttpException $e) {
            return response()->json([
                'message' => $e->getMessage(),
                'error_code' => 'step_up_required',
                'action' => 'passkey.manage',
            ], $e->getStatusCode());
        } catch (\InvalidArgumentException $e) {
            return ApiResponse::error($e->getMessage(), 422, [], 'passkey_error');
        }

        return response()->json([
            'id' => (string) $passkey->id,
            'name' => $passkey->name,
        ]);
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        try {
            $this->stepUp->requireForPasskeyManage($request);
            $this->passkeys->delete(
                $request->user(),
                (int) $id,
                $this->stepUp->securityTotalEnabled($request->user()),
            );
        } catch (HttpException $e) {
            return response()->json([
                'message' => $e->getMessage(),
                'error_code' => 'step_up_required',
                'action' => 'passkey.manage',
            ], $e->getStatusCode());
        } catch (\InvalidArgumentException $e) {
            return ApiResponse::error($e->getMessage(), 422, [], 'passkey_error');
        }

        return ApiResponse::noContent();
    }

    public function beginLogin(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email:rfc'],
        ]);

        try {
            $result = $this->passkeys->beginAuthentication($data['email']);
        } catch (\InvalidArgumentException $e) {
            return ApiResponse::error($e->getMessage(), 422, [], 'passkey_error');
        }

        return response()->json($result);
    }

    public function completeLogin(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email:rfc'],
            'challengeId' => ['required', 'string', 'max:64'],
            'credential' => ['required', 'array'],
        ]);

        try {
            $result = $this->passkeys->completeAuthentication(
                $data['email'],
                $data['challengeId'],
                $data['credential'],
            );
            $this->loginAlerts->recordLogin($result['user'], $request, 'passkey', 'success');
        } catch (\InvalidArgumentException $e) {
            $user = \App\Models\User::query()->where('email', strtolower(trim($data['email'])))->first();
            if ($user) {
                $outcome = str_contains($e->getMessage(), 'sospeso') ? 'blocked' : 'failed';
                if ($outcome === 'blocked') {
                    $this->loginAlerts->recordLogin($user, $request, 'passkey', 'blocked');
                } else {
                    $this->loginAlerts->recordFailedAttempt($user, $request, 'passkey', $e->getMessage());
                }
            }

            return ApiResponse::error($e->getMessage(), 422, [], 'passkey_error');
        }

        return response()->json([
            'token' => $result['token'],
            'user' => new UserResource($result['user']),
        ]);
    }
}
