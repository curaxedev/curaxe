<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PlanPriceChange extends Model
{
    public const POLICY_GRANDFATHER_INDEFINITE = 'grandfather_indefinite';

    public const POLICY_GRANDFATHER_MONTHS = 'grandfather_months';

    public const POLICY_CANCEL_AT_PERIOD_END = 'cancel_at_period_end';

    public const POLICY_CANCEL_IMMEDIATELY = 'cancel_immediately';

    public const STATUS_APPLIED = 'applied';

    public const STATUS_GRACE_ACTIVE = 'grace_active';

    public const STATUS_COMPLETED = 'completed';

    public const STATUS_FAILED = 'failed';

    protected $fillable = [
        'plan_key',
        'plan_label',
        'old_price_id',
        'new_price_id',
        'old_amount_cents',
        'new_amount_cents',
        'old_interval',
        'new_interval',
        'policy',
        'grandfather_months',
        'grace_ends_at',
        'affected_subscriptions',
        'status',
        'created_by',
        'meta',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'old_amount_cents' => 'integer',
            'new_amount_cents' => 'integer',
            'grandfather_months' => 'integer',
            'grace_ends_at' => 'datetime',
            'affected_subscriptions' => 'integer',
            'meta' => 'array',
        ];
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public static function policies(): array
    {
        return [
            self::POLICY_GRANDFATHER_INDEFINITE,
            self::POLICY_GRANDFATHER_MONTHS,
            self::POLICY_CANCEL_AT_PERIOD_END,
            self::POLICY_CANCEL_IMMEDIATELY,
        ];
    }
}
