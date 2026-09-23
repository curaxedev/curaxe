<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'user_id',
    'credential_id',
    'credential_id_hash',
    'public_key',
    'credential_record',
    'sign_count',
    'name',
    'transports',
    'aaguid',
    'last_used_at',
])]
class WebauthnCredential extends Model
{
    protected function casts(): array
    {
        return [
            'transports' => 'array',
            'last_used_at' => 'datetime',
            'sign_count' => 'integer',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
