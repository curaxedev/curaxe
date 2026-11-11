@extends('emails.layout')

@section('content')
    <h1 style="margin:0 0 12px;font-size:20px;line-height:1.3;color:#1E1C1A;">Recupero accesso utilizzato</h1>
    <p style="margin:0 0 8px;font-size:15px;line-height:1.6;color:#2D2A27;">
        Ciao {{ $adminName }}, è stata aperta una sessione di recupero admin.
    </p>
    <ul style="margin:0 0 16px;padding-left:18px;font-size:14px;line-height:1.6;color:#2D2A27;">
        <li>Metodo: {{ $method }}</li>
        <li>IP: {{ $ip }}</li>
        <li>Quando: {{ $at }}</li>
    </ul>
    <p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#2D2A27;">
        La sessione consente solo di aggiungere una passkey o riattivare l’accesso password.
        <a href="{{ $accountUrl }}" style="color:#1B4D6E;">Apri sicurezza admin</a>
    </p>
    <p style="margin:0;font-size:13px;line-height:1.6;color:#7A7268;">
        Se non sei stato tu, disconnetti le sessioni e contatta immediatamente il team.
    </p>
@endsection
