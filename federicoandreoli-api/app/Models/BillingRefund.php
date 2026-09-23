<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'subscription_id',
    'actor_admin_id',
    'stripe_refund_id',
    'amount_cents',
    'currency',
    'status',
    'reason',
    'meta',
])]
class BillingRefund extends Model
{
    protected function casts(): array
    {
        return ['meta' => 'array'];
    }

    public function subscription(): BelongsTo
    {
        return $this->belongsTo(Subscription::class);
    }

    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_admin_id');
    }
}
