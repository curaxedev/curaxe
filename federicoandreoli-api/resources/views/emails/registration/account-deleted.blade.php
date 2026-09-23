@extends('emails.layout')

@section('content')
    <h1 style="margin:0 0 12px;font-size:20px;line-height:1.3;color:#1E1C1A;">Account eliminato</h1>
    <p style="margin:0 0 8px;font-size:15px;line-height:1.6;color:#2D2A27;">
        Ciao {{ $name }}, confermiamo che il tuo account e i dati associati sono stati eliminati
        come richiesto (GDPR, art. 17 — diritto alla cancellazione).
    </p>
    <p style="margin:0 0 8px;font-size:14px;line-height:1.6;color:#2D2A27;">
        Se cambierai idea, potrai registrarti di nuovo in qualsiasi momento.
    </p>
    <p style="margin:0;font-size:13px;line-height:1.6;color:#7A7268;">
        Se non hai richiesto tu la cancellazione, contattaci immediatamente dalla pagina Contatti.
    </p>
@endsection
