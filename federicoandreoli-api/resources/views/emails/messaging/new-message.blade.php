@extends('emails.layout')

@section('content')
    <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#2D2A27;">Nuovo messaggio</h1>
    <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#2D2A27;">
        <strong>{{ $message->sender_name }}</strong> ti ha scritto in
        <strong>{{ $thread->subject }}</strong>:
    </p>
    <p style="margin:0;padding:12px 16px;background:#F4F1EE;border-radius:8px;font-size:15px;line-height:1.6;color:#2D2A27;">
        {{ \Illuminate\Support\Str::limit($message->body, 280) }}
    </p>
@endsection
