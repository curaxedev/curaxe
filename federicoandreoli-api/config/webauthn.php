<?php

/**
 * WebAuthn / Passkey (admin).
 *
 * Produzione obbligatoria:
 *   WEBAUTHN_RP_ID=curaxe.it          ← dominio registrabile (MAI api.curaxe.it)
 *   WEBAUTHN_ORIGINS=https://curaxe.it,https://www.curaxe.it
 *
 * Le origini includono automaticamente FRONTEND_URL / FRONTEND_URLS
 * così CORS e passkey restano allineati.
 */

$fromWebauthn = array_filter(array_map(
    'trim',
    explode(',', (string) env(
        'WEBAUTHN_ORIGINS',
        env('WEBAUTHN_ORIGIN', '')
    ))
));

$fromFrontend = array_filter(array_map(
    'trim',
    explode(',', (string) env(
        'FRONTEND_URLS',
        env('FRONTEND_URL', env('APP_FRONTEND_URL', 'http://localhost:5173'))
    ))
));

$origins = array_values(array_unique(array_map(
    static fn (string $o) => rtrim($o, '/'),
    array_merge($fromWebauthn, $fromFrontend),
)));

if ($origins === []) {
    $origins = ['http://localhost:5173'];
}

return [
    'rp_id' => env('WEBAUTHN_RP_ID', 'localhost'),
    'rp_name' => env('WEBAUTHN_RP_NAME', env('APP_NAME', 'Curaxe')),
    'origins' => $origins,
];
