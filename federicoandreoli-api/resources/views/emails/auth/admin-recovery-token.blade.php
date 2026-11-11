@extends('emails.layout')

@section('content')
    <h1 style="margin:0 0 12px;font-size:20px;line-height:1.3;color:#1E1C1A;">Ripristino accesso admin</h1>
    <p style="margin:0 0 8px;font-size:15px;line-height:1.6;color:#2D2A27;">
        Ciao {{ $adminName }}, è stato richiesto un codice di ripristino (IP {{ $ip }}).
        Incollalo nella schermata di recupero. Valido {{ $ttlMinutes }} minuti.
    </p>

    <p style="margin:16px 0;padding:16px;background:#F7F4F0;border-radius:12px;font-family:ui-monospace,monospace;font-size:14px;word-break:break-all;color:#1E1C1A;">
        {{ $token }}
    </p>

    <p style="margin:0;font-size:13px;line-height:1.6;color:#7A7268;">
        Se non sei stato tu, ignora questa email: senza il codice nessuno può entrare. Controlla subito le passkey e le sessioni attive.
    </p>
@endsection
