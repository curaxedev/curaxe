<?php

namespace App\Mail\Applications;

use App\Mail\BaseMailable;
use App\Models\Application;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

class ApplicationStatusChangedMail extends BaseMailable
{
    public function __construct(public Application $application) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Aggiornamento candidatura');
    }

    public function content(): Content
    {
        return new Content(view: 'emails.applications.status-changed');
    }
}
