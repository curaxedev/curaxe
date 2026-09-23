<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['thread_id','sender_id','sender_name','body'])]
class Message extends Model
{
    public function thread(): BelongsTo { return $this->belongsTo(MessageThread::class, 'thread_id'); }
}
