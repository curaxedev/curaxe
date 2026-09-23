# Guida Cloudflare Free — bot protection + origin Laravel (curaxe.it)

Obiettivo: mettere Cloudflare davanti a `curaxe.it` e `api.curaxe.it`, attivare la protezione bot gratuita, e far sì che Laravel veda l’IP reale del visitatore (rate limit / audit corretti).

Il codice è predisposto:

- `CLOUDFLARE_TRUST_PROXIES` → TrustProxies Laravel
- Turnstile opzionale su login / OTP / registrazione / reset password
- `GET /api/v1/security/meta` espone solo la **site key** pubblica Turnstile

## Architettura consigliata

```text
Utente → Cloudflare (CDN + Bot Fight + SSL) → Hostinger origin (API + static SPA)
Stripe webhooks → Cloudflare (api.curaxe.it) → Laravel /api/v1/webhooks/stripe
```

**Importante (piano Free):** Bot Fight Mode non si può “bypassare” con WAF Skip rules. I webhook Stripe possono essere bloccati. Soluzioni pratiche:

1. **Consigliata Free:** attiva Bot Fight Mode su `curaxe.it` (frontend); su `api.curaxe.it` tieni Bot Fight **OFF** e usa rate-limit Laravel + firma Stripe webhook (già implementata).
2. Oppure: IP Access Rules che permettono gli IP webhook Stripe (lista ufficiale Stripe) **prima** che Bot Fight scatti — funziona meglio di WAF Skip.
3. Piano Pro: Super Bot Fight Mode con eccezioni per path.

## Passi Cloudflare (tu)

### A. Zona DNS

1. Crea account Cloudflare → Add site → `curaxe.it` (piano **Free**)
2. Cambia nameserver presso il registrar (Hostinger) con quelli Cloudflare
3. Record DNS (Proxy **arancione** = Proxied):

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| A/CNAME | `@` | IP o host Hostinger frontend | Proxied |
| A/CNAME | `www` | `curaxe.it` | Proxied |
| A/CNAME | `api` | IP/host Hostinger API | Proxied |

4. SSL/TLS → **Full (strict)** quando Hostinger ha già Let’s Encrypt sull’origin
5. Always Use HTTPS: ON
6. Minimum TLS: 1.2

### B. Bot Fight Mode (gratuito)

1. Security → Bots → **Bot Fight Mode**: ON sul piano Free
2. Applicarlo preferibilmente al traffico web (`curaxe.it`). Per `api` vedi nota sopra (OFF o IP allow Stripe).
3. Osserva Security → Events i primi giorni (falsi positivi possibili)

### C. Protezioni Free extra utili

- Security Level: **Medium** (o High solo sotto attacco)
- WAF → Managed rules: abilita ciò che il Free offre
- Under Attack Mode: solo emergenza (challenge a tutti)
- Caching: per SPA, Cache Rule “Bypass” su HTML/`/` se serve SPA sempre fresca; cache aggressiva solo su `/assets/*`

### D. Turnstile (widget anti-bot gratuito — consigliato su form)

1. Cloudflare → Turnstile → Add site
2. Domini: `curaxe.it`, `www.curaxe.it`, `localhost` (dev)
3. Widget mode: **Managed**
4. Copia **Site Key** + **Secret Key**

Sul server API `.env`:

```env
CLOUDFLARE_TURNSTILE_ENABLED=true
CLOUDFLARE_TURNSTILE_SITE_KEY=0x4AAAAA...
CLOUDFLARE_TURNSTILE_SECRET_KEY=0x4AAAAA...
```

Frontend: quando `GET /api/v1/security/meta` ha `turnstile.enabled=true`, mostra il widget e invia `turnstileToken` nel body di login/OTP/registrazione.

Finché `CLOUDFLARE_TURNSTILE_ENABLED=false` (default), le API non richiedono il token (sviluppo/staging ok).

### E. TrustProxies Laravel (IP reale)

Solo **dopo** che tutto il traffico pubblico passa da Cloudflare:

```env
CLOUDFLARE_TRUST_PROXIES=true
CLOUDFLARE_PROXIES=*
```

Poi `php artisan config:cache`.

**Sicurezza:** con `CLOUDFLARE_PROXIES=*` l’origin Hostinger non deve essere raggiungibile direttamente da internet (o almeno non pubblicizzato). Idealmente firewall Hostinger: solo IP Cloudflare ([lista](https://www.cloudflare.com/ips/)).

### F. Webhook Stripe + Cloudflare

1. Endpoint: `https://api.curaxe.it/api/v1/webhooks/stripe`
2. In Stripe Dashboard crea endpoint con eventi del wizard admin
3. Su Cloudflare per `api`:
   - Bot Fight Mode **OFF**, oppure
   - IP Access Rule Allow per IP Stripe webhooks (documentazione Stripe “Webhook IPs”)
4. Verifica firma: già gestita lato Laravel (`Stripe-Signature` + signing secret)

Non mettere challenge HTML davanti al path webhook.

## Variabili `.env` complete (API)

```env
# Cloudflare edge
CLOUDFLARE_TRUST_PROXIES=true
CLOUDFLARE_PROXIES=*

CLOUDFLARE_TURNSTILE_ENABLED=true
CLOUDFLARE_TURNSTILE_SITE_KEY=
CLOUDFLARE_TURNSTILE_SECRET_KEY=
```

## Checklist go-live

- [ ] Nameserver Cloudflare attivi su `curaxe.it`
- [ ] `curaxe.it` + `api.curaxe.it` Proxied, SSL Full (strict)
- [ ] Bot Fight Mode ON (frontend); API gestita per non bloccare Stripe
- [ ] `CLOUDFLARE_TRUST_PROXIES=true` + config cache
- [ ] Turnstile keys + `ENABLED=true` (quando UI widget pronta)
- [ ] Test: login OTP, Checkout Stripe, webhook test event da Dashboard Stripe
- [ ] `request()->ip()` in tinker/log non è più un IP Cloudflare generico

## Cosa non fare

- Non attivare “Under Attack” in modo permanente
- Non lasciare `APP_DEBUG=true` in produzione dietro CF
- Non esporre `STRIPE_SECRET` / `RESEND_API_KEY` / Turnstile secret al frontend
- Non usare Bot Fight Mode Free sul path webhook senza allow IP Stripe
