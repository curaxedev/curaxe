<?php

namespace App\Mail\Applications;

use App\Mail\BaseMailable;
use App\Models\Application;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

class ApplicationReceivedMail extends BaseMailable
{
    public function __construct(public Application $application) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Nuova candidatura ricevuta');
    }

    public function content(): Content
    {
        return new Content(view: 'emails.applications.received');
    }
}
