<?php

namespace App\Http\Controllers\Api\V1;

use App\Domains\Auth\Enums\AuthChannel;
use App\Domains\Auth\Services\AuthChannelResolver;
use App\Mail\Auth\PasswordResetMail;
use App\Models\User;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class PasswordResetController
{
    private const TTL_MINUTES = 60;

    /**
     * Invia l'email con il link di reimpostazione. 202 anche per email
     * sconosciute (niente enumerazione account).
     */
    public function request(Request $request, AuthChannelResolver $resolver): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email:rfc'],
        ]);

        $email = strtolower(trim($data['email']));
        $user = User::query()->where('email', $email)->first();

        if ($user !== null && $resolver->channelForRole($user->role) === AuthChannel::OtpEmail) {
            return ApiResponse::error(
                'Questo account usa il codice via email. Accedi dalla pagina di login con OTP.',
                422,
                [],
                'otp_only_account',
            );
        }

        if ($user !== null) {
            $token = Str::random(64);

            DB::table('password_reset_tokens')->updateOrInsert(
                ['email' => $email],
                ['token' => Hash::make($token), 'created_at' => now()],
            );

            $resetUrl = config('app.frontend_url')
                .'/reimposta-password?token='.$token
                .'&email='.urlencode($email);

            Mail::to($user->email)->send(new PasswordResetMail($resetUrl, self::TTL_MINUTES));
        }

        return ApiResponse::accepted('Se l’indirizzo è registrato, riceverai un’email con le istruzioni.');
    }

    public function validateToken(Request $request): JsonResponse
    {
        $data = $request->validate([
            'token' => ['required', 'string'],
            'email' => ['required', 'email:rfc'],
        ]);

        $payload = $this->resolveTokenPayload($data['email'], $data['token']);
        if ($payload instanceof JsonResponse) {
            return $payload;
        }

        return response()->json($payload);
    }

    public function confirm(Request $request): JsonResponse
    {
        $data = $request->validate([
            'token' => ['required', 'string'],
            'email' => ['required', 'email:rfc'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $payload = $this->resolveTokenPayload($data['email'], $data['token']);
        if ($payload instanceof JsonResponse) {
            return $payload;
        }

        $email = strtolower(trim($data['email']));

        /** @var User $user */
        $user = User::query()->where('email', $email)->firstOrFail();
        $user->forceFill(['password' => $data['password']])->save();

        // Revoca ogni sessione attiva: la password è cambiata.
        $user->tokens()->delete();

        DB::table('password_reset_tokens')->where('email', $email)->delete();

        return ApiResponse::noContent();
    }

    /**
     * @return array{email: string, expiresAt: string}|JsonResponse
     */
    private function resolveTokenPayload(string $email, string $token): array|JsonResponse
    {
        $email = strtolower(trim($email));

        $row = DB::table('password_reset_tokens')->where('email', $email)->first();
        if ($row === null || ! Hash::check(trim($token), $row->token)) {
            return ApiResponse::error(
                'Link di reimpostazione non valido o già usato.',
                422,
                [],
                'token_invalid',
            );
        }

        $expiresAt = Carbon::parse($row->created_at)->addMinutes(self::TTL_MINUTES);
        if ($expiresAt->isPast()) {
            DB::table('password_reset_tokens')->where('email', $email)->delete();

            return ApiResponse::error(
                'Il link è scaduto. Richiedi una nuova email.',
                422,
                [],
                'token_expired',
            );
        }

        return [
            'email' => $email,
            'expiresAt' => $expiresAt->toIso8601String(),
        ];
    }
}
