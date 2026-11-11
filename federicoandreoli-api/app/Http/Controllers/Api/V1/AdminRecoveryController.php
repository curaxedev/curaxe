<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Resources\UserResource;
use App\Services\Auth\AdminPasskeyService;
use App\Services\Auth\AdminRecoveryService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use InvalidArgumentException;

class AdminRecoveryController
{
    public function __construct(
        private readonly AdminRecoveryService $recovery,
        private readonly AdminPasskeyService $passkeys,
    ) {}

    public function loginOptions(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email:rfc'],
        ]);

        return response()->json(
            $this->recovery->loginOptionsForEmail($data['email']),
        );
    }

    public function redeemCode(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email:rfc'],
            'code' => ['required', 'string', 'max:64'],
        ]);

        try {
            $result = $this->recovery->redeemRecoveryCode($data['email'], $data['code'], $request);
        } catch (InvalidArgumentException $e) {
            return ApiResponse::error($e->getMessage(), 422, [], 'recovery_invalid');
        }

        return response()->json([
            'token' => $result['token'],
            'user' => new UserResource($result['user']),
            'recoverySession' => true,
        ]);
    }

    public function requestEmail(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email:rfc'],
        ]);

        $this->recovery->requestEmailBreakGlass($data['email'], $request);

        return ApiResponse::accepted(
            'Se l’account è idoneo, abbiamo inviato un codice alle email di notifica accesso.',
        );
    }

    public function redeemEmail(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email:rfc'],
            'token' => ['required', 'string', 'max:128'],
        ]);

        try {
            $result = $this->recovery->redeemEmailToken($data['email'], $data['token'], $request);
        } catch (InvalidArgumentException $e) {
            return ApiResponse::error($e->getMessage(), 422, [], 'recovery_invalid');
        }

        return response()->json([
            'token' => $result['token'],
            'user' => new UserResource($result['user']),
            'recoverySession' => true,
        ]);
    }

    public function beginRegisterPasskey(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
        ]);

        try {
            $result = $this->passkeys->beginRegistration($request->user(), $data['name']);
        } catch (InvalidArgumentException $e) {
            return ApiResponse::error($e->getMessage(), 422, [], 'passkey_error');
        }

        return response()->json($result);
    }

    public function completeRegisterPasskey(Request $request): JsonResponse
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
        } catch (InvalidArgumentException $e) {
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

    public function reenablePassword(Request $request): JsonResponse
    {
        try {
            $this->recovery->reenablePassword($request->user());
        } catch (InvalidArgumentException $e) {
            return ApiResponse::error($e->getMessage(), 422, [], 'recovery_error');
        }

        // Dopo riattivazione password, invalida la recovery session: l'utente deve rifare login.
        $request->user()?->currentAccessToken()?->delete();

        return response()->json([
            'passwordLoginEnabled' => true,
            'message' => 'Accesso password riattivato. Accedi di nuovo con password o passkey.',
        ]);
    }
}
