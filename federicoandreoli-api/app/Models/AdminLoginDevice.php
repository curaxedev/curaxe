<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'user_id',
    'device_hash',
    'label',
    'user_agent',
    'last_ip',
    'trusted',
    'first_seen_at',
    'last_seen_at',
])]
class AdminLoginDevice extends Model
{
    protected function casts(): array
    {
        return [
            'trusted' => 'boolean',
            'first_seen_at' => 'datetime',
            'last_seen_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
