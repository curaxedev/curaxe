<?php

namespace App\Services\Auth;

use App\Domains\Auth\Enums\UserRole;
use App\Mail\Auth\AdminRecoveryAlertMail;
use App\Mail\Auth\AdminRecoveryEmailTokenMail;
use App\Models\AdminRecoveryCode;
use App\Models\AdminRecoveryEmailToken;
use App\Models\AdminSecuritySetting;
use App\Models\AuditLog;
use App\Models\User;
use App\Models\WebauthnCredential;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use InvalidArgumentException;

/**
 * Recovery admin: codici offline monouso + break-glass email.
 * Emette token Sanctum ability-scoped `admin.recovery`.
 */
final class AdminRecoveryService
{
    public const ABILITY = 'admin.recovery';

    private const CODE_COUNT = 10;

    private const EMAIL_TOKEN_TTL_MINUTES = 20;

    /**
     * @return list<string> plaintext codes (mostrare una sola volta)
     */
    public function regenerateCodes(User $user): array
    {
        $this->assertAdmin($user);

        AdminRecoveryCode::query()->where('user_id', $user->id)->delete();

        $plain = [];
        for ($i = 0; $i < self::CODE_COUNT; $i++) {
            $code = $this->formatCode(Str::upper(Str::random(12)));
            $plain[] = $code;
            AdminRecoveryCode::query()->create([
                'user_id' => $user->id,
                'code_hash' => Hash::make($this->normalizeCode($code)),
            ]);
        }

        $settings = AdminSecuritySetting::forUser($user);
        $settings->recovery_codes_generated_at = now();
        $settings->save();

        AuditLog::record($user->id, 'security.recovery_codes.generated', User::class, (string) $user->id, [
            'count' => self::CODE_COUNT,
        ]);

        return $plain;
    }

    public function unusedCodeCount(User $user): int
    {
        return AdminRecoveryCode::query()
            ->where('user_id', $user->id)
            ->whereNull('used_at')
            ->count();
    }

    /**
     * @return array{token: string, user: User}
     */
    public function redeemRecoveryCode(string $email, string $code, Request $request): array
    {
        $user = $this->findAdminByEmail($email);
        if ($user === null) {
            throw new InvalidArgumentException('Codice di ripristino non valido.');
        }

        $normalized = $this->normalizeCode($code);
        $rows = AdminRecoveryCode::query()
            ->where('user_id', $user->id)
            ->whereNull('used_at')
            ->get();

        $matched = null;
        foreach ($rows as $row) {
            if (Hash::check($normalized, $row->code_hash)) {
                $matched = $row;
                break;
            }
        }

        if ($matched === null) {
            AuditLog::record($user->id, 'security.recovery_code.failed', User::class, (string) $user->id);
            throw new InvalidArgumentException('Codice di ripristino non valido.');
        }

        $matched->used_at = now();
        $matched->save();

        return $this->issueRecoverySession($user, $request, 'recovery_code');
    }

    public function requestEmailBreakGlass(string $email, Request $request): void
    {
        $user = $this->findAdminByEmail($email);
        // Anti-enumerazione: no-op silenzioso se non admin / senza alert emails.
        if ($user === null) {
            return;
        }

        $settings = AdminSecuritySetting::forUser($user);
        $emails = $settings->alertEmails();
        if ($emails === []) {
            return;
        }

        AdminRecoveryEmailToken::query()
            ->where('user_id', $user->id)
            ->whereNull('used_at')
            ->delete();

        $token = Str::random(48);
        AdminRecoveryEmailToken::query()->create([
            'user_id' => $user->id,
            'token_hash' => Hash::make($token),
            'expires_at' => now()->addMinutes(self::EMAIL_TOKEN_TTL_MINUTES),
        ]);

        foreach ($emails as $to) {
            Mail::to($to)->send(new AdminRecoveryEmailTokenMail(
                adminName: $user->name ?: $user->email,
                token: $token,
                ttlMinutes: self::EMAIL_TOKEN_TTL_MINUTES,
                ip: (string) $request->ip(),
            ));
        }

        AuditLog::record($user->id, 'security.recovery_email.sent', User::class, (string) $user->id, [
            'email_count' => count($emails),
            'ip' => $request->ip(),
        ]);
    }

