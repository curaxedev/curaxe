<?php

namespace App\Domains\Auth\Services;

/**
 * Verifica codici TOTP (RFC 6238, SHA-1, 6 cifre, periodo 30s).
 *
 * Implementazione locale volutamente minimale: evita una dipendenza esterna
 * per il solo secondo fattore. Segreti in formato Base32 (compatibile con
 * Google Authenticator / Authy / 1Password).
 */
final class Totp
{
    private const PERIOD_SECONDS = 30;

    private const DIGITS = 6;

    /** Finestra di tolleranza: codice corrente ± 1 periodo (clock skew). */
    private const WINDOW = 1;

    public function verify(string $base32Secret, string $code, ?int $timestamp = null): bool
    {
        $secret = self::base32Decode($base32Secret);
        if ($secret === '' || ! preg_match('/^\d{'.self::DIGITS.'}$/', $code)) {
            return false;
        }

        $timestamp ??= time();
        $counter = intdiv($timestamp, self::PERIOD_SECONDS);

        for ($offset = -self::WINDOW; $offset <= self::WINDOW; $offset++) {
            if (hash_equals(self::hotp($secret, $counter + $offset), $code)) {
                return true;
            }
        }

        return false;
    }

    public static function generateSecret(): string
    {
        $alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
        $secret = '';
        for ($i = 0; $i < 32; $i++) {
            $secret .= $alphabet[random_int(0, 31)];
        }

        return $secret;
    }

    /** Genera il codice per un istante dato (usato nei test). */
    public function codeAt(string $base32Secret, int $timestamp): string
    {
        return self::hotp(self::base32Decode($base32Secret), intdiv($timestamp, self::PERIOD_SECONDS));
    }

    private static function hotp(string $binarySecret, int $counter): string
    {
        $binaryCounter = pack('N*', 0).pack('N*', $counter);
        $hash = hash_hmac('sha1', $binaryCounter, $binarySecret, true);
        $offset = ord(substr($hash, -1)) & 0x0F;
        $value = (
            ((ord($hash[$offset]) & 0x7F) << 24) |
            ((ord($hash[$offset + 1]) & 0xFF) << 16) |
            ((ord($hash[$offset + 2]) & 0xFF) << 8) |
            (ord($hash[$offset + 3]) & 0xFF)
        ) % (10 ** self::DIGITS);

        return str_pad((string) $value, self::DIGITS, '0', STR_PAD_LEFT);
    }

    private static function base32Decode(string $input): string
    {
        $alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
        $input = strtoupper(rtrim($input, '='));
        $bits = '';
        foreach (str_split($input) as $char) {
            $index = strpos($alphabet, $char);
            if ($index === false) {
                return '';
            }
            $bits .= str_pad(decbin($index), 5, '0', STR_PAD_LEFT);
        }

        $output = '';
        foreach (str_split($bits, 8) as $byte) {
            if (strlen($byte) === 8) {
                $output .= chr((int) bindec($byte));
            }
        }

        return $output;
    }
}
