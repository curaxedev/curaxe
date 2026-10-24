{{-- Codice monouso: grande + riga dominio (#code) per suggerimento tastiera iOS/Android --}}
@php
    $otpHost = parse_url((string) config('app.frontend_url', config('app.url')), PHP_URL_HOST)
        ?: parse_url((string) config('app.url'), PHP_URL_HOST)
        ?: 'curaxe.it';
@endphp
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
    <tr>
        <td align="center" style="background-color:#EBF4FB;border:1px solid #C8DEF0;border-radius:12px;padding:18px;">
            <span style="font-family:'SF Mono',SFMono-Regular,Menlo,Consolas,monospace;font-size:30px;font-weight:700;letter-spacing:8px;color:#1E4A6A;">{{ $code }}</span>
        </td>
    </tr>
</table>
{{-- Formato riconosciuto da Apple Mail / QuickType per autofill OTP sul sito --}}
<p style="margin:0 0 8px;font-size:13px;line-height:1.5;color:#7A7268;text-align:center;">
    Il tuo codice di accesso è {{ $code }}.
</p>
<p style="margin:0;font-size:12px;line-height:1.4;color:#9A9288;text-align:center;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;">
    @@{{ $otpHost }} #{{ $code }}
</p>
