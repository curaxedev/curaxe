<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'participant_ids','participant_names','participant_roles','subject','link_type','link_id',
    'link_label','last_message_at','last_message_preview','unread_by_user_id',
])]
class MessageThread extends Model
{
    protected function casts(): array
    {
        return [
            'participant_ids' => 'array',
            'participant_names' => 'array',
            'participant_roles' => 'array',
            'unread_by_user_id' => 'array',
            'last_message_at' => 'datetime',
        ];
    }
    public function messages(): HasMany { return $this->hasMany(Message::class, 'thread_id'); }
}
