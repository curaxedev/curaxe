<?php

namespace App\Domains\Auth\Services;

use App\Models\LoginOtp;
use Illuminate\Support\Facades\Hash;

final class OtpService
{
    public const TTL_MINUTES = 10;

    public const MAX_ATTEMPTS = 5;

    /**
     * Genera un nuovo codice per l'email, invalidando quelli precedenti.
     * Ritorna il codice in chiaro (da inviare via email, mai loggato).
     */
    public function issue(string $email): string
    {
        $email = strtolower(trim($email));
        $code = (string) random_int(100000, 999999);

        LoginOtp::query()
            ->where('email', $email)
            ->whereNull('consumed_at')
            ->update(['consumed_at' => now()]);

        LoginOtp::query()->create([
            'email' => $email,
            'code_hash' => Hash::make($code),
            'expires_at' => now()->addMinutes(self::TTL_MINUTES),
        ]);

        return $code;
    }

    /**
     * Verifica il codice. Ritorna l'esito come stringa macchina:
     * `ok`, `not_requested`, `expired`, `invalid`, `too_many_attempts`.
     */
    public function verify(string $email, string $code): string
    {
        $email = strtolower(trim($email));

        /** @var LoginOtp|null $otp */
        $otp = LoginOtp::query()
            ->where('email', $email)
            ->whereNull('consumed_at')
            ->latest('id')
            ->first();

        if ($otp === null) {
            return 'not_requested';
        }

        if ($otp->expires_at->isPast()) {
            $otp->update(['consumed_at' => now()]);

            return 'expired';
        }

        if ($otp->attempts >= self::MAX_ATTEMPTS) {
            $otp->update(['consumed_at' => now()]);

            return 'too_many_attempts';
        }

        if (! Hash::check(trim($code), $otp->code_hash)) {
            $otp->increment('attempts');

            return 'invalid';
        }

        $otp->update(['consumed_at' => now()]);

        return 'ok';
    }
}
