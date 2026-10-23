<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SupportTicketMessage extends Model
{
    protected $fillable = [
        'support_ticket_id', 'author', 'author_name', 'body',
    ];

    public function ticket(): BelongsTo
    {
        return $this->belongsTo(SupportTicket::class, 'support_ticket_id');
    }
}
