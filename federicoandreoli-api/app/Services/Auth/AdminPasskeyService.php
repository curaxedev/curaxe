<?php

namespace App\Services\Auth;

use App\Domains\Auth\Enums\UserRole;
use App\Models\AuditLog;
use App\Models\User;
use App\Models\WebauthnCredential;
use Illuminate\Support\Str;
use InvalidArgumentException;
use Symfony\Component\Serializer\SerializerInterface;
use Throwable;
use Webauthn\AttestationStatement\AttestationStatementSupportManager;
use Webauthn\AttestationStatement\NoneAttestationStatementSupport;
use Webauthn\AuthenticatorAssertionResponse;
use Webauthn\AuthenticatorAssertionResponseValidator;
use Webauthn\AuthenticatorAttestationResponse;
use Webauthn\AuthenticatorAttestationResponseValidator;
use Webauthn\AuthenticatorSelectionCriteria;
use Webauthn\CeremonyStep\CeremonyStepManagerFactory;
use Webauthn\CredentialRecord;
use Webauthn\Denormalizer\WebauthnSerializerFactory;
use Webauthn\PublicKeyCredential;
use Webauthn\PublicKeyCredentialCreationOptions;
use Webauthn\PublicKeyCredentialDescriptor;
use Webauthn\PublicKeyCredentialParameters;
use Webauthn\PublicKeyCredentialRequestOptions;
use Webauthn\PublicKeyCredentialRpEntity;
use Webauthn\PublicKeyCredentialUserEntity;

/**
 * Passkey (WebAuthn) for platform_admin landlord accounts.
 */
final class AdminPasskeyService
{
    private const CHALLENGE_TTL_MINUTES = 5;

    /**
     * @return array{challengeId: string, options: array<string, mixed>}
     */
    public function beginRegistration(User $user, string $deviceName): array
    {
        $this->assertAdmin($user);
        $deviceName = trim($deviceName);
        if ($deviceName === '') {
            throw new InvalidArgumentException('Inserisci un nome per la passkey.');
        }

        $rpId = $this->getRpId();
        $origin = $this->getOrigin();
        $rpEntity = new PublicKeyCredentialRpEntity(config('webauthn.rp_name', 'Curaxe'), $rpId);
        $userEntity = new PublicKeyCredentialUserEntity(
            $user->email,
            $this->userHandle($user),
            $user->name ?: $user->email,
        );

        $challenge = random_bytes(32);
        $challengeId = Str::random(32);
        $exclude = WebauthnCredential::query()
            ->where('user_id', $user->id)
            ->get()
            ->map(fn (WebauthnCredential $c) => new PublicKeyCredentialDescriptor(
                'public-key',
                $this->base64UrlDecode($c->credential_id),
                $c->transports ?? [],
            ))
            ->all();

        $options = new PublicKeyCredentialCreationOptions(
            rp: $rpEntity,
            user: $userEntity,
            challenge: $challenge,
            pubKeyCredParams: [
                new PublicKeyCredentialParameters('public-key', -7),
                new PublicKeyCredentialParameters('public-key', -257),
            ],
            authenticatorSelection: new AuthenticatorSelectionCriteria(
                authenticatorAttachment: AuthenticatorSelectionCriteria::AUTHENTICATOR_ATTACHMENT_PLATFORM,
                userVerification: AuthenticatorSelectionCriteria::USER_VERIFICATION_REQUIREMENT_REQUIRED,
                residentKey: AuthenticatorSelectionCriteria::RESIDENT_KEY_REQUIREMENT_REQUIRED,
            ),
            attestation: PublicKeyCredentialCreationOptions::ATTESTATION_CONVEYANCE_PREFERENCE_NONE,
            excludeCredentials: $exclude,
            timeout: 60000,
        );

        cache()->put($this->registrationKey($user, $challengeId), [
            'user_id' => $user->id,
            'device_name' => $deviceName,
            'rp_id' => $rpId,
            'origin' => $origin,
            'options' => $this->serializer()->serialize($options, 'json'),
        ], now()->addMinutes(self::CHALLENGE_TTL_MINUTES));

        return [
            'challengeId' => $challengeId,
            'options' => $this->serializeToArray($options),
        ];
    }

