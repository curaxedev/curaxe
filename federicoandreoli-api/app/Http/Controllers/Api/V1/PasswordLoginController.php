<?php

namespace App\Http\Controllers\Api\V1;

use App\Domains\Auth\Enums\AuthChannel;
use App\Domains\Auth\Services\AuthChannelResolver;
use App\Domains\Auth\Services\Totp;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class PasswordLoginController
{
    public function login(Request $request, AuthChannelResolver $resolver, Totp $totp): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email:rfc'],
            'password' => ['required', 'string'],
            'totp_code' => ['nullable', 'string', 'size:6'],
        ]);

        $email = strtolower(trim($data['email']));
        $user = User::query()->where('email', $email)->first();

        if ($user !== null && $resolver->channelForRole($user->role) === AuthChannel::OtpEmail) {
            return ApiResponse::error(
                'Questo account usa il codice via email. Torna indietro e scegli OTP.',
                422,
                [],
                'otp_only',
            );
        }

        // Messaggio identico per email sconosciuta e password errata: niente enumerazione.
        if ($user === null || $user->password === null || ! Hash::check($data['password'], $user->password)) {
            return ApiResponse::error('Credenziali non corrette.', 422, [], 'password_invalid');
        }

        if ($user->totp_secret !== null) {
            $code = trim((string) ($data['totp_code'] ?? ''));
            if ($code === '') {
                return ApiResponse::error(
                    'Inserisci il codice di verifica a 6 cifre della tua app authenticator.',
                    422,
                    [],
                    'totp_required',
                );
            }
            if (! $totp->verify($user->totp_secret, $code)) {
                return ApiResponse::error('Codice di verifica non valido.', 422, [], 'totp_invalid');
            }
        }

        $token = $user->createToken('spa')->plainTextToken;

        return response()->json([
            'token' => $token,
            'user' => new UserResource($user),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()?->currentAccessToken()?->delete();

        return ApiResponse::noContent();
    }
}
