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

## Passkey landlord

- Solo `platform_admin`, WebAuthn con challenge one-shot in cache
- Anti-enumerazione su login options
- RP ID / origin da config (prod: `curaxe.it` + HTTPS)

## Checklist pre-produzione

- [ ] `APP_DEBUG=false`, `APP_ENV=production`
- [ ] HTTPS su `curaxe.it` e `api.curaxe.it`
- [ ] Resend dominio verificato + `MAIL_MAILER=resend`
- [ ] Cloudflare DNS Proxied + SSL Full (strict)
- [ ] TrustProxies ON solo dietro CF
- [ ] Turnstile ON + widget login (quando chiavi pronte)
- [ ] Stripe test end-to-end (checkout + webhook + portal)
- [ ] Passkey admin registrata su device landlord
- [ ] Coda `queue:work` e cron `schedule:run` attivi
