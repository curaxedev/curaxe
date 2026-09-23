<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'organization_id', 'user_id', 'owner_type', 'department', 'contract_type', 'status', 'category',
    'poster_type', 'poster_display_name', 'contract_bucket', 'title', 'excerpt', 'location_label',
    'comune', 'regione', 'rate_label', 'schedule_label', 'urgency', 'badge', 'description_intro',
    'duties', 'requirements', 'mobility', 'payload', 'version', 'change_history', 'published_at',
])]
class JobPosting extends Model
{
    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'duties' => 'array',
            'requirements' => 'array',
            'mobility' => 'array',
            'payload' => 'array',
            'change_history' => 'array',
            'version' => 'integer',
            'published_at' => 'datetime',
        ];
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