    /**
     * @param  array<string, mixed>  $attestationResponse
     */
    public function completeRegistration(User $user, string $challengeId, array $attestationResponse): WebauthnCredential
    {
        $this->assertAdmin($user);
        $stored = cache()->pull($this->registrationKey($user, $challengeId));
        if (! is_array($stored) || (int) ($stored['user_id'] ?? 0) !== $user->id) {
            throw new InvalidArgumentException('Challenge scaduta o non valida.');
        }

        try {
            $serializer = $this->serializer();
            $credential = $serializer->deserialize(
                json_encode($attestationResponse, JSON_THROW_ON_ERROR),
                PublicKeyCredential::class,
                'json',
            );
            if (! $credential instanceof PublicKeyCredential
                || ! $credential->response instanceof AuthenticatorAttestationResponse) {
                throw new InvalidArgumentException('Risposta WebAuthn non valida.');
            }

            $options = $serializer->deserialize(
                (string) $stored['options'],
                PublicKeyCredentialCreationOptions::class,
                'json',
            );
            if (! $options instanceof PublicKeyCredentialCreationOptions) {
                throw new InvalidArgumentException('Opzioni WebAuthn non valide.');
            }

            $factory = $this->ceremonyFactory((string) $stored['origin'], (string) $stored['rp_id']);
            $validator = AuthenticatorAttestationResponseValidator::create($factory->creationCeremony());
            $record = $validator->check($credential->response, $options, (string) $stored['rp_id']);
        } catch (InvalidArgumentException $e) {
            throw $e;
        } catch (Throwable $e) {
            report($e);
            throw new InvalidArgumentException('La passkey non è stata verificata.');
        }

        $credentialId = $this->base64UrlEncode($record->publicKeyCredentialId);
        $hash = hash('sha256', $credentialId);
        if (WebauthnCredential::query()->where('credential_id_hash', $hash)->exists()) {
            throw new InvalidArgumentException('Questa passkey è già registrata.');
        }

        $passkey = WebauthnCredential::query()->create([
            'user_id' => $user->id,
            'name' => (string) $stored['device_name'],
            'credential_id' => $credentialId,
            'credential_id_hash' => $hash,
            'credential_record' => $this->serializer()->serialize($record, 'json'),
            'public_key' => base64_encode($record->credentialPublicKey),
            'sign_count' => $record->counter,
            'transports' => $record->transports,
            'aaguid' => $record->aaguid->toRfc4122(),
        ]);

        AuditLog::record($user->id, 'passkey.registered', WebauthnCredential::class, (string) $passkey->id, [
            'name' => $passkey->name,
        ]);

        return $passkey;
    }

    /**
     * @return array{challengeId: string, options: array<string, mixed>}
     */
    public function beginAuthentication(string $email): array
    {
        $email = strtolower(trim($email));
        $user = User::query()->where('email', $email)->first();
        if ($user === null || $user->role !== UserRole::PlatformAdmin) {
            // Anti-enumeration: challenge finto
            $challenge = random_bytes(32);
            $challengeId = Str::random(32);
            $options = new PublicKeyCredentialRequestOptions(
                challenge: $challenge,
                rpId: $this->getRpId(),
                allowCredentials: [new PublicKeyCredentialDescriptor('public-key', random_bytes(32), [])],
                userVerification: PublicKeyCredentialRequestOptions::USER_VERIFICATION_REQUIREMENT_REQUIRED,
                timeout: 60000,
            );
            cache()->put($this->authKey($challengeId), [
                'user_id' => null,
                'email_hash' => $this->emailHash($email),
                'rp_id' => $this->getRpId(),
                'origin' => $this->getOrigin(),
                'options' => $this->serializer()->serialize($options, 'json'),
            ], now()->addMinutes(self::CHALLENGE_TTL_MINUTES));

            return ['challengeId' => $challengeId, 'options' => $this->serializeToArray($options)];
        }

        $passkeys = WebauthnCredential::query()->where('user_id', $user->id)->get();
        $rpId = $this->getRpId();
        $origin = $this->getOrigin();
        $challenge = random_bytes(32);
        $challengeId = Str::random(32);
        $allow = $passkeys->map(fn (WebauthnCredential $c) => new PublicKeyCredentialDescriptor(
            'public-key',
            $this->base64UrlDecode($c->credential_id),
            $c->transports ?? [],
        ))->all();
        if ($allow === []) {
            $allow[] = new PublicKeyCredentialDescriptor('public-key', random_bytes(32), []);
        }

        $options = new PublicKeyCredentialRequestOptions(
            challenge: $challenge,
            rpId: $rpId,
            allowCredentials: $allow,
            userVerification: PublicKeyCredentialRequestOptions::USER_VERIFICATION_REQUIREMENT_REQUIRED,
            timeout: 60000,
        );

        cache()->put($this->authKey($challengeId), [
            'user_id' => $user->id,
            'email_hash' => $this->emailHash($email),
            'rp_id' => $rpId,
            'origin' => $origin,
            'options' => $this->serializer()->serialize($options, 'json'),
        ], now()->addMinutes(self::CHALLENGE_TTL_MINUTES));

        return [
            'challengeId' => $challengeId,
            'options' => $this->serializeToArray($options),
        ];
    }

