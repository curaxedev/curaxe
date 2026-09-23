@extends('emails.layout')

@section('content')
    <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#2D2A27;">Invito al team</h1>
    <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#2D2A27;">
        Sei stato invitato a collaborare con <strong>{{ $organizationName }}</strong>
        come <strong>{{ $member->role_label }}</strong>.
    </p>
    <p style="margin:0;font-size:15px;line-height:1.6;color:#2D2A27;">
        Accedi alla piattaforma con l’email <strong>{{ $member->email }}</strong> per accettare l’invito.
    </p>
@endsection
