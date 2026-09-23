<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['user_id','audience','text','type','read'])]
class AppNotification extends Model
{
    protected function casts(): array { return ['read' => 'boolean']; }
}
