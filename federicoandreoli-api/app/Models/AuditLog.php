<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['actor_id','action','subject_type','subject_id','meta'])]
class AuditLog extends Model
{
    protected function casts(): array { return ['meta' => 'array']; }

    public static function record(?int $actorId, string $action, ?string $subjectType = null, ?string $subjectId = null, array $meta = []): self
    {
        return self::query()->create([
            'actor_id' => $actorId,
            'action' => $action,
            'subject_type' => $subjectType,
            'subject_id' => $subjectId,
            'meta' => $meta,
        ]);
    }
}
