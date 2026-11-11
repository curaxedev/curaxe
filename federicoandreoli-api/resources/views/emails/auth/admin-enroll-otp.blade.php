@extends('emails.layout')

@section('content')
    <h1 style="margin:0 0 12px;font-size:20px;line-height:1.3;color:#1E1C1A;">Nuova passkey admin</h1>
    <p style="margin:0 0 8px;font-size:15px;line-height:1.6;color:#2D2A27;">
        Ciao {{ $adminName }}, usa questo codice per registrare una nuova passkey sul dispositivo corrente.
        Valido {{ $ttlMinutes }} minuti.
    </p>

    @include('emails.partials.code', ['code' => $code])

    <p style="margin:0;font-size:13px;line-height:1.6;color:#7A7268;">
        Se non hai richiesto tu questa operazione, ignora l’email e verifica subito le impostazioni di sicurezza admin.
    </p>
@endsection
