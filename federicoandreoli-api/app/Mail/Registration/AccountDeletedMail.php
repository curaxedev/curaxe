<?php

namespace App\Mail\Registration;

use App\Mail\BaseMailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

class AccountDeletedMail extends BaseMailable
{
    public function __construct(
        public readonly string $name,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Il tuo account è stato eliminato',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.registration.account-deleted',
            with: [
                'name' => $this->name,
            ],
        );
    }
}
