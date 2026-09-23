<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'user_id', 'title', 'status', 'assistance_type', 'beneficiary', 'employment_type',
    'comune', 'budget_monthly', 'days', 'notes',
])]
class FamilyRequest extends Model
{
    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'days' => 'array',
            'budget_monthly' => 'integer',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function applications(): HasMany
    {
        return $this->hasMany(Application::class, 'target_id')
            ->where('applications.target_type', 'family_request');
    }

    public function applicationCount(): int
    {
        return Application::query()
            ->where('target_type', 'family_request')
            ->where('target_id', $this->id)
            ->count();
    }
}
