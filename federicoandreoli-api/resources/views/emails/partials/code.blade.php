{{-- Codice monouso ben leggibile: @include('emails.partials.code', ['code' => ...]) --}}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
    <tr>
        <td align="center" style="background-color:#EBF4FB;border:1px solid #C8DEF0;border-radius:12px;padding:18px;">
            <span style="font-family:'SF Mono',SFMono-Regular,Menlo,Consolas,monospace;font-size:30px;font-weight:700;letter-spacing:8px;color:#1E4A6A;">{{ $code }}</span>
        </td>
    </tr>
</table>
