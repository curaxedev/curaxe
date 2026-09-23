<?php

namespace App\Http\Controllers\Api\V1;

use App\Domains\Auth\Enums\AuthChannel;
use App\Domains\Auth\Services\AuthChannelResolver;
use App\Domains\Auth\Services\OtpService;
use App\Http\Resources\UserResource;
use App\Mail\Auth\LoginOtpMail;
use App\Models\User;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;

class EmailOtpAuthController
{
    /**
     * Richiesta codice OTP. Risponde 202 anche per email sconosciute
     * (niente enumerazione degli account privati).
     */
    public function request(Request $request, AuthChannelResolver $resolver, OtpService $otps): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email:rfc'],
        ]);

        $email = strtolower(trim($data['email']));
        $user = User::query()->where('email', $email)->first();

        if ($user !== null && $resolver->channelForRole($user->role) !== AuthChannel::OtpEmail) {
            return ApiResponse::error(
                'Questo account richiede accesso con password. Scegli «Inserisci password».',
                422,
                ['email' => ['Questo account richiede accesso con password.']],
                'password_required',
            );
        }

        if ($user !== null) {
            $code = $otps->issue($email);
            Mail::to($user->email)->send(new LoginOtpMail($code));
        }

        return ApiResponse::accepted('Se l’indirizzo è registrato, riceverai un codice a breve.');
    }

    /**
     * Verifica codice OTP e rilascio del Bearer token Sanctum.
     */
    public function verify(Request $request, OtpService $otps): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email:rfc'],
            'code' => ['required', 'string', 'size:6'],
        ]);

        $email = strtolower(trim($data['email']));

        $result = $otps->verify($email, $data['code']);

        if ($result === 'not_requested') {
            return ApiResponse::error('Richiedi prima un nuovo codice.', 422, [], 'otp_invalid');
        }
        if ($result === 'expired' || $result === 'too_many_attempts') {
            return ApiResponse::error('Il codice è scaduto. Inviane uno nuovo.', 422, [], 'otp_expired');
        }
        if ($result === 'invalid') {
            return ApiResponse::error('Codice non valido. Controlla e riprova.', 422, [], 'otp_invalid');
        }

        $user = User::query()->where('email', $email)->first();
        if ($user === null) {
            return ApiResponse::error('Nessun account registrato con questa email.', 422, [], 'email_not_found');
        }

        // Il codice OTP ricevuto via email prova il possesso dell'indirizzo.
        if ($user->email_verified_at === null) {
            $user->forceFill(['email_verified_at' => now()])->save();
        }

        $token = $user->createToken('spa')->plainTextToken;

        return response()->json([
            'token' => $token,
            'user' => new UserResource($user),
        ]);
    }
}
