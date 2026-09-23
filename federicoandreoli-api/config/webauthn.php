<?php

return [
    'rp_id' => env('WEBAUTHN_RP_ID', 'localhost'),
    'rp_name' => env('WEBAUTHN_RP_NAME', env('APP_NAME', 'Curaxe')),
    'origins' => array_values(array_filter(array_map(
        'trim',
        explode(',', (string) env(
            'WEBAUTHN_ORIGINS',
            env('WEBAUTHN_ORIGIN', env('FRONTEND_URL', 'http://localhost:5173'))
        ))
    ))),
];
