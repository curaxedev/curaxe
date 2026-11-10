@extends('emails.layout')

@section('content')
    <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#2D2A27;">I tuoi consensi Curaxe</h1>
    <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#2D2A27;">
        Ciao <strong>{{ $name }}</strong>, un amministratore ti invita a rivedere privacy e preferenze
        newsletter sul tuo account.
    </p>
    <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#2D2A27;">
        Privacy accettata:
        <strong>{{ $privacyAcceptedAt !== '' ? $privacyAcceptedAt : 'non registrata' }}</strong><br>
        Newsletter / comunicazioni:
        <strong>{{ $newsletterOptIn ? 'attive' : 'non attive' }}</strong>
    </p>
    @include('emails.partials.button', ['url' => $manageUrl, 'label' => 'Gestisci preferenze'])
    <p style="margin:16px 0 0;font-size:13px;line-height:1.5;color:#6B6560;">
        Se non hai richiesto questo messaggio puoi ignorarlo: i tuoi diritti GDPR restano invariati.
    </p>
@endsection
