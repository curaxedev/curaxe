<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'user_id',
    'audience',
    'plan_type',
    'status',
    'stripe_customer_id',
    'stripe_subscription_id',
    'price_id',
    'latest_invoice_id',
    'current_period_start',
    'current_period_end',
    'trial_ends_at',
    'cancel_at',
    'cancel_at_period_end',
    'history',
])]
class Subscription extends Model
{
    protected function casts(): array
    {
        return [
            'current_period_start' => 'datetime',
            'current_period_end' => 'datetime',
            'trial_ends_at' => 'datetime',
            'cancel_at' => 'datetime',
            'cancel_at_period_end' => 'boolean',
            'history' => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function refunds(): HasMany
    {
        return $this->hasMany(BillingRefund::class);
    }

    public function pushHistory(string $event, array $extra = []): void
    {
        $history = $this->history ?? [];
        $history[] = array_merge(['at' => now()->toIso8601String(), 'event' => $event], $extra);
        // Cap per evitare payload illimitati al client.
        if (count($history) > 100) {
            $history = array_slice($history, -100);
        }
        $this->history = $history;
    }
}
