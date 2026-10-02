@extends('emails.layout')

@section('content')
    <h1 style="margin:0 0 12px;font-size:20px;line-height:1.3;color:#1E1C1A;">Benvenuto, {{ $name }}!</h1>
    <p style="margin:0 0 8px;font-size:15px;line-height:1.6;color:#2D2A27;">
        Il tuo account famiglia è quasi pronto. Inserisci questo codice per confermare e
        attivare l’account — senza password.
    </p>

    @include('emails.partials.code', ['code' => $code])

    <p style="margin:0 0 8px;font-size:14px;line-height:1.6;color:#2D2A27;">
        Il codice è valido per {{ $ttlMinutes }} minuti. Dopo la conferma accederai alla dashboard
        e potrai pubblicare subito la tua prima richiesta di assistenza.
    </p>
    <p style="margin:0;font-size:13px;line-height:1.6;color:#7A7268;">
        Se non ti sei registrato tu, ignora questa email: nessuno può attivare l’account senza il codice.
    </p>
@endsection
