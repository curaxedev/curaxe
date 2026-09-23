<?php

namespace App\Mail\Auth;

use App\Mail\BaseMailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

class PasswordResetMail extends BaseMailable
{
    public function __construct(
        public readonly string $resetUrl,
        public readonly int $ttlMinutes,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Reimposta la tua password',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.auth.password-reset',
            with: [
                'resetUrl' => $this->resetUrl,
                'ttlMinutes' => $this->ttlMinutes,
            ],
        );
    }
}
