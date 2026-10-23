<?php

namespace App\Mail\Auth;

use App\Mail\BaseMailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

class AdminLoginAlertMail extends BaseMailable
{
    public function __construct(
        public readonly string $adminName,
        public readonly string $outcome,
        public readonly string $method,
        public readonly string $ip,
        public readonly string $deviceLabel,
        public readonly string $userAgent,
        public readonly bool $isNewDevice,
        public readonly string $at,
    ) {}

    public function envelope(): Envelope
    {
        $subject = match ($this->outcome) {
            'failed' => 'Curaxe admin: tentativi di accesso falliti',
            'blocked' => 'Curaxe admin: accesso bloccato',
            default => $this->isNewDevice
                ? 'Curaxe admin: nuovo dispositivo'
                : 'Curaxe admin: nuovo accesso',
        };

        return new Envelope(subject: $subject);
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.auth.admin-login-alert',
            with: [
                'adminName' => $this->adminName,
                'outcome' => $this->outcome,
                'method' => $this->method,
                'ip' => $this->ip,
                'deviceLabel' => $this->deviceLabel,
                'userAgent' => $this->userAgent,
                'isNewDevice' => $this->isNewDevice,
                'at' => $this->at,
                'accountUrl' => rtrim((string) config('app.frontend_url'), '/').'/dashboard/admin',
            ],
        );
    }
}
