<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>{{ $subject ?? config('app.name') }}</title>
</head>
{{-- Palette "Care & Trust" allineata a federicoandreoli-web/src/design-system/tokens.css --}}
<body style="margin:0;padding:0;background-color:#F4F1EE;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#2D2A27;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F4F1EE;padding:24px 12px;">
        <tr>
            <td align="center">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#FDFCFB;border-radius:16px;border:1px solid #E5DDD5;overflow:hidden;">
                    <tr>
                        <td style="background-color:#2A5C82;padding:20px 32px;">
                            <span style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:0.2px;">
                                {{ config('app.name') }}
                            </span>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:32px;">
                            @yield('content')
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:20px 32px;border-top:1px solid #E5DDD5;">
                            <p style="margin:0 0 6px;font-size:12px;line-height:1.5;color:#7A7268;">
                                Hai ricevuto questa email perché hai un account o una richiesta attiva su {{ config('app.name') }}.
                            </p>
                            <p style="margin:0;font-size:12px;line-height:1.5;color:#7A7268;">
                                Questa casella non è presidiata: per assistenza usa la sezione Contatti della piattaforma.
                            </p>
                        </td>
                    </tr>
                </table>
                <p style="margin:16px 0 0;font-size:11px;color:#7A7268;">
                    &copy; {{ date('Y') }} {{ config('app.name') }} · Tutti i diritti riservati
                </p>
            </td>
        </tr>
    </table>
</body>
</html>
