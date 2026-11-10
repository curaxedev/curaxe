<?php

namespace App\Services\Stripe;

use App\Models\BillingSetting;
use App\Models\PlanPriceChange;
use App\Models\Subscription;

/**
 * Blocca modifiche commerciali se ci sono iscritti, SALVO policy esplicita di cambio listino.
 *
 * Policy ammesse (production-safe):
 * - grandfather_indefinite
 * - grandfather_months (+ mesi 1–36)
 * - cancel_at_period_end
 * - cancel_immediately
 */
final class PlanCatalogLockService
{
    /** Campi che non si possono cambiare se ci sono iscritti attivi senza policy. */
    public const LOCKED_FIELDS = [
        'amountCents',
        'interval',
        'stripePriceId',
        'audience',
        'key',
        'currency',
    ];

    /**
     * @return array<string, array{activeSubscribers: int, locked: boolean, currentPriceSubscribers: int}>
     */
    public function locksFor(BillingSetting $settings): array
    {
        $locks = [];
        foreach ($settings->resolvedPlansCatalog() as $plan) {
            $key = (string) ($plan['key'] ?? '');
            if ($key === '') {
                continue;
            }
            $related = $this->activeCountForPlan($plan);
            $current = $this->activeCountOnCurrentPrice($plan);
            $locks[$key] = [
                'activeSubscribers' => $related,
                'currentPriceSubscribers' => $current,
                /** locked = non eliminabile / attenzione: ci sono iscritti sul piano (anche grandfather). */
                'locked' => $related > 0,
            ];
        }

        return $locks;
    }

    /**
     * Price ID su cui possono ancora esserci iscritti (listino corrente + precedenti).
     *
     * @param  array<string, mixed>  $plan
     * @return list<string>
     */
    public function relevantPriceIdsForPlan(array $plan): array
    {
        $ids = [];
        foreach (['stripePriceId', 'stripePreviousPriceId'] as $field) {
            $id = isset($plan[$field]) ? trim((string) $plan[$field]) : '';
            if ($id !== '' && str_starts_with($id, 'price_')) {
                $ids[$id] = true;
            }
        }

        $key = (string) ($plan['key'] ?? '');
        if ($key !== '') {
            $historyIds = PlanPriceChange::query()
                ->where('plan_key', $key)
                ->orderByDesc('id')
                ->limit(40)
                ->get(['old_price_id', 'new_price_id']);
            foreach ($historyIds as $row) {
                foreach ([$row->old_price_id, $row->new_price_id] as $hid) {
                    $id = is_string($hid) ? trim($hid) : '';
                    if ($id !== '' && str_starts_with($id, 'price_')) {
                        $ids[$id] = true;
                    }
                }
            }
        }

        return array_keys($ids);
    }

    /**
     * Iscritti su qualsiasi Price ancora legato al piano (corrente + storici).
     *
     * @param  array<string, mixed>  $plan
     */
    public function activeCountForPlan(array $plan): int
    {
        $priceIds = $this->relevantPriceIdsForPlan($plan);
        if ($priceIds === []) {
            return 0;
        }

        return (int) Subscription::query()
            ->notTrashed()
            ->whereIn('status', ['active', 'trialing'])
            ->whereIn('price_id', $priceIds)
            ->count();
    }

    /**
     * Solo iscritti sul Price di catalogo corrente (quelli toccati da una policy di cambio listino).
     *
     * @param  array<string, mixed>  $plan
     */
    public function activeCountOnCurrentPrice(array $plan): int
    {
        $priceId = isset($plan['stripePriceId']) ? trim((string) $plan['stripePriceId']) : '';
        if ($priceId === '' || ! str_starts_with($priceId, 'price_')) {
            return 0;
        }

        return (int) Subscription::query()
            ->notTrashed()
            ->whereIn('status', ['active', 'trialing'])
            ->where('price_id', $priceId)
            ->count();
    }

    /**
     * True se amount/interval/currency/stripePriceId/audience/key cambiano.
     *
     * @param  array<string, mixed>  $before
     * @param  array<string, mixed>  $after
     */
    public function hasCommercialDiff(array $before, array $after): bool
    {
        foreach (self::LOCKED_FIELDS as $field) {
            if ($this->normalizeField($before[$field] ?? null) !== $this->normalizeField($after[$field] ?? null)) {
                return true;
            }
        }

        return false;
    }

    /**
     * @param  list<array<string, mixed>>  $incoming
     * @param  array<string, array<string, mixed>>  $policiesByPlanKey
     */
    public function validateCatalogUpdate(
        BillingSetting $settings,
        array $incoming,
        array $policiesByPlanKey = [],
    ): ?string {
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
            if (! $this->hasCommercialDiff($prev, $plan)) {
                continue;
            }

            // Policy obbligatoria solo se ci sono iscritti sul Price CORRENTE (quelli che la policy tocca).
            // Gli grandfather su Price storici restano intatti e non richiedono una nuova policy.
            $countOnCurrent = $this->activeCountOnCurrentPrice($prev);
            if ($countOnCurrent === 0) {
                continue;
            }

            $policy = $policiesByPlanKey[$key] ?? null;
            $policyName = is_array($policy) ? (string) ($policy['policy'] ?? '') : '';
            if ($policyName === '' || ! in_array($policyName, PlanPriceChange::policies(), true)) {
                $label = (string) ($prev['label'] ?? $key);

                return "Il piano «{$label}» ha {$countOnCurrent} iscritti attivi/in prova sul Price corrente: per cambiare "
                    .'prezzo/intervallo scegli una policy (mantieni prezzo storico, mantieni X mesi, '
                    .'disdici a fine periodo, oppure disdici subito).';
            }
            if ($policyName === PlanPriceChange::POLICY_GRANDFATHER_MONTHS) {
                $months = (int) ($policy['grandfatherMonths'] ?? 0);
                if ($months < 1 || $months > 36) {
                    return 'Policy «mantieni X mesi»: indica un numero di mesi tra 1 e 36.';
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

                return "Non puoi eliminare «{$label}»: ha {$count} iscritti attivi (active/trialing). "
                    .'Prima applica una policy di uscita (disdetta) oppure migra gli abbonamenti.';
            }
        }

        return null;
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function recentPriceChanges(int $limit = 20): array
    {
        return PlanPriceChange::query()
            ->orderByDesc('id')
            ->limit($limit)
            ->get()
            ->map(static fn (PlanPriceChange $c) => [
                'id' => (string) $c->id,
                'planKey' => $c->plan_key,
                'planLabel' => $c->plan_label,
                'policy' => $c->policy,
                'grandfatherMonths' => $c->grandfather_months,
                'graceEndsAt' => $c->grace_ends_at?->toIso8601String(),
                'oldPriceId' => $c->old_price_id,
                'newPriceId' => $c->new_price_id,
                'oldAmountCents' => $c->old_amount_cents,
                'newAmountCents' => $c->new_amount_cents,
                'affectedSubscriptions' => $c->affected_subscriptions,
                'status' => $c->status,
                'notes' => $c->notes,
                'createdAt' => $c->created_at?->toIso8601String(),
                'createdBy' => $c->created_by !== null ? (string) $c->created_by : null,
            ])
            ->values()
            ->all();
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