    /**
     * @return array{token: string, user: User}
     */
    public function redeemEmailToken(string $email, string $token, Request $request): array
    {
        $user = $this->findAdminByEmail($email);
        if ($user === null) {
            throw new InvalidArgumentException('Codice di ripristino non valido.');
        }

        $row = AdminRecoveryEmailToken::query()
            ->where('user_id', $user->id)
            ->whereNull('used_at')
            ->where('expires_at', '>', now())
            ->latest('id')
            ->first();

        if ($row === null || ! Hash::check(trim($token), $row->token_hash)) {
            AuditLog::record($user->id, 'security.recovery_email.failed', User::class, (string) $user->id);
            throw new InvalidArgumentException('Codice di ripristino non valido o scaduto.');
        }

        $row->used_at = now();
        $row->save();

        return $this->issueRecoverySession($user, $request, 'recovery_email');
    }

    public function reenablePassword(User $user): void
    {
        $this->assertAdmin($user);
        $settings = AdminSecuritySetting::forUser($user);
        $settings->password_login_enabled = true;
        $settings->save();

        AuditLog::record($user->id, 'security.password_login.enabled', User::class, (string) $user->id, [
            'via' => 'recovery',
        ]);
    }

    public function passwordLoginEnabled(User $user): bool
    {
        return AdminSecuritySetting::forUser($user)->password_login_enabled !== false;
    }

    public function passkeyCount(User $user): int
    {
        return WebauthnCredential::query()->where('user_id', $user->id)->count();
    }

    /**
     * Opzioni login pubbliche (anti-enum soft: email sconosciuta → password allowed).
     *
     * @return array{passkeyAvailable: bool, passwordAllowed: bool, recoveryAvailable: bool}
     */
    public function loginOptionsForEmail(string $email): array
    {
        $user = $this->findAdminByEmail($email);
        if ($user === null) {
            return [
                'passkeyAvailable' => false,
                'passwordAllowed' => true,
                'recoveryAvailable' => false,
            ];
        }

        $passkeyCount = $this->passkeyCount($user);
        $passwordAllowed = $this->passwordLoginEnabled($user);
        $settings = AdminSecuritySetting::forUser($user);
        $hasRecovery = $this->unusedCodeCount($user) > 0 || $settings->alertEmails() !== [];

        return [
            'passkeyAvailable' => $passkeyCount >= 1,
            'passwordAllowed' => $passwordAllowed,
            'recoveryAvailable' => $hasRecovery && ($passkeyCount >= 1 || ! $passwordAllowed),
        ];
    }

    /**
     * @return array{token: string, user: User}
     */
    private function issueRecoverySession(User $user, Request $request, string $method): array
    {
        if ($user->suspended_at !== null) {
            throw new InvalidArgumentException('Account sospeso.');
        }

        // Invalida sessioni complete; la recovery è scoped.
        $user->tokens()->delete();
        $token = $user->createToken('admin-recovery', [self::ABILITY])->plainTextToken;

        AuditLog::record($user->id, 'security.recovery.session', User::class, (string) $user->id, [
            'method' => $method,
            'ip' => $request->ip(),
        ]);

        $this->notifyRecoveryUsed($user, $method, $request);

        return ['token' => $token, 'user' => $user];
    }

    private function notifyRecoveryUsed(User $user, string $method, Request $request): void
    {
        $emails = AdminSecuritySetting::forUser($user)->alertEmails();
        foreach ($emails as $to) {
            Mail::to($to)->send(new AdminRecoveryAlertMail(
                adminName: $user->name ?: $user->email,
                method: $method,
                ip: (string) $request->ip(),
                at: now()->timezone(config('app.timezone'))->toIso8601String(),
            ));
        }
    }

    private function findAdminByEmail(string $email): ?User
    {
        $email = strtolower(trim($email));
        $user = User::query()->where('email', $email)->first();
        if ($user === null || $user->role !== UserRole::PlatformAdmin) {
            return null;
        }

        return $user;
    }

    private function assertAdmin(User $user): void
    {
        if ($user->role !== UserRole::PlatformAdmin) {
            throw new InvalidArgumentException('Solo l’amministratore piattaforma.');
        }
    }

    private function formatCode(string $raw): string
    {
        $raw = preg_replace('/[^A-Z0-9]/', '', strtoupper($raw)) ?? '';
        $raw = str_pad(substr($raw, 0, 12), 12, 'X');

        return substr($raw, 0, 4).'-'.substr($raw, 4, 4).'-'.substr($raw, 8, 4);
    }

    private function normalizeCode(string $code): string
    {
        return strtoupper(preg_replace('/[^A-Z0-9]/', '', $code) ?? '');
    }
}
