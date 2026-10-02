<?php

namespace App\Mail\Registration;

use App\Domains\Auth\Services\OtpService;
use App\Mail\BaseMailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

class WelcomeSeekerMail extends BaseMailable
{
    public function __construct(
        public readonly string $name,
        public readonly string $code,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Benvenuto! Conferma il tuo account famiglia',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.registration.welcome-seeker',
            with: [
                'name' => $this->name,
                'code' => $this->code,
                'ttlMinutes' => OtpService::TTL_MINUTES,
            ],
        );
    }
}
