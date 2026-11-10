<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Crypt;

#[Fillable([
    'mode',
    'publishable_key',
    'secret_key_hint',
    'webhook_secret_hint',
    'price_professional',
    'price_agency',
    'price_structure',
    'trial_days_professional',
    'trial_days_agency',
    'trial_days_structure',
    'plans_catalog',
    'portal_configuration_id',
    'webhook_endpoint_id',
    'last_diagnostic',
    'setup_completed_at',
])]
class BillingSetting extends Model
{
    /** @var list<string> */
    protected $hidden = [
        'secret_key_encrypted',
        'webhook_secret_encrypted',
    ];

    protected function casts(): array
    {
        return [
            'last_diagnostic' => 'array',
            'plans_catalog' => 'array',
            'setup_completed_at' => 'datetime',
            'trial_days_professional' => 'integer',
            'trial_days_agency' => 'integer',
            'trial_days_structure' => 'integer',
        ];
    }

    /**
     * Catalogo piani unico (admin + clienti). Importi = ciò che mostriamo in UI;
     * stripePriceId = ciò che Stripe addebita.
     *
     * @return list<array<string, mixed>>
     */
    public static function defaultPlansCatalog(): array
    {
        return [
            [
                'key' => 'professional_premium_monthly',
                'audience' => 'professional',
                'label' => 'Premium',
                'tagline' => 'Per assistenti familiari e caregiver',
                'amountCents' => 1990,
                'currency' => 'eur',
                'interval' => 'month',
                'trialDays' => 14,
                'stripePriceId' => null,
                'stripeProductId' => null,
                'features' => [
                    'Contatto WhatsApp e telefono in chat',
                    'Candidature illimitate',
                    'Visibilità prioritaria nelle ricerche',
                    'Badge verificato in evidenza',
                ],
                'active' => true,
                'sortOrder' => 1,
            ],
            [
                'key' => 'agency_business_monthly',
                'audience' => 'agency',
                'label' => 'Business',
                'tagline' => 'Per agenzie di assistenza',
                'amountCents' => 4990,
                'currency' => 'eur',
                'interval' => 'month',
                'trialDays' => 14,
                'stripePriceId' => null,
                'stripeProductId' => null,
                'features' => [
                    'Annunci illimitati',
                    'Gestione team e candidature',
                    'Supporto prioritario',
                ],
                'active' => true,
                'sortOrder' => 2,
            ],
            [
                'key' => 'structure_premium_monthly',
                'audience' => 'structure',
                'label' => 'Premium RSA',
                'tagline' => 'Per strutture e RSA',
                'amountCents' => 7990,
                'currency' => 'eur',
                'interval' => 'month',
                'trialDays' => 14,
                'stripePriceId' => null,
                'stripeProductId' => null,
                'features' => [
                    'Turni e annunci illimitati',
                    'Candidature e messaging',
                    'Supporto dedicato',
                ],
                'active' => true,
                'sortOrder' => 3,
            ],
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

    /**
     * @return list<array<string, mixed>>
     */
    public function resolvedPlansCatalog(): array
    {
        $stored = is_array($this->plans_catalog) ? $this->plans_catalog : [];
        // Catalogo vuoto → default di bootstrap. Se salvato (anche con meno piani),
        // non re-inserire i default eliminati dall’admin.
        if ($stored === []) {
            return $this->hydrateCatalogFromLegacyColumns(self::defaultPlansCatalog());
        }

        $plans = [];
        foreach ($stored as $row) {
            if (! is_array($row) || empty($row['key'])) {
                continue;
            }
            $key = (string) $row['key'];
            $plans[] = array_replace([
                'key' => $key,
                'audience' => $row['audience'] ?? 'professional',
                'label' => $row['label'] ?? $key,
                'tagline' => '',
                'amountCents' => 0,
                'currency' => 'eur',
                'interval' => 'month',
                'trialDays' => 14,
                'stripePriceId' => null,
                'stripeProductId' => null,
                'features' => [],
                'active' => true,
                'sortOrder' => 99,
            ], $row);
        }

        if ($plans === []) {
            return $this->hydrateCatalogFromLegacyColumns(self::defaultPlansCatalog());
        }

        usort($plans, static fn ($a, $b) => ((int) ($a['sortOrder'] ?? 99)) <=> ((int) ($b['sortOrder'] ?? 99)));

        return $this->hydrateCatalogFromLegacyColumns($plans);
    }

    /**
     * Allinea colonne legacy price_* / trial_* con il catalogo (fonte unica).
     *
     * @param  list<array<string, mixed>>  $plans
     * @return list<array<string, mixed>>
     */
    private function hydrateCatalogFromLegacyColumns(array $plans): array
    {
        foreach ($plans as &$plan) {
            $audience = (string) ($plan['audience'] ?? '');
            $legacyPrice = match ($audience) {
                'agency' => $this->price_agency,
                'structure' => $this->price_structure,
                default => $this->price_professional,
            };
            $legacyTrial = match ($audience) {
                'agency' => $this->trial_days_agency,
                'structure' => $this->trial_days_structure,
                default => $this->trial_days_professional,
            };
            if (empty($plan['stripePriceId']) && is_string($legacyPrice) && $legacyPrice !== '') {
                $plan['stripePriceId'] = $legacyPrice;
            }
            if (! isset($plan['trialDays']) || $plan['trialDays'] === null) {
                $plan['trialDays'] = (int) $legacyTrial;
            }
        }
        unset($plan);

        return $plans;
    }

    /** Scrive price_* e trial_* dalle entry catalogo (checkout Stripe resta invariato). */
    public function syncLegacyColumnsFromCatalog(): void
    {
        foreach ($this->resolvedPlansCatalog() as $plan) {
            $audience = (string) ($plan['audience'] ?? '');
            $priceId = is_string($plan['stripePriceId'] ?? null) ? trim((string) $plan['stripePriceId']) : '';
            $trial = (int) ($plan['trialDays'] ?? 14);
            if ($audience === 'agency') {
                if ($priceId !== '') {
                    $this->price_agency = $priceId;
                }
                $this->trial_days_agency = $trial;
            } elseif ($audience === 'structure') {
                if ($priceId !== '') {
                    $this->price_structure = $priceId;
                }
                $this->trial_days_structure = $trial;
            } elseif ($audience === 'professional') {
                if ($priceId !== '') {
                    $this->price_professional = $priceId;
                }
                $this->trial_days_professional = $trial;
            }
        }
    }

    public function priceIdForAudience(string $audience): ?string
    {
        foreach ($this->resolvedPlansCatalog() as $plan) {
            if (($plan['audience'] ?? '') === $audience && ! empty($plan['stripePriceId']) && ($plan['active'] ?? true)) {
                return (string) $plan['stripePriceId'];
            }
        }

        return match ($audience) {
            'agency' => $this->price_agency ?: null,
            'structure' => $this->price_structure ?: null,
            default => $this->price_professional ?: null,
        };
    }

    public function trialDaysForAudience(string $audience): int
    {
        foreach ($this->resolvedPlansCatalog() as $plan) {
            if (($plan['audience'] ?? '') === $audience && ($plan['active'] ?? true)) {
                return (int) ($plan['trialDays'] ?? 14);
            }
        }

        return match ($audience) {
            'agency' => (int) $this->trial_days_agency,
            'structure' => (int) $this->trial_days_structure,
            default => (int) $this->trial_days_professional,
        };
    }

    public function amountCentsForAudience(string $audience): int
    {
        foreach ($this->resolvedPlansCatalog() as $plan) {
            if (($plan['audience'] ?? '') === $audience && ($plan['active'] ?? true)) {
                return (int) ($plan['amountCents'] ?? 0);
            }
        }

        return match ($audience) {
            'agency' => 4990,
            'structure' => 7990,
            default => 1990,
        };
    }

    public function isSetupComplete(): bool
    {
        return $this->setup_completed_at !== null
            && $this->decryptedSecretKey() !== null
            && $this->decryptedWebhookSecret() !== null
            && $this->catalogHasRequiredPrices();
    }

    /**
     * Ogni audience presente nel catalogo attivo ha almeno un Price ID.
     * Se un’audience non ha piani attivi, non è richiesta.
     */
    public function catalogHasRequiredPrices(): bool
    {
        $needed = [];
        foreach ($this->resolvedPlansCatalog() as $plan) {
            if (! ($plan['active'] ?? true)) {
                continue;
            }
            $audience = (string) ($plan['audience'] ?? '');
            if ($audience === '' || ! in_array($audience, ['professional', 'agency', 'structure'], true)) {
                continue;
            }
            if (! array_key_exists($audience, $needed)) {
                $needed[$audience] = false;
            }
            $priceId = is_string($plan['stripePriceId'] ?? null) ? trim((string) $plan['stripePriceId']) : '';
            if ($priceId !== '' && str_starts_with($priceId, 'price_')) {
                $needed[$audience] = true;
            }
        }

        if ($needed === []) {
            return false;
        }

        return ! in_array(false, $needed, true);
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
            'plans' => $this->resolvedPlansCatalog(),
            'planLocks' => app(\App\Services\Stripe\PlanCatalogLockService::class)->locksFor($this),
            'portalConfigurationId' => $this->portal_configuration_id,
            'webhookEndpointId' => $this->webhook_endpoint_id,
            'webhookUrl' => rtrim((string) config('app.url'), '/').'/api/v1/webhooks/stripe',
            'lastDiagnostic' => $this->last_diagnostic,
            'setupCompletedAt' => $this->setup_completed_at?->toIso8601String(),
            'setupComplete' => $this->isSetupComplete(),
        ];
    }

    /**
     * Payload pubblico per clienti (niente secret / hint).
     *
     * @return list<array<string, mixed>>
     */
    public function publicPlansPayload(): array
    {
        return array_values(array_map(static function (array $plan) {
            return [
                'key' => $plan['key'],
                'audience' => $plan['audience'],
                'label' => $plan['label'],
                'tagline' => $plan['tagline'] ?? '',
                'amountCents' => (int) ($plan['amountCents'] ?? 0),
                'currency' => $plan['currency'] ?? 'eur',
                'interval' => $plan['interval'] ?? 'month',
                'trialDays' => (int) ($plan['trialDays'] ?? 0),
                'features' => array_values($plan['features'] ?? []),
                'active' => (bool) ($plan['active'] ?? true),
                'sortOrder' => (int) ($plan['sortOrder'] ?? 0),
                // stripePriceId omesso in pubblico (non serve al client; checkout usa ruolo server-side)
            ];
        }, array_filter(
            $this->resolvedPlansCatalog(),
            static fn (array $p) => (bool) ($p['active'] ?? true),
        )));
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
