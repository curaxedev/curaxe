<?php

namespace App\Services\Stripe;

use App\Models\AuditLog;
use App\Models\PlanPriceChange;
use App\Models\Subscription;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Log;

/**
 * Applica policy di cambio listino in produzione, con audit e senza migrazioni silenziose.
 *
 * - grandfather_indefinite: iscritti restano sul Price storico; catalogo punta al nuovo.
 * - grandfather_months: come sopra + dopo N mesi schedula cancel_at_period_end.
 * - cancel_at_period_end: disdetta a fine periodo subito.
 * - cancel_immediately: chiusura immediata Stripe (azione distruttiva).
 */
final class PlanPriceChangeService
{
    public function __construct(
        private readonly SubscriptionBillingService $billing,
    ) {}

    /**
     * @param  array{
     *   policy: string,
     *   grandfatherMonths?: int|null,
     *   notes?: string|null
     * }  $policyInput
     * @param  array<string, mixed>  $beforePlan
     * @param  array<string, mixed>  $afterPlan
     */
    public function recordAndApply(
        User $admin,
        array $beforePlan,
        array $afterPlan,
        array $policyInput,
    ): PlanPriceChange {
        $policy = (string) ($policyInput['policy'] ?? '');
        if (! in_array($policy, PlanPriceChange::policies(), true)) {
            throw new \InvalidArgumentException('Policy di cambio prezzo non valida.');
        }

        $months = isset($policyInput['grandfatherMonths']) ? (int) $policyInput['grandfatherMonths'] : null;
        if ($policy === PlanPriceChange::POLICY_GRANDFATHER_MONTHS) {
            if ($months === null || $months < 1 || $months > 36) {
                throw new \InvalidArgumentException('Per «mantieni X mesi» indica un valore tra 1 e 36.');
            }
        }

        $oldPriceId = isset($beforePlan['stripePriceId']) ? trim((string) $beforePlan['stripePriceId']) : '';
        $newPriceId = isset($afterPlan['stripePriceId']) ? trim((string) $afterPlan['stripePriceId']) : '';
        $planKey = (string) ($afterPlan['key'] ?? $beforePlan['key'] ?? '');
        $label = (string) ($afterPlan['label'] ?? $beforePlan['label'] ?? $planKey);

        $subs = $this->subscriptionsOnPrice($oldPriceId);
        $graceEnds = $policy === PlanPriceChange::POLICY_GRANDFATHER_MONTHS
            ? now()->addMonths($months)->endOfDay()
            : null;

        $change = PlanPriceChange::query()->create([
            'plan_key' => $planKey,
            'plan_label' => $label,
            'old_price_id' => $oldPriceId !== '' ? $oldPriceId : null,
            'new_price_id' => $newPriceId !== '' ? $newPriceId : null,
            'old_amount_cents' => isset($beforePlan['amountCents']) ? (int) $beforePlan['amountCents'] : null,
            'new_amount_cents' => isset($afterPlan['amountCents']) ? (int) $afterPlan['amountCents'] : null,
            'old_interval' => isset($beforePlan['interval']) ? (string) $beforePlan['interval'] : null,
            'new_interval' => isset($afterPlan['interval']) ? (string) $afterPlan['interval'] : null,
            'policy' => $policy,
            'grandfather_months' => $months,
            'grace_ends_at' => $graceEnds,
            'affected_subscriptions' => $subs->count(),
            'status' => $policy === PlanPriceChange::POLICY_GRANDFATHER_MONTHS
                ? PlanPriceChange::STATUS_GRACE_ACTIVE
                : PlanPriceChange::STATUS_APPLIED,
            'created_by' => $admin->id,
            'notes' => isset($policyInput['notes']) ? trim((string) $policyInput['notes']) : null,
            'meta' => [
                'subscription_ids' => $subs->pluck('id')->map(fn ($id) => (string) $id)->values()->all(),
            ],
        ]);

        $applied = 0;
        $errors = [];

        foreach ($subs as $sub) {
            try {
                match ($policy) {
                    PlanPriceChange::POLICY_GRANDFATHER_INDEFINITE => $this->markGrandfathered($sub, $change, null),
                    PlanPriceChange::POLICY_GRANDFATHER_MONTHS => $this->markGrandfathered($sub, $change, $graceEnds),
                    PlanPriceChange::POLICY_CANCEL_AT_PERIOD_END => $this->scheduleCancel($sub, $change),
                    PlanPriceChange::POLICY_CANCEL_IMMEDIATELY => $this->cancelNow($sub, $change),
                    default => null,
                };
                $applied++;
            } catch (\Throwable $e) {
                $errors[] = [
                    'subscriptionId' => (string) $sub->id,
                    'message' => $e->getMessage(),
                ];
                Log::warning('plan_price_change.apply_failed', [
                    'change_id' => $change->id,
                    'subscription_id' => $sub->id,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        if ($errors !== []) {
            $change->meta = array_merge($change->meta ?? [], ['errors' => $errors]);
            if ($applied === 0 && $subs->isNotEmpty()) {
                $change->status = PlanPriceChange::STATUS_FAILED;
            }
            $change->save();
        }

        if ($policy === PlanPriceChange::POLICY_CANCEL_IMMEDIATELY
            || $policy === PlanPriceChange::POLICY_CANCEL_AT_PERIOD_END
            || $policy === PlanPriceChange::POLICY_GRANDFATHER_INDEFINITE) {
            if ($change->status !== PlanPriceChange::STATUS_FAILED) {
                $change->status = PlanPriceChange::STATUS_COMPLETED;
                $change->save();
            }
        }

        AuditLog::record($admin->id, 'billing.plan_price_change', PlanPriceChange::class, (string) $change->id, [
            'plan_key' => $planKey,
            'policy' => $policy,
            'old_price_id' => $oldPriceId,
            'new_price_id' => $newPriceId,
            'affected' => $subs->count(),
            'applied' => $applied,
            'grace_ends_at' => $graceEnds?->toIso8601String(),
        ]);

        return $change->fresh();
    }

    /**
     * Job periodico: a fine grazia, schedula cancel_at_period_end sugli abbonati ancora sul vecchio Price.
     */
    public function enforceExpiredGracePeriods(?User $actor = null): int
    {
        $due = PlanPriceChange::query()
            ->where('policy', PlanPriceChange::POLICY_GRANDFATHER_MONTHS)
            ->where('status', PlanPriceChange::STATUS_GRACE_ACTIVE)
            ->whereNotNull('grace_ends_at')
            ->where('grace_ends_at', '<=', now())
            ->orderBy('id')
            ->get();

        $processed = 0;
        foreach ($due as $change) {
            $oldPriceId = (string) ($change->old_price_id ?? '');
            if ($oldPriceId === '') {
                $change->status = PlanPriceChange::STATUS_COMPLETED;
                $change->save();
                $processed++;

                continue;
            }

            $subs = $this->subscriptionsOnPrice($oldPriceId);
            foreach ($subs as $sub) {
                try {
                    if ($sub->user) {
                        $this->billing->cancelAtPeriodEnd($sub->user);
                        $sub->pushHistory('price_change_grace_ended', [
                            'changeId' => $change->id,
                            'policy' => $change->policy,
                            'oldPriceId' => $oldPriceId,
                        ]);
                        $sub->save();
                    }
                } catch (\Throwable $e) {
                    Log::warning('plan_price_change.grace_enforce_failed', [
                        'change_id' => $change->id,
                        'subscription_id' => $sub->id,
                        'error' => $e->getMessage(),
                    ]);
                }
            }

            $change->status = PlanPriceChange::STATUS_COMPLETED;
            $change->meta = array_merge($change->meta ?? [], [
                'grace_enforced_at' => now()->toIso8601String(),
                'grace_enforced_count' => $subs->count(),
            ]);
            $change->save();

            AuditLog::record(
                $actor?->id,
                'billing.plan_price_change_grace_enforced',
                PlanPriceChange::class,
                (string) $change->id,
                ['affected' => $subs->count()],
            );
            $processed++;
        }

        return $processed;
    }

    /**
     * @return \Illuminate\Support\Collection<int, Subscription>
     */
    private function subscriptionsOnPrice(string $priceId)
    {
        if ($priceId === '') {
            return collect();
        }

        return Subscription::query()
            ->with('user')
            ->notTrashed()
            ->whereIn('status', ['active', 'trialing'])
            ->where('price_id', $priceId)
            ->get();
    }

    private function markGrandfathered(Subscription $sub, PlanPriceChange $change, ?Carbon $graceEnds): void
    {
        $sub->pushHistory('price_change_grandfathered', [
            'changeId' => $change->id,
            'policy' => $change->policy,
            'oldPriceId' => $change->old_price_id,
            'newPriceId' => $change->new_price_id,
            'graceEndsAt' => $graceEnds?->toIso8601String(),
            'note' => $graceEnds
                ? 'Resta sul prezzo storico fino a fine grazia; poi disdetta a fine periodo.'
                : 'Resta sul prezzo storico indefinitamente (nuovo listino solo per nuovi checkout).',
        ]);
        $sub->save();
    }

    private function scheduleCancel(Subscription $sub, PlanPriceChange $change): void
    {
        if ($sub->user === null) {
            throw new \RuntimeException('Abbonamento senza utente.');
        }
        $this->billing->cancelAtPeriodEnd($sub->user);
        $sub->refresh();
        $sub->pushHistory('price_change_cancel_at_period_end', [
            'changeId' => $change->id,
            'policy' => $change->policy,
            'oldPriceId' => $change->old_price_id,
            'newPriceId' => $change->new_price_id,
        ]);
        $sub->save();
    }

    private function cancelNow(Subscription $sub, PlanPriceChange $change): void
    {
        if ($sub->user === null) {
            throw new \RuntimeException('Abbonamento senza utente.');
        }
        $this->billing->cancelImmediately($sub->user);
        $sub->refresh();
        $sub->pushHistory('price_change_cancel_immediately', [
            'changeId' => $change->id,
            'policy' => $change->policy,
            'oldPriceId' => $change->old_price_id,
            'newPriceId' => $change->new_price_id,
        ]);
        $sub->save();
    }
}
