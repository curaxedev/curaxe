# Autenticazione modulare

## Ruoli (`App\Domains\Auth\Enums\UserRole`)

| Ruolo | Valore | Canale (policy default) |
|-------|--------|-------------------------|
| Amministratore piattaforma | `platform_admin` | Password + TOTP |
| Professionista | `professional` | OTP email |
| Agenzia | `agency` | Password + TOTP |
| Struttura B2B | `structure` | Password + TOTP |
| Utente pubblico | `public_user` | OTP email |

La mappa ruolo → canale è centralizzata in `App\Domains\Auth\Services\AuthChannelResolver`. Per affinare (es. solo **badanti** con OTP e altri professionisti con password) introdurre un sottotipo o flag su `users` e aggiornare il resolver.

## Endpoint

- `GET /api/v1/auth/policies` — JSON con `roles_to_auth_channel` e descrizioni canali (nessun dato utente).
- `POST /api/v1/auth/email-otp/request` — richiesta codice (rate limit `otp`).
- `POST /api/v1/auth/email-otp/verify` — verifica codice (rate limit `otp-verify`; logica da completare).

## Sanctum (SPA)

- Cookie di sessione first-party: abilitare `statefulApi()` (già in `bootstrap/app.php`) e allineare `SANCTUM_STATEFUL_DOMAINS` con l’host del frontend.
- CORS: `FRONTEND_URL` / `FRONTEND_URLS` in `.env` devono elencare le origini esatte; `supports_credentials` è `true` in `config/cors.php`.

## Password + 2FA (admin, agenzie, strutture)

Implementazione successiva consigliata: Laravel Fortify o flusso custom con `pragmarx/google2fa`, recovery codes, e middleware che forza 2FA per i ruoli `PasswordTotp` prima di emettere token Sanctum.
