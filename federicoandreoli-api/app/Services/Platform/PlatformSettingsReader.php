<?php

namespace App\Services\Platform;

use App\Models\PlatformSetting;
use Illuminate\Support\Facades\Cache;

/**
 * Lettura impostazioni piattaforma con cache versionata (Hostinger / database cache).
 */
final class PlatformSettingsReader
{
    public const VERSION_KEY = 'platform.settings.cache_version';

    public const TTL_SECONDS = 60;

    /**
     * @return array<string, mixed>
     */
    public static function defaults(): array
    {
        return [
            'pricing' => [
                'premiumMonthlyEur' => 19.9,
                'premiumYearlyEur' => 179,
            ],
            'emailNotifications' => [
                'newRegistration' => true,
                'newRequest' => true,
                'paymentReceived' => true,
                'paymentFailed' => true,
                'profileVerified' => true,
            ],
            'emailTemplates' => [
                'welcomeSubject' => 'Benvenuto su Curaxe',
                'paymentFailedSubject' => 'Pagamento non riuscito — azione richiesta',
            ],
            'maintenance' => [
                'enabled' => false,
                'message' => 'Stiamo effettuando manutenzione. Torneremo presto.',
            ],
            'commissionRates' => [
                'professionalPercent' => 8,
                'agencyPercent' => 12,
                'plannedOnly' => true,
                'active' => false,
            ],
            'featureFlags' => [
                'b2bJobPostings' => true,
                'familyMessaging' => true,
                'stripeCheckout' => true,
                'maintenanceBanner' => false,
            ],
            'freeLimits' => [
                'maxRequestsPerMonth' => 3,
                'maxActiveApplications' => 5,
            ],
        ];
    }

    public static function version(): int
    {
        return (int) Cache::get(self::VERSION_KEY, 1);
    }

    public static function bump(): void
    {
        Cache::forever(self::VERSION_KEY, self::version() + 1);
    }

    /**
     * @return array<string, mixed>
     */
    public function all(): array
    {
        $version = self::version();

        return Cache::remember('platform.settings.v'.$version, self::TTL_SECONDS, function (): array {
            $row = PlatformSetting::query()->where('key', 'platform')->first();
            $stored = is_array($row?->value) ? $row->value : [];

            return $this->mergeDefaults($stored);
        });
    }

    public function feature(string $key, bool $default = true): bool
    {
        $flags = $this->all()['featureFlags'] ?? [];

        return (bool) ($flags[$key] ?? $default);
    }

    public function freeLimit(string $key, int $default = 0): int
    {
        $limits = $this->all()['freeLimits'] ?? [];
        $value = $limits[$key] ?? $default;

        return max(0, (int) $value);
    }

    /**
     * @return array{enabled: bool, message: string}
     */
    public function maintenance(): array
    {
        $m = $this->all()['maintenance'] ?? [];

        return [
            'enabled' => (bool) ($m['enabled'] ?? false),
            'message' => is_string($m['message'] ?? null)
                ? (string) $m['message']
                : 'Stiamo effettuando manutenzione. Torneremo presto.',
        ];
    }

    /**
     * Payload pubblico sicuro (niente commissioni/email/pricing interno).
     *
     * @return array<string, mixed>
     */
    public function publicConfig(): array
    {
        $all = $this->all();
        $maintenance = $this->maintenance();
        $flags = $all['featureFlags'] ?? [];

        return [
            'featureFlags' => [
                'b2bJobPostings' => (bool) ($flags['b2bJobPostings'] ?? true),
                'familyMessaging' => (bool) ($flags['familyMessaging'] ?? true),
                'stripeCheckout' => (bool) ($flags['stripeCheckout'] ?? true),
                'maintenanceBanner' => (bool) ($flags['maintenanceBanner'] ?? false),
            ],
            'maintenance' => [
                'enabled' => $maintenance['enabled'],
                'message' => $maintenance['message'],
                'showBanner' => $maintenance['enabled'] && (bool) ($flags['maintenanceBanner'] ?? false),
            ],
            'freeLimits' => [
                'maxRequestsPerMonth' => $this->freeLimit('maxRequestsPerMonth', 3),
                'maxActiveApplications' => $this->freeLimit('maxActiveApplications', 5),
            ],
        ];
    }

    /**
     * @param  array<string, mixed>  $stored
     * @return array<string, mixed>
     */
    private function mergeDefaults(array $stored): array
    {
        $defaults = self::defaults();
        $merged = $defaults;

        foreach ($stored as $key => $value) {
            if (is_array($value) && isset($defaults[$key]) && is_array($defaults[$key])) {
                $merged[$key] = array_replace($defaults[$key], $value);
            } else {
                $merged[$key] = $value;
            }
        }

        // Commissioni: sempre pianificate / non operative finché non esiste il motore fee.
        $merged['commissionRates'] = array_replace($defaults['commissionRates'], is_array($stored['commissionRates'] ?? null) ? $stored['commissionRates'] : []);
        $merged['commissionRates']['plannedOnly'] = true;
        $merged['commissionRates']['active'] = false;

        return $merged;
    }
}
