<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['organization_id', 'name', 'role_label', 'status', 'shift', 'notes'])]
class StaffMember extends Model
{
    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }
}
