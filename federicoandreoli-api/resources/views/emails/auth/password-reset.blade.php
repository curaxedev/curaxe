@extends('emails.layout')

@section('content')
    <h1 style="margin:0 0 12px;font-size:20px;line-height:1.3;color:#1E1C1A;">Reimposta la tua password</h1>
    <p style="margin:0 0 8px;font-size:15px;line-height:1.6;color:#2D2A27;">
        Abbiamo ricevuto una richiesta di reimpostazione password per il tuo account.
        Il link è valido per {{ $ttlMinutes }} minuti.
    </p>

    @include('emails.partials.button', ['url' => $resetUrl, 'label' => 'Reimposta password'])

    <p style="margin:0 0 8px;font-size:13px;line-height:1.6;color:#7A7268;">
        Se il pulsante non funziona, copia e incolla questo link nel browser:
    </p>
    <p style="margin:0 0 16px;font-size:12px;line-height:1.6;color:#2A5C82;word-break:break-all;">
        {{ $resetUrl }}
    </p>
    <p style="margin:0;font-size:13px;line-height:1.6;color:#7A7268;">
        Se non hai richiesto tu la reimpostazione, ignora questa email: la tua password resterà invariata.
    </p>
@endsection
