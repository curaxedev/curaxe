@extends('emails.layout')

@section('content')
    <h1 style="margin:0 0 12px;font-size:20px;line-height:1.3;color:#1E1C1A;">
        @if ($outcome === 'failed')
            Tentativi di accesso falliti
        @elseif ($outcome === 'blocked')
            Accesso bloccato
        @elseif ($isNewDevice)
            Nuovo dispositivo rilevato
        @else
            Nuovo accesso admin
        @endif
    </h1>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#2D2A27;">
        Ciao {{ $adminName }}, ecco il dettaglio dell’evento di sicurezza sul tuo account amministratore Curaxe.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 16px;font-size:14px;color:#2D2A27;">
        <tr>
            <td style="padding:6px 0;color:#7A7268;">Quando</td>
            <td style="padding:6px 0;text-align:right;">{{ $at }}</td>
        </tr>
        <tr>
            <td style="padding:6px 0;color:#7A7268;">Esito</td>
            <td style="padding:6px 0;text-align:right;">{{ $outcome }}</td>
        </tr>
        <tr>
            <td style="padding:6px 0;color:#7A7268;">Metodo</td>
            <td style="padding:6px 0;text-align:right;">{{ $method }}</td>
        </tr>
        <tr>
            <td style="padding:6px 0;color:#7A7268;">Dispositivo</td>
            <td style="padding:6px 0;text-align:right;">{{ $deviceLabel }}</td>
        </tr>
        <tr>
            <td style="padding:6px 0;color:#7A7268;">IP</td>
            <td style="padding:6px 0;text-align:right;">{{ $ip }}</td>
        </tr>
    </table>
    <p style="margin:0 0 16px;font-size:12px;line-height:1.5;color:#7A7268;word-break:break-all;">
        {{ $userAgent }}
    </p>
    <p style="margin:0 0 8px;font-size:14px;line-height:1.6;color:#2D2A27;">
        Se non sei stato tu, apri subito
        <a href="{{ $accountUrl }}" style="color:#2F6F5E;">Il mio account</a>,
        disconnetti le sessioni e verifica le passkey.
    </p>
@endsection
