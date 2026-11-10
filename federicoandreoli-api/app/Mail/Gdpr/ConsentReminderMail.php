<?php

namespace App\Mail\Gdpr;

use App\Mail\BaseMailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

class ConsentReminderMail extends BaseMailable
{
    public function __construct(
        public readonly string $name,
        public readonly string $manageUrl,
        public readonly string $privacyAcceptedAt,
        public readonly bool $newsletterOptIn,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Rivedi i tuoi consensi privacy e newsletter — Curaxe',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.gdpr.consent-reminder',
            with: [
                'name' => $this->name,
                'manageUrl' => $this->manageUrl,
                'privacyAcceptedAt' => $this->privacyAcceptedAt,
                'newsletterOptIn' => $this->newsletterOptIn,
            ],
        );
    }
}