    /**
     * @param  array<string, mixed>  $assertionResponse
     * @return array{user: User, token: string}
     */
    public function completeAuthentication(string $email, string $challengeId, array $assertionResponse): array
    {
        $email = strtolower(trim($email));
        $stored = cache()->pull($this->authKey($challengeId));
        if (
            ! is_array($stored)
            || ! hash_equals((string) ($stored['email_hash'] ?? ''), $this->emailHash($email))
        ) {
            throw new InvalidArgumentException('Autenticazione passkey non valida.');
        }

        $user = User::query()->find((int) ($stored['user_id'] ?? 0));
        if (! $user instanceof User || $user->role !== UserRole::PlatformAdmin) {
            throw new InvalidArgumentException('Autenticazione passkey non valida.');
        }
        if ($user->suspended_at !== null) {
            throw new InvalidArgumentException('Account sospeso.');
        }

        try {
            $serializer = $this->serializer();
            $credential = $serializer->deserialize(
                json_encode($assertionResponse, JSON_THROW_ON_ERROR),
                PublicKeyCredential::class,
                'json',
            );
            if (! $credential instanceof PublicKeyCredential
                || ! $credential->response instanceof AuthenticatorAssertionResponse) {
                throw new InvalidArgumentException('Risposta WebAuthn non valida.');
            }

            $credentialId = $this->base64UrlEncode($credential->rawId);
            $passkey = WebauthnCredential::query()
                ->where('user_id', $user->id)
                ->where('credential_id_hash', hash('sha256', $credentialId))
                ->first();
            if ($passkey === null || ! hash_equals($passkey->credential_id, $credentialId)) {
                throw new InvalidArgumentException('Autenticazione passkey non valida.');
            }

            $record = $serializer->deserialize($passkey->credential_record, CredentialRecord::class, 'json');
            $options = $serializer->deserialize(
                (string) $stored['options'],
                PublicKeyCredentialRequestOptions::class,
                'json',
            );
            if (! $record instanceof CredentialRecord || ! $options instanceof PublicKeyCredentialRequestOptions) {
                throw new InvalidArgumentException('Credenziale passkey non valida.');
            }

            $factory = $this->ceremonyFactory((string) $stored['origin'], (string) $stored['rp_id']);
            $validator = AuthenticatorAssertionResponseValidator::create($factory->requestCeremony());
            $updated = $validator->check(
                $record,
                $credential->response,
                $options,
                (string) $stored['rp_id'],
                $this->userHandle($user),
            );
        } catch (InvalidArgumentException $e) {
            throw $e;
        } catch (Throwable $e) {
            report($e);
            throw new InvalidArgumentException('Autenticazione passkey non valida.');
        }

        $passkey->credential_record = $this->serializer()->serialize($updated, 'json');
        $passkey->sign_count = $updated->counter;
        $passkey->last_used_at = now();
        $passkey->save();

        AuditLog::record($user->id, 'passkey.login', WebauthnCredential::class, (string) $passkey->id);

        $token = $user->createToken('spa-passkey')->plainTextToken;

        return ['user' => $user, 'token' => $token];
    }

