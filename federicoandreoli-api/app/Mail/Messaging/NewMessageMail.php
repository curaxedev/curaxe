<?php

namespace App\Mail\Messaging;

use App\Mail\BaseMailable;
use App\Models\Message;
use App\Models\MessageThread;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

class NewMessageMail extends BaseMailable
{
    public function __construct(public MessageThread $thread, public Message $message) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Nuovo messaggio — '.$this->thread->subject);
    }

    public function content(): Content
    {
        return new Content(view: 'emails.messaging.new-message');
    }
}
