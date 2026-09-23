{{-- CTA principale: @include('emails.partials.button', ['url' => ..., 'label' => ...]) --}}
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px auto;">
    <tr>
        <td style="border-radius:12px;background-color:#2A5C82;">
            <a href="{{ $url }}"
               style="display:inline-block;padding:13px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:12px;">
                {{ $label }}
            </a>
        </td>
    </tr>
</table>
