<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'user_id', 'first_name', 'last_name', 'professional_title', 'birth_year', 'nationality', 'phone',
    'bio', 'photo_path', 'category', 'experience_years', 'specializations', 'languages',
    'has_license', 'has_car', 'employment_types', 'days', 'shifts', 'available_from',
    'hourly_rate', 'monthly_live_in_rate', 'zones', 'primary_zone', 'radius_km', 'available_to_move',
    'certifications', 'is_published', 'is_verified', 'is_online', 'rating_avg', 'review_count',
    'comune', 'cap', 'regione', 'istat',
])]
class ProfessionalProfile extends Model
{
    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'birth_year' => 'integer',
            'specializations' => 'array',
            'languages' => 'array',
            'has_license' => 'boolean',
            'has_car' => 'boolean',
            'employment_types' => 'array',
            'days' => 'array',
            'shifts' => 'array',
            'hourly_rate' => 'float',
            'monthly_live_in_rate' => 'float',
            'zones' => 'array',
            'radius_km' => 'integer',
            'available_to_move' => 'boolean',
            'certifications' => 'array',
            'is_published' => 'boolean',
            'is_verified' => 'boolean',
            'is_online' => 'boolean',
            'rating_avg' => 'float',
            'review_count' => 'integer',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
