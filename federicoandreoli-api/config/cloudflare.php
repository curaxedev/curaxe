<?php

/**
 * Cloudflare (piano Free) — proxy trust, bot protection, Turnstile opzionale.
 *
 * Bot Fight Mode e WAF si configurano nella Dashboard Cloudflare (vedi docs/CLOUDFLARE-SETUP.md).
 * Qui preimpostiamo solo ciò che l’origin Laravel deve sapere.
 */
return [

    /*
    | Quando true, Laravel si fida degli header X-Forwarded-* / CF-Connecting-IP.
    | Abilitare SOLO se tutto il traffico pubblico passa da Cloudflare
    | (origin Hostinger chiuso o almeno non esposto direttamente).
    */
    'trust_proxies' => filter_var(env('CLOUDFLARE_TRUST_PROXIES', false), FILTER_VALIDATE_BOOL),

    /*
    | '*' = tutti i proxy (ok solo dietro Cloudflare con origin non raggiungibile direttamente).
    | Altrimenti elenco CIDR Cloudflare separati da virgola.
    | Lista aggiornata: https://www.cloudflare.com/ips/
    */
    'proxies' => env('CLOUDFLARE_PROXIES', '*'),

    /*
    | Turnstile (widget anti-bot gratuito) su login / OTP / registrazione.
    | Se site_key + secret_key sono vuoti, la verifica è disattivata.
    */
    'turnstile' => [
        'enabled' => filter_var(env('CLOUDFLARE_TURNSTILE_ENABLED', false), FILTER_VALIDATE_BOOL),
        'site_key' => env('CLOUDFLARE_TURNSTILE_SITE_KEY'),
        'secret_key' => env('CLOUDFLARE_TURNSTILE_SECRET_KEY'),
        'verify_url' => 'https://challenges.cloudflare.com/turnstile/v0/siteverify',
    ],

];
