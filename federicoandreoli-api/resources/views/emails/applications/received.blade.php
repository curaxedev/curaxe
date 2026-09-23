@extends('emails.layout')

@section('content')
    <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#2D2A27;">Nuova candidatura</h1>
    <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#2D2A27;">
        Hai ricevuto una candidatura da <strong>{{ $application->applicant_name }}</strong>
        per <strong>{{ $application->target_title }}</strong>.
    </p>
    <p style="margin:0;font-size:15px;line-height:1.6;color:#2D2A27;">
        Accedi alla dashboard per valutare il candidato e aggiornare lo stato nella pipeline.
    </p>
@endsection
