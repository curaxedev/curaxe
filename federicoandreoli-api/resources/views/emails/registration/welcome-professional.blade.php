@extends('emails.layout')

@section('content')
    <h1 style="margin:0 0 12px;font-size:20px;line-height:1.3;color:#1E1C1A;">Benvenuto, {{ $name }}!</h1>
    <p style="margin:0 0 8px;font-size:15px;line-height:1.6;color:#2D2A27;">
        La tua registrazione come professionista è stata ricevuta. Conferma il tuo indirizzo email
        per attivare tutte le funzionalità del profilo.
    </p>

    @include('emails.partials.button', ['url' => $verificationUrl, 'label' => 'Conferma email'])

    <p style="margin:0 0 8px;font-size:14px;line-height:1.6;color:#2D2A27;">
        Dopo la conferma potrai accedere con il codice via email e completare il profilo:
        foto, esperienze, disponibilità e documenti aumentano la tua visibilità verso famiglie e strutture.
    </p>
    <p style="margin:0;font-size:13px;line-height:1.6;color:#7A7268;">
        Il link è valido per 7 giorni. Se non ti sei registrato tu, ignora questa email.
    </p>
@endsection