    /**
     * @return list<array{id: string, name: string, createdAt: string, lastUsedAt: string|null}>
     */
    public function list(User $user): array
    {
        $this->assertAdmin($user);

        return WebauthnCredential::query()
            ->where('user_id', $user->id)
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (WebauthnCredential $c) => [
                'id' => (string) $c->id,
                'name' => $c->name,
                'createdAt' => $c->created_at?->toIso8601String() ?? '',
                'lastUsedAt' => $c->last_used_at?->toIso8601String(),
            ])
            ->all();
    }

    public function rename(User $user, int $id, string $name): WebauthnCredential
    {
        $this->assertAdmin($user);
        $name = trim($name);
        if ($name === '') {
            throw new InvalidArgumentException('Nome non valido.');
        }
        $passkey = WebauthnCredential::query()->where('user_id', $user->id)->where('id', $id)->firstOrFail();
        $passkey->name = $name;
        $passkey->save();
        AuditLog::record($user->id, 'passkey.renamed', WebauthnCredential::class, (string) $passkey->id);

        return $passkey;
    }

    public function delete(User $user, int $id): void
    {
        $this->assertAdmin($user);
        $passkey = WebauthnCredential::query()->where('user_id', $user->id)->where('id', $id)->firstOrFail();
        $passkey->delete();
        AuditLog::record($user->id, 'passkey.deleted', WebauthnCredential::class, (string) $id);
    }

    private function assertAdmin(User $user): void
    {
        if ($user->role !== UserRole::PlatformAdmin) {
            throw new InvalidArgumentException('Solo l’amministratore piattaforma può gestire le passkey.');
        }
    }

    private function getRpId(): string
    {
        $rp = (string) config('webauthn.rp_id', 'localhost');
        if ($rp === '' || preg_match('/^[a-z0-9.-]+$/', $rp) !== 1) {
            throw new InvalidArgumentException('WEBAUTHN_RP_ID non valido.');
        }

        return $rp;
    }

    private function getOrigin(): string
    {
        $request = request();
        $origin = $request?->headers->get('Origin');
        $allowed = config('webauthn.origins', []);
        if (! is_array($allowed) || $allowed === []) {
            $allowed = [rtrim((string) config('app.frontend_url'), '/')];
        }

        if (! is_string($origin) || $origin === '') {
            // Fallback in testing
            if (app()->environment('testing', 'local')) {
                return (string) ($allowed[0] ?? 'http://localhost:5173');
            }
            throw new InvalidArgumentException('Origine passkey non disponibile.');
        }

        $normalized = rtrim($origin, '/');
        $ok = false;
        foreach ($allowed as $a) {
            if (hash_equals(rtrim((string) $a, '/'), $normalized)) {
                $ok = true;
                break;
            }
        }
        if (! $ok) {
            throw new InvalidArgumentException('Origine passkey non autorizzata.');
        }

        $scheme = strtolower((string) parse_url($normalized, PHP_URL_SCHEME));
        if (! app()->environment('local', 'testing') && $scheme !== 'https') {
            throw new InvalidArgumentException('Le passkey richiedono HTTPS.');
        }

        return $normalized;
    }

    private function userHandle(User $user): string
    {
        return hash_hmac('sha256', 'admin:'.$user->id, (string) config('app.key'), true);
    }

    private function emailHash(string $email): string
    {
        return hash_hmac('sha256', strtolower(trim($email)), (string) config('app.key'));
    }

    private function registrationKey(User $user, string $challengeId): string
    {
        return "admin-passkey-register:{$user->id}:{$challengeId}";
    }

    private function authKey(string $challengeId): string
    {
        return "admin-passkey-auth:{$challengeId}";
    }

    private function serializer(): SerializerInterface
    {
        $manager = AttestationStatementSupportManager::create([
            new NoneAttestationStatementSupport,
        ]);

        return (new WebauthnSerializerFactory($manager))->create();
    }

    private function ceremonyFactory(string $origin, string $rpId): CeremonyStepManagerFactory
    {
        $manager = AttestationStatementSupportManager::create([
            new NoneAttestationStatementSupport,
        ]);
        $factory = new CeremonyStepManagerFactory;
        $factory->setAttestationStatementSupportManager($manager);
        $factory->setAllowedOrigins([$origin], false);
        $factory->setSecuredRelyingPartyId([$rpId]);

        return $factory;
    }

    private function base64UrlEncode(string $value): string
    {
        return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
    }

    private function base64UrlDecode(string $value): string
    {
        $padding = (4 - strlen($value) % 4) % 4;
        $decoded = base64_decode(strtr($value.str_repeat('=', $padding), '-_', '+/'), true);
        if ($decoded === false) {
            throw new InvalidArgumentException('Credential ID non valido.');
        }

        return $decoded;
    }

    /**
     * @return array<string, mixed>
     */
    private function serializeToArray(object $value): array
    {
        $decoded = json_decode(
            $this->serializer()->serialize($value, 'json'),
            true,
            512,
            JSON_THROW_ON_ERROR,
        );
        if (! is_array($decoded)) {
            throw new InvalidArgumentException('Payload WebAuthn non serializzabile.');
        }

        return $decoded;
    }
}
