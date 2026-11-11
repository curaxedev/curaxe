<?php

namespace App\Mail\Auth;

use App\Mail\BaseMailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

class AdminRecoveryAlertMail extends BaseMailable
{
    public function __construct(
        public readonly string $adminName,
        public readonly string $method,
        public readonly string $ip,
        public readonly string $at,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Curaxe admin: recupero accesso utilizzato');
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.auth.admin-recovery-alert',
            with: [
                'adminName' => $this->adminName,
                'method' => $this->method,
                'ip' => $this->ip,
                'at' => $this->at,
                'accountUrl' => rtrim((string) config('app.frontend_url'), '/').'/dashboard/admin',
            ],
        );
    }
}
