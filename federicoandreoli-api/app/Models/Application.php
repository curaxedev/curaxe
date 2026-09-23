<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'target_type', 'target_id', 'owner_id', 'applicant_id', 'status', 'message',
    'applicant_name', 'applicant_initials', 'applicant_category', 'applicant_zone',
    'applicant_stars', 'applicant_preview', 'target_title', 'target_publisher_name',
    'target_publisher_kind',
])]
class Application extends Model
{
    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'applicant_stars' => 'float',
            'target_id' => 'integer',
        ];
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function applicant(): BelongsTo
    {
        return $this->belongsTo(User::class, 'applicant_id');
    }
}
