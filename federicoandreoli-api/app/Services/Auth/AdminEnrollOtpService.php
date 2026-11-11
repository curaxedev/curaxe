<?php

namespace App\Services\Auth;

use App\Domains\Auth\Enums\UserRole;
use App\Mail\Auth\AdminEnrollOtpMail;
use App\Models\AdminSecuritySetting;
use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use InvalidArgumentException;

/**
 * OTP alle email di notifica accesso per registrare una nuova passkey
 * senza assertion della passkey già esistente (altro dispositivo).
 */
final class AdminEnrollOtpService
{
    private const OTP_TTL_MINUTES = 10;

    private const ENROLL_TOKEN_TTL_MINUTES = 5;

    public function send(User $user): array
    {
        $this->assertAdmin($user);
        $settings = AdminSecuritySetting::forUser($user);
        $emails = $settings->alertEmails();
        if ($emails === []) {
            throw new InvalidArgumentException(
                'Configura almeno un’email di notifica accesso in Sicurezza prima di aggiungere una passkey da un altro dispositivo.',
            );
        }

        $code = (string) random_int(10000000, 99999999);
        $challengeId = Str::random(32);

        cache()->put($this->otpKey($user->id), [
            'hash' => Hash::make($code),
            'challenge_id' => $challengeId,
            'attempts' => 0,
        ], now()->addMinutes(self::OTP_TTL_MINUTES));

        foreach ($emails as $email) {
            Mail::to($email)->send(new AdminEnrollOtpMail(
                adminName: $user->name ?: $user->email,
                code: $code,
                ttlMinutes: self::OTP_TTL_MINUTES,
            ));
        }

        AuditLog::record($user->id, 'passkey.enroll_otp.sent', User::class, (string) $user->id, [
            'email_count' => count($emails),
        ]);

        return [
            'sent' => true,
            'emailCount' => count($emails),
            'expiresInMinutes' => self::OTP_TTL_MINUTES,
        ];
    }

    /**
     * @return array{token: string, expiresAt: string}
     */
    public function verify(User $user, string $code): array
    {
        $this->assertAdmin($user);
        $code = preg_replace('/\s+/', '', trim($code)) ?? '';
        $stored = cache()->get($this->otpKey($user->id));
        if (! is_array($stored) || ! isset($stored['hash'])) {
            throw new InvalidArgumentException('Codice scaduto o non richiesto. Richiedine uno nuovo.');
        }

        $attempts = (int) ($stored['attempts'] ?? 0);
        if ($attempts >= 5) {
            cache()->forget($this->otpKey($user->id));
            throw new InvalidArgumentException('Troppi tentativi. Richiedi un nuovo codice.');
        }

        if (! Hash::check($code, (string) $stored['hash'])) {
            $stored['attempts'] = $attempts + 1;
            cache()->put($this->otpKey($user->id), $stored, now()->addMinutes(self::OTP_TTL_MINUTES));
            throw new InvalidArgumentException('Codice non valido.');
        }

        cache()->forget($this->otpKey($user->id));

        $token = Str::random(64);
        $expiresAt = now()->addMinutes(self::ENROLL_TOKEN_TTL_MINUTES);
        cache()->put($this->enrollTokenKey($token), [
            'user_id' => $user->id,
            'exp' => $expiresAt->timestamp,
        ], $expiresAt);

        AuditLog::record($user->id, 'passkey.enroll_otp.verified', User::class, (string) $user->id);

        return [
            'token' => $token,
            'expiresAt' => $expiresAt->toIso8601String(),
        ];
    }

    public function validateEnrollToken(User $user, ?string $token): bool
    {
        if ($token === null || $token === '') {
            return false;
        }

        $key = $this->enrollTokenKey($token);
        $stored = cache()->get($key);
        if (! is_array($stored)) {
            return false;
        }
        if ((int) ($stored['exp'] ?? 0) < now()->timestamp) {
            cache()->forget($key);

            return false;
        }
        if ((int) ($stored['user_id'] ?? 0) !== (int) $user->id) {
            cache()->forget($key);

            return false;
        }

        return true;
    }

    public function consumeEnrollToken(User $user, ?string $token): bool
    {
        if (! $this->validateEnrollToken($user, $token)) {
            return false;
        }

        cache()->forget($this->enrollTokenKey((string) $token));

        return true;
    }

    private function assertAdmin(User $user): void
    {
        if ($user->role !== UserRole::PlatformAdmin) {
            throw new InvalidArgumentException('Solo l’amministratore piattaforma.');
        }
    }

    private function otpKey(int $userId): string
    {
        return "admin-passkey-enroll-otp:{$userId}";
    }

    private function enrollTokenKey(string $token): string
    {
        return 'admin-passkey-enroll-token:'.hash('sha256', $token);
    }
}
