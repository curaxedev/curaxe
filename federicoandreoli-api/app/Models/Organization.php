<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'user_id', 'kind', 'name', 'slug', 'role_label', 'bio', 'coverage_hint', 'image_url',
    'rating_avg', 'review_count', 'is_online', 'is_published', 'comune', 'cap', 'regione',
    'istat', 'location_label', 'shift', 'services', 'branches',
])]
class Organization extends Model
{
    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'rating_avg' => 'float',
            'review_count' => 'integer',
            'is_online' => 'boolean',
            'is_published' => 'boolean',
            'services' => 'array',
            'branches' => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function jobPostings(): HasMany
    {
        return $this->hasMany(JobPosting::class);
    }
}
