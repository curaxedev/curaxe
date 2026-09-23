<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Resources\UserResource;
use App\Services\Auth\AdminPasskeyService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminPasskeyController
{
    public function __construct(
        private readonly AdminPasskeyService $passkeys,
    ) {}

    public function index(Request $request): JsonResponse
    {
        return response()->json(['passkeys' => $this->passkeys->list($request->user())]);
    }

    public function beginRegister(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
        ]);

        try {
            $result = $this->passkeys->beginRegistration($request->user(), $data['name']);
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
        ], 201);
    }

    public function rename(Request $request, string $id): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
        ]);

        try {
            $passkey = $this->passkeys->rename($request->user(), (int) $id, $data['name']);
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
            $this->passkeys->delete($request->user(), (int) $id);
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
        } catch (\InvalidArgumentException $e) {
            return ApiResponse::error($e->getMessage(), 422, [], 'passkey_error');
        }

        return response()->json([
            'token' => $result['token'],
            'user' => new UserResource($result['user']),
        ]);
    }
}
