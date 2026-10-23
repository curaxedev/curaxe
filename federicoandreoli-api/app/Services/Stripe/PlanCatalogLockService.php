<?php

namespace App\Services\Stripe;

use App\Models\BillingSetting;
use App\Models\Subscription;

/**
 * Blocca modifiche commerciali / eliminazione piani con abbonati active|trialing.
 * (Release successiva: migrazione prezzo / change-plan controllato.)
 */
final class PlanCatalogLockService
{
    /** Campi che non si possono cambiare se ci sono iscritti attivi. */
    public const LOCKED_FIELDS = [
        'amountCents',
        'interval',
        'stripePriceId',
        'audience',
        'key',
        'currency',
    ];

    /**
     * @return array<string, array{activeSubscribers: int, locked: bool}>
     */
    public function locksFor(BillingSetting $settings): array
    {
        $locks = [];
        foreach ($settings->resolvedPlansCatalog() as $plan) {
            $key = (string) ($plan['key'] ?? '');
            if ($key === '') {
                continue;
            }
            $count = $this->activeCountForPlan($plan);
            $locks[$key] = [
                'activeSubscribers' => $count,
                'locked' => $count > 0,
            ];
        }

        return $locks;
    }

    /**
     * @param  array<string, mixed>  $plan
     */
    public function activeCountForPlan(array $plan): int
    {
        $priceId = isset($plan['stripePriceId']) ? trim((string) $plan['stripePriceId']) : '';
        if ($priceId === '') {
            return 0;
        }

        return (int) Subscription::query()
            ->whereIn('status', ['active', 'trialing'])
            ->where('price_id', $priceId)
            ->count();
    }

    /**
     * Valida il nuovo catalogo rispetto a quello attuale.
     * Ritorna messaggio di errore o null se ok.
     *
     * @param  list<array<string, mixed>>  $incoming
     */
    public function validateCatalogUpdate(BillingSetting $settings, array $incoming): ?string
    {
        $currentByKey = [];
        foreach ($settings->resolvedPlansCatalog() as $plan) {
            $currentByKey[(string) $plan['key']] = $plan;
        }

        $incomingKeys = [];
        foreach ($incoming as $plan) {
            $key = (string) ($plan['key'] ?? '');
            $incomingKeys[$key] = true;
            $prev = $currentByKey[$key] ?? null;
            if ($prev === null) {
                continue;
            }
            $count = $this->activeCountForPlan($prev);
            if ($count === 0) {
                continue;
            }
            foreach (self::LOCKED_FIELDS as $field) {
                $before = $this->normalizeField($prev[$field] ?? null);
                $after = $this->normalizeField($plan[$field] ?? null);
                if ($before !== $after) {
                    $label = (string) ($prev['label'] ?? $key);

                    return "Il piano «{$label}» ha {$count} iscritti attivi: non puoi modificare {$field} (né prezzo, audience o Price ID). Elimina o migra gli abbonamenti prima.";
                }
            }
        }

        foreach ($currentByKey as $key => $prev) {
            if (isset($incomingKeys[$key])) {
                continue;
            }
            $count = $this->activeCountForPlan($prev);
            if ($count > 0) {
                $label = (string) ($prev['label'] ?? $key);

                return "Non puoi eliminare «{$label}»: ha {$count} iscritti attivi (active/trialing).";
            }
        }

        return null;
    }

    private function normalizeField(mixed $value): string
    {
        if ($value === null) {
            return '';
        }
        if (is_bool($value)) {
            return $value ? '1' : '0';
        }

        return trim((string) $value);
    }
}
