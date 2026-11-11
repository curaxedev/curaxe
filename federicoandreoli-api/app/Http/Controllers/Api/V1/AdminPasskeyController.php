<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Resources\UserResource;
use App\Models\AdminSecuritySetting;
use App\Services\Auth\AdminEnrollOtpService;
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
        private readonly AdminEnrollOtpService $enrollOtp,
    ) {}

    public function index(Request $request): JsonResponse
    {
        return response()->json(['passkeys' => $this->passkeys->list($request->user())]);
    }

    public function sendEnrollOtp(Request $request): JsonResponse
    {
        try {
            $result = $this->enrollOtp->send($request->user());
        } catch (\InvalidArgumentException $e) {
            return ApiResponse::error($e->getMessage(), 422, [], 'enroll_otp_error');
        }

        return response()->json($result);
    }

    public function verifyEnrollOtp(Request $request): JsonResponse
    {
        $data = $request->validate([
            'code' => ['required', 'string', 'max:32'],
        ]);

        try {
            $result = $this->enrollOtp->verify($request->user(), $data['code']);
        } catch (\InvalidArgumentException $e) {
            return ApiResponse::error($e->getMessage(), 422, [], 'enroll_otp_invalid');
        }

        return response()->json($result);
    }

    public function beginRegister(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'password' => ['nullable', 'string', 'max:255'],
        ]);

        $isFirst = $this->stepUp->passkeyCount($request->user()) === 0;

        try {
            $this->stepUp->requireForPasskeyManage(
                $request,
                isFirstRegistration: $isFirst,
                allowEnrollOtp: ! $isFirst,
            );
            $result = $this->passkeys->beginRegistration($request->user(), $data['name']);
        } catch (HttpException $e) {
            $code = str_contains($e->getMessage(), 'notifica')
                ? 'enroll_otp_required'
                : 'step_up_required';

            return response()->json([
                'message' => $e->getMessage(),
                'error_code' => $code,
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
            $enroll = $request->headers->get('X-Passkey-Enroll-Token');
            if (is_string($enroll) && $enroll !== '') {
                $this->enrollOtp->consumeEnrollToken($request->user(), $enroll);
            }
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
            $user = $request->user();
            $passwordOff = ! AdminSecuritySetting::forUser($user)->password_login_enabled;
            $this->passkeys->delete(
                $user,
                (int) $id,
                $this->stepUp->securityTotalEnabled($user) || $passwordOff,
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
