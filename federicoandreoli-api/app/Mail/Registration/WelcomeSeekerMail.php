<?php

namespace App\Mail\Registration;

use App\Mail\BaseMailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

class WelcomeSeekerMail extends BaseMailable
{
    public function __construct(
        public readonly string $name,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Benvenuto! Il tuo account famiglia è pronto',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.registration.welcome-seeker',
            with: [
                'name' => $this->name,
            ],
        );
    }
}
