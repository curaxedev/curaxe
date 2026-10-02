<?php

namespace App\Mail\Registration;

use App\Domains\Auth\Services\OtpService;
use App\Mail\BaseMailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

class WelcomeProfessionalMail extends BaseMailable
{
    public function __construct(
        public readonly string $name,
        public readonly string $code,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Benvenuto! Conferma la tua email',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.registration.welcome-professional',
            with: [
                'name' => $this->name,
                'code' => $this->code,
                'ttlMinutes' => OtpService::TTL_MINUTES,
            ],
        );
    }
}
