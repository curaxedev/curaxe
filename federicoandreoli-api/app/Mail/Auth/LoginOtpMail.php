<?php

namespace App\Mail\Auth;

use App\Domains\Auth\Services\OtpService;
use App\Mail\BaseMailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

class LoginOtpMail extends BaseMailable
{
    public function __construct(
        public readonly string $code,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Il tuo codice di accesso',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.auth.otp-code',
            with: [
                'code' => $this->code,
                'ttlMinutes' => OtpService::TTL_MINUTES,
            ],
        );
    }
}
