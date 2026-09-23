<?php

namespace App\Mail\B2B;

use App\Mail\BaseMailable;
use App\Models\TeamMember;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

class TeamInviteMail extends BaseMailable
{
    public function __construct(public TeamMember $member, public string $organizationName) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Invito al team — '.$this->organizationName);
    }

    public function content(): Content
    {
        return new Content(view: 'emails.b2b.team-invite');
    }
}
