@extends('emails.layout')

@section('content')
    <h1 style="margin:0 0 12px;font-size:20px;line-height:1.3;color:#1E1C1A;">Il tuo codice di accesso</h1>
    <p style="margin:0 0 8px;font-size:15px;line-height:1.6;color:#2D2A27;">
        Usa questo codice per accedere alla piattaforma. È valido per {{ $ttlMinutes }} minuti.
    </p>

    @include('emails.partials.code', ['code' => $code])

    <p style="margin:0;font-size:13px;line-height:1.6;color:#7A7268;">
        Se non hai richiesto tu questo codice puoi ignorare questa email: nessuno può accedere al tuo account senza di esso.
    </p>
@endsection
