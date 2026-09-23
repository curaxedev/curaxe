@extends('emails.layout')

@section('content')
    <h1 style="margin:0 0 12px;font-size:20px;line-height:1.3;color:#1E1C1A;">Benvenuto, {{ $name }}!</h1>
    <p style="margin:0 0 8px;font-size:15px;line-height:1.6;color:#2D2A27;">
        Il tuo account famiglia è pronto. Puoi accedere con il codice via email — senza password —
        e pubblicare subito la tua prima richiesta di assistenza.
    </p>

    @include('emails.partials.button', ['url' => config('app.frontend_url').'/accedi', 'label' => 'Accedi alla piattaforma'])

    <p style="margin:0;font-size:13px;line-height:1.6;color:#7A7268;">
        Se non ti sei registrato tu, ignora questa email: nessuno può accedere senza il codice inviato al tuo indirizzo.
    </p>
@endsection
