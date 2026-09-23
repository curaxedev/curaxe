<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['user_id', 'termini', 'privacy', 'maggiorenne', 'comunicazioni', 'profilazione', 'version', 'source'])]
class ConsentRecord extends Model
{
    /** Versione corrente delle policy: allineata a CONSENT_POLICY_VERSION del frontend. */
    public const POLICY_VERSION = '2026-06';

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'termini' => 'boolean',
            'privacy' => 'boolean',
            'maggiorenne' => 'boolean',
            'comunicazioni' => 'boolean',
            'profilazione' => 'boolean',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public static function latestForUser(int $userId): ?self
    {
        return self::query()->where('user_id', $userId)->latest('id')->first();
    }
}
