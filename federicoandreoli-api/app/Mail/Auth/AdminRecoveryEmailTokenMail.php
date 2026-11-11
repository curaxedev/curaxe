<?php

namespace App\Mail\Auth;

use App\Mail\BaseMailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

class AdminRecoveryEmailTokenMail extends BaseMailable
{
    public function __construct(
        public readonly string $adminName,
        public readonly string $token,
        public readonly int $ttlMinutes,
        public readonly string $ip,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Curaxe admin: codice di ripristino accesso');
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.auth.admin-recovery-token',
            with: [
                'adminName' => $this->adminName,
                'token' => $this->token,
                'ttlMinutes' => $this->ttlMinutes,
                'ip' => $this->ip,
            ],
        );
    }
}
