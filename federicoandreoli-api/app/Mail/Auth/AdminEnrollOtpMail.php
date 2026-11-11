<?php

namespace App\Mail\Auth;

use App\Mail\BaseMailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

class AdminEnrollOtpMail extends BaseMailable
{
    public function __construct(
        public readonly string $adminName,
        public readonly string $code,
        public readonly int $ttlMinutes,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Curaxe admin: codice per nuova passkey');
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.auth.admin-enroll-otp',
            with: [
                'adminName' => $this->adminName,
                'code' => $this->code,
                'ttlMinutes' => $this->ttlMinutes,
            ],
        );
    }
}
