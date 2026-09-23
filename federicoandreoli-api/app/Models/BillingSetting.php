<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Crypt;

#[Fillable([
    'mode',
    'secret_key_encrypted',
    'publishable_key',
    'webhook_secret_encrypted',
    'secret_key_hint',
    'webhook_secret_hint',
    'price_professional',
    'price_agency',
    'price_structure',
    'trial_days_professional',
    'trial_days_agency',
    'trial_days_structure',
    'portal_configuration_id',
    'webhook_endpoint_id',
    'last_diagnostic',
    'setup_completed_at',
])]
class BillingSetting extends Model
{
    protected function casts(): array
    {
        return [
            'last_diagnostic' => 'array',
            'setup_completed_at' => 'datetime',
            'trial_days_professional' => 'integer',
            'trial_days_agency' => 'integer',
            'trial_days_structure' => 'integer',
        ];
    }

    public static function current(): self
    {
        return self::query()->firstOrCreate([], [
            'mode' => 'test',
            'trial_days_professional' => 14,
            'trial_days_agency' => 14,
            'trial_days_structure' => 14,
        ]);
    }

    public function setSecretKey(?string $plain): void
    {
        if ($plain === null || $plain === '') {
            return;
        }
        $this->secret_key_encrypted = Crypt::encryptString($plain);
        $this->secret_key_hint = $this->mask($plain);
    }

    public function setWebhookSecret(?string $plain): void
    {
        if ($plain === null || $plain === '') {
            return;
        }
        $this->webhook_secret_encrypted = Crypt::encryptString($plain);
        $this->webhook_secret_hint = $this->mask($plain);
    }

    public function decryptedSecretKey(): ?string
    {
        if (! is_string($this->secret_key_encrypted) || $this->secret_key_encrypted === '') {
            $env = config('services.stripe.secret');

            return is_string($env) && $env !== '' ? $env : null;
        }

        try {
            return Crypt::decryptString($this->secret_key_encrypted);
        } catch (\Throwable) {
            return null;
        }
    }

    public function decryptedWebhookSecret(): ?string
    {
        if (! is_string($this->webhook_secret_encrypted) || $this->webhook_secret_encrypted === '') {
            $env = config('services.stripe.webhook_secret');

            return is_string($env) && $env !== '' ? $env : null;
        }

        try {
            return Crypt::decryptString($this->webhook_secret_encrypted);
        } catch (\Throwable) {
            return null;
        }
    }

    public function publishableKeyResolved(): ?string
    {
        if (is_string($this->publishable_key) && $this->publishable_key !== '') {
            return $this->publishable_key;
        }
        $env = config('services.stripe.key');

        return is_string($env) && $env !== '' ? $env : null;
    }

    public function priceIdForAudience(string $audience): ?string
    {
        return match ($audience) {
            'agency' => $this->price_agency ?: null,
            'structure' => $this->price_structure ?: null,
            default => $this->price_professional ?: null,
        };
    }

    public function trialDaysForAudience(string $audience): int
    {
        return match ($audience) {
            'agency' => (int) $this->trial_days_agency,
            'structure' => (int) $this->trial_days_structure,
            default => (int) $this->trial_days_professional,
        };
    }

    public function isSetupComplete(): bool
    {
        return $this->setup_completed_at !== null
            && $this->decryptedSecretKey() !== null
            && $this->decryptedWebhookSecret() !== null
            && $this->price_professional
            && $this->price_agency
            && $this->price_structure;
    }

    /**
     * @return array<string, mixed>
     */
    public function publicPayload(): array
    {
        return [
            'mode' => $this->mode,
            'publishableKey' => $this->publishableKeyResolved(),
            'secretKeyHint' => $this->secret_key_hint,
            'webhookSecretHint' => $this->webhook_secret_hint,
            'hasSecretKey' => $this->decryptedSecretKey() !== null,
            'hasWebhookSecret' => $this->decryptedWebhookSecret() !== null,
            'priceProfessional' => $this->price_professional,
            'priceAgency' => $this->price_agency,
            'priceStructure' => $this->price_structure,
            'trialDaysProfessional' => $this->trial_days_professional,
            'trialDaysAgency' => $this->trial_days_agency,
            'trialDaysStructure' => $this->trial_days_structure,
            'portalConfigurationId' => $this->portal_configuration_id,
            'webhookEndpointId' => $this->webhook_endpoint_id,
            'webhookUrl' => rtrim((string) config('app.url'), '/').'/api/v1/webhooks/stripe',
            'lastDiagnostic' => $this->last_diagnostic,
            'setupCompletedAt' => $this->setup_completed_at?->toIso8601String(),
            'setupComplete' => $this->isSetupComplete(),
        ];
    }

    private function mask(string $value): string
    {
        $len = strlen($value);
        if ($len <= 8) {
            return str_repeat('•', $len);
        }

        return substr($value, 0, 7).'…'.substr($value, -4);
    }
}
