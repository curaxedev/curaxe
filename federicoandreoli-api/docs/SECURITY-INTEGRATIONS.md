# Audit integrazioni e sicurezza — Stripe, mail, edge

Review effettuata sul codice Curaxe (API Laravel + SPA). Aggiornare dopo cambi rilevanti.

## Stripe — hardening applicato (post-audit)

- Mock checkout/complete **solo** in `local`/`testing`
- Audience **sempre** dal ruolo utente (client ignorato)
- Checkout/portal/cancel ristretti a `professional|agency|structure` + throttle `billing`
- Return URL: host-exact + no userinfo (`@` open redirect bloccato)
- Refund: solo charge dell’ultima invoice abbonamento (fail closed)
- Webhook: resolve user solo via `client_reference_id` / metadata (niente email)
- `charge.refunded` aggiorna refunds nested
- Setup complete richiede tutti e 3 i Price ID; diagnostica non auto-completa setup
- History capped (100 / payload 50)


## Stripe — attenzioni operative (non bug codice)

1. Completare wizard landlord in **test**, poi **live** con chiavi distinte
2. Webhook endpoint solo HTTPS `https://api.curaxe.it/api/v1/webhooks/stripe`
3. Se Cloudflare Bot Fight Mode Free blocca webhook Stripe → spegnerlo su `api` o allow IP Stripe (vedi `CLOUDFLARE-SETUP.md`)
4. Non ruotare `APP_KEY` senza re-inserire i secret Stripe (sono cifrati con quella chiave)
5. Customer Portal: configurare prodotti/price in Stripe Dashboard allineati ai Price ID del wizard

## Cloudflare — predisposto

- TrustProxies opzionale (`CLOUDFLARE_TRUST_PROXIES`)
- Turnstile middleware su login / OTP request / registrazione / reset request
- Meta pubblica `GET /api/v1/security/meta` (solo site key)
- Header sicurezza + HSTS su HTTPS
- Guida passo-passo: [`CLOUDFLARE-SETUP.md`](CLOUDFLARE-SETUP.md)

## Resend — predisposto

- Mailer `resend` + SDK `resend/resend-php`
- Fallback `log` se manca `RESEND_API_KEY`
- Failover config: resend → smtp → log
- Guida: [`RESEND-SETUP.md`](RESEND-SETUP.md)

## Passkey landlord + Sicurezza totale

Stack: `web-auth/webauthn-lib` v5 (non Laravel Passkeys). Solo `platform_admin`.

### Comportamento

- Challenge one-shot in cache; `userVerification=required`; attachment **non** forzato a `platform` (Face ID / iCloud / Google PM **e** chiavette USB)
- Multi-passkey + etichetta + transports/aaguid in UI Account
- Login passkey: anti-enumerazione su options; token Sanctum `spa-passkey`
- **Sicurezza totale** (`admin_security_settings`): se ON, azioni sensibili richiedono header `X-Step-Up-Token`
- Step-up: `POST /admin/security/step-up/options|verify` → token opaco TTL ~4 min, **single-use**, **bound to action** (`AdminSensitiveAction`)
- Middleware `step_up:{action}` + check inline su billing settings / passkey CRUD / security settings
- Non eliminare l’ultima passkey se Sicurezza totale è ON
- Login password blocca `suspended_at` (allineato al login passkey)
- Notifiche login: `login_alerts_enabled` + fino a 5 email; dispositivi in `admin_login_devices`; mail Resend `AdminLoginAlertMail`

### Errori da non ripetere

| Rischio | Mitigazione |
|---------|-------------|
| Step-up solo in React | Middleware / `requireIfEnabled` server-side |
| Token riusabile cross-action | `consume()` verifica `action` + pull cache |
| RP ID = `api.curaxe.it` | Config `webauthn.rp_id` = `curaxe.it` |
| Origin cross-subdomain | Origins whitelist in `config/webauthn.php` |
| Challenge riusabile | `cache()->pull` one-shot |
| UV non verificato | `USER_VERIFICATION_REQUIREMENT_REQUIRED` |
| Solo authenticators platform | Attachment no-preference |
| Enumerazione email passkey login | Options fake anche se email sconosciuta |
| Log secret Stripe / TOTP / private key material | Audit solo hint/flags |
| Lockout: solo-passkey login | Password+TOTP resta recovery |
| Sicurezza totale con 0 passkey | Gate server + UI `canEnableSecurityTotal` |

### Checklist deploy sicurezza admin

- [ ] Almeno 1 passkey registrata sul device landlord
- [ ] Attivare Sicurezza totale da Account dopo verifica step-up
- [ ] Configurare email alert login (e verificare ricezione Resend)
- [ ] Verificare refund / suspend utente chiedono passkey con totale ON
- [ ] RP ID / origins allineati a produzione HTTPS
- [ ] Rate limit `throttle:step-up` attivo

## Checklist pre-produzione

- [ ] `APP_DEBUG=false`, `APP_ENV=production`
- [ ] HTTPS su `curaxe.it` e `api.curaxe.it`
- [ ] Resend dominio verificato + `MAIL_MAILER=resend`
- [ ] Cloudflare DNS Proxied + SSL Full (strict)
- [ ] TrustProxies ON solo dietro CF
- [ ] Turnstile ON + widget login (quando chiavi pronte)
- [ ] Stripe test end-to-end (checkout + webhook + portal)
- [ ] Passkey admin registrata su device landlord
- [ ] Sicurezza totale ON + prova azione sensibile (step-up)
- [ ] Cron `schedule:run` attivo (email OTP/welcome sono sincrone, non richiedono queue)
