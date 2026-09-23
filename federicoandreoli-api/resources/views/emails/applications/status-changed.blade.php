@extends('emails.layout')

@section('content')
    <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#2D2A27;">Candidatura aggiornata</h1>
    <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#2D2A27;">
        Lo stato della tua candidatura per <strong>{{ $application->target_title }}</strong>
        è ora: <strong>{{ $application->status }}</strong>.
    </p>
    <p style="margin:0;font-size:15px;line-height:1.6;color:#2D2A27;">
        Accedi alla dashboard per i dettagli.
    </p>
@endsection
