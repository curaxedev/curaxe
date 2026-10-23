<?php

namespace App\Support;

/**
 * Registry azioni sensibili admin che richiedono step-up quando Sicurezza totale è ON.
 */
final class AdminSensitiveAction
{
    public const USERS_MUTATE = 'users.mutate';

    public const BILLING_PLANS = 'billing.plans';

    public const BILLING_REFUND = 'billing.refund';

    public const BILLING_SUBSCRIPTION = 'billing.subscription';

    public const BILLING_STRIPE_KEYS = 'billing.stripe_keys';

    public const SECURITY_SETTINGS = 'security.settings';

    public const SETTINGS_PLATFORM = 'settings.platform';

    public const KYC_DECIDE = 'kyc.decide';

    public const PASSKEY_MANAGE = 'passkey.manage';

    /** @return list<string> */
    public static function all(): array
    {
        return [
            self::USERS_MUTATE,
            self::BILLING_PLANS,
            self::BILLING_REFUND,
            self::BILLING_SUBSCRIPTION,
            self::BILLING_STRIPE_KEYS,
            self::SECURITY_SETTINGS,
            self::SETTINGS_PLATFORM,
            self::KYC_DECIDE,
            self::PASSKEY_MANAGE,
        ];
    }

    public static function isValid(string $action): bool
    {
        return in_array($action, self::all(), true);
    }

    /** @return array<string, string> */
    public static function labels(): array
    {
        return [
            self::USERS_MUTATE => 'Modifica utenti',
            self::BILLING_PLANS => 'Catalogo piani',
            self::BILLING_REFUND => 'Rimborsi',
            self::BILLING_SUBSCRIPTION => 'Gestione abbonamenti',
            self::BILLING_STRIPE_KEYS => 'Chiavi Stripe',
            self::SECURITY_SETTINGS => 'Impostazioni sicurezza',
            self::SETTINGS_PLATFORM => 'Impostazioni piattaforma',
            self::KYC_DECIDE => 'Approvazione KYC',
            self::PASSKEY_MANAGE => 'Gestione passkey',
        ];
    }
}
