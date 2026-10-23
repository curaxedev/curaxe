<?php

namespace App\Services\Auth;

use App\Domains\Auth\Enums\UserRole;
use App\Models\AdminSecuritySetting;
use App\Models\AuditLog;
use App\Models\User;
use App\Models\WebauthnCredential;
use App\Support\AdminSensitiveAction;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use InvalidArgumentException;
use Symfony\Component\HttpKernel\Exception\HttpException;

/**
 * Step-up passkey: challenge one-shot + token opaco single-use bound to action.
 */
final class AdminStepUpService
{
    private const CHALLENGE_TTL_MINUTES = 5;

    private const TOKEN_TTL_MINUTES = 4;

    public function __construct(
        private readonly AdminPasskeyService $passkeys,
    ) {}

    public function securityTotalEnabled(User $user): bool
    {
        if ($user->role !== UserRole::PlatformAdmin) {
            return false;
        }

        return AdminSecuritySetting::forUser($user)->security_total_enabled;
    }

    public function passkeyCount(User $user): int
    {
        return WebauthnCredential::query()->where('user_id', $user->id)->count();
    }

    /**
     * @return array{challengeId: string, options: array<string, mixed>, action: string}
     */
    public function begin(User $user, string $action): array
    {
        $this->assertAdmin($user);
        if (! AdminSensitiveAction::isValid($action)) {
            throw new InvalidArgumentException('Azione step-up non valida.');
        }
        if ($this->passkeyCount($user) < 1) {
            throw new InvalidArgumentException('Registra almeno una passkey prima di continuare.');
        }

        $result = $this->passkeys->beginAssertionForUser($user);

        cache()->put($this->challengeKey($result['challengeId']), [
            'user_id' => $user->id,
            'action' => $action,
        ], now()->addMinutes(self::CHALLENGE_TTL_MINUTES));

        return [
            'challengeId' => $result['challengeId'],
            'options' => $result['options'],
            'action' => $action,
        ];
    }

    /**
     * @param  array<string, mixed>  $assertionResponse
     * @return array{token: string, action: string, expiresAt: string}
     */
    public function verify(User $user, string $action, string $challengeId, array $assertionResponse): array
    {
        $this->assertAdmin($user);
        if (! AdminSensitiveAction::isValid($action)) {
            throw new InvalidArgumentException('Azione step-up non valida.');
        }

        $meta = cache()->pull($this->challengeKey($challengeId));
        if (
            ! is_array($meta)
            || (int) ($meta['user_id'] ?? 0) !== $user->id
            || ($meta['action'] ?? '') !== $action
        ) {
            throw new InvalidArgumentException('Challenge step-up scaduta o non valida.');
        }

        $this->passkeys->completeAssertionForUser($user, $challengeId, $assertionResponse);

        $token = Str::random(64);
        $expiresAt = now()->addMinutes(self::TOKEN_TTL_MINUTES);
        cache()->put($this->tokenKey($token), [
            'user_id' => $user->id,
            'action' => $action,
            'exp' => $expiresAt->timestamp,
        ], $expiresAt);

        AuditLog::record($user->id, 'security.step_up', User::class, (string) $user->id, [
            'action' => $action,
        ]);

        return [
            'token' => $token,
            'action' => $action,
            'expiresAt' => $expiresAt->toIso8601String(),
        ];
    }

    /**
     * Consuma (single-use) un token step-up. Ritorna true se valido.
     */
    public function consume(User $user, string $action, ?string $token): bool
    {
        if ($token === null || $token === '') {
            return false;
        }
        $stored = cache()->pull($this->tokenKey($token));
        if (! is_array($stored)) {
            return false;
        }
        if ((int) ($stored['user_id'] ?? 0) !== $user->id) {
            return false;
        }
        if (($stored['action'] ?? '') !== $action) {
            return false;
        }
        if ((int) ($stored['exp'] ?? 0) < now()->timestamp) {
            return false;
        }

        return true;
    }

    /**
     * Se Sicurezza totale è attiva, richiede X-Step-Up-Token valido per $action.
     * Altrimenti no-op.
     */
    public function requireIfEnabled(Request $request, string $action): void
    {
        $user = $request->user();
        if (! $user instanceof User || $user->role !== UserRole::PlatformAdmin) {
            throw new HttpException(403, 'Non autorizzato.');
        }
        if (! $this->securityTotalEnabled($user)) {
            return;
        }
        $token = $request->headers->get('X-Step-Up-Token');
        if (! $this->consume($user, $action, is_string($token) ? $token : null)) {
            throw new HttpException(
                403,
                'Conferma con passkey richiesta per questa azione.',
            );
        }
    }

    /**
     * Per gestione passkey: step-up obbligatorio se Sicurezza totale ON,
     * oppure se l'utente ha già almeno una passkey (anti bind silenzioso).
     */
    public function requireForPasskeyManage(Request $request, bool $isFirstRegistration = false): void
    {
        $user = $request->user();
        if (! $user instanceof User) {
            throw new HttpException(403, 'Non autorizzato.');
        }
        if ($isFirstRegistration && $this->passkeyCount($user) === 0) {
            return;
        }
        if ($this->securityTotalEnabled($user) || $this->passkeyCount($user) >= 1) {
            $token = $request->headers->get('X-Step-Up-Token');
            if (! $this->consume($user, AdminSensitiveAction::PASSKEY_MANAGE, is_string($token) ? $token : null)) {
                throw new HttpException(
                    403,
                    'Conferma con passkey richiesta per gestire le passkey.',
                );
            }
        }
    }

    private function assertAdmin(User $user): void
    {
        if ($user->role !== UserRole::PlatformAdmin) {
            throw new InvalidArgumentException('Solo l’amministratore piattaforma.');
        }
    }

    private function challengeKey(string $challengeId): string
    {
        return "admin-stepup-meta:{$challengeId}";
    }

    private function tokenKey(string $token): string
    {
        return 'admin-stepup-token:'.hash('sha256', $token);
    }
}
