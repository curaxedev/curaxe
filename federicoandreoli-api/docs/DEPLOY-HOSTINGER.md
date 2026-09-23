# Checklist deploy Hostinger Cloud Professional — curaxe.it

Produzione target:

| Servizio | Dominio | Document root |
|----------|---------|---------------|
| Frontend SPA | `https://curaxe.it` (+ `www`) | build `federicoandreoli-web/dist` |
| API Laravel | `https://api.curaxe.it` | `federicoandreoli-api/public` |

Flusso consigliato: **GitHub → SSH pull su Hostinger** (source of truth = repo).

## 1. Prerequisiti Hostinger Cloud Professional

1. PHP 8.3+, Composer, Node 20+ (build frontend in CI o sul server)
2. MySQL database creato
3. Casella SMTP `noreply@curaxe.it` (o dominio mail Hostinger)
4. Sottodomini `curaxe.it` e `api.curaxe.it` con SSL Let’s Encrypt
5. Accesso SSH abilitato sul piano Cloud Professional

## 2. Allineamento GitHub

```bash
# In locale, dopo merge su main:
git push origin main
```

Sul server (SSH):

```bash
# Backend
cd ~/domains/api.curaxe.it/federicoandreoli-api   # adatta al path Hostinger
git pull origin main
composer install --no-dev --optimize-autoloader
php artisan migrate --force
php artisan storage:link
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Frontend
cd ~/domains/curaxe.it/federicoandreoli-web
git pull origin main
npm ci
VITE_USE_MOCKS=false VITE_API_URL=https://api.curaxe.it npm run build
# Copia/pubblica contenuto di dist/ sulla document root del dominio
```

## 3. Variabili `.env` API (produzione)

```env
APP_URL=https://api.curaxe.it
FRONTEND_URL=https://curaxe.it
FRONTEND_URLS=https://curaxe.it,https://www.curaxe.it
SANCTUM_STATEFUL_DOMAINS=curaxe.it,www.curaxe.it

MAIL_HOST=smtp.hostinger.com
MAIL_PORT=465
MAIL_FROM_ADDRESS=noreply@curaxe.it

# Resend (consigliato in produzione) — vedi docs/RESEND-SETUP.md
MAIL_MAILER=resend
RESEND_API_KEY=

# Cloudflare — vedi docs/CLOUDFLARE-SETUP.md
CLOUDFLARE_TRUST_PROXIES=true
CLOUDFLARE_PROXIES=*
CLOUDFLARE_TURNSTILE_ENABLED=false
CLOUDFLARE_TURNSTILE_SITE_KEY=
CLOUDFLARE_TURNSTILE_SECRET_KEY=

# Stripe: preferire wizard landlord in Admin → Abbonamenti.
# Opzionale fallback:
STRIPE_MODE=live
STRIPE_KEY=
STRIPE_SECRET=
STRIPE_WEBHOOK_SECRET=

WEBAUTHN_RP_ID=curaxe.it
WEBAUTHN_RP_NAME=Curaxe
WEBAUTHN_ORIGIN=https://curaxe.it
WEBAUTHN_ORIGINS=https://curaxe.it,https://www.curaxe.it

QUEUE_CONNECTION=database
CACHE_STORE=database
```

## 4. Coda e cron (obbligatori)

Cron Hostinger:

```
* * * * * cd /path/to/federicoandreoli-api && php artisan schedule:run >> /dev/null 2>&1
```

Worker email/job (Supervisor, o `screen`/`tmux` se non disponibile):

```bash
php artisan queue:work database --sleep=1 --tries=3 --max-time=3600
```

## 5. Stripe post-deploy (landlord)

1. Login admin su `https://curaxe.it` (password+TOTP o passkey)
2. Dashboard → **Abbonamenti** → procedura guidata Stripe
3. Modalità test → webhook URL `https://api.curaxe.it/api/v1/webhooks/stripe`
4. Incolla chiavi + Price ID + giorni prova → diagnostica
5. Quando ok, passa a **live** e ripeti chiavi live

Eventi webhook obbligatori: vedi wizard (checkout, subscription.*, invoice.*, refund.*, trial_will_end).

Guide correlate:

- Email Resend: [`RESEND-SETUP.md`](RESEND-SETUP.md)
- Cloudflare bot/Turnstile: [`CLOUDFLARE-SETUP.md`](CLOUDFLARE-SETUP.md)
- Audit sicurezza integrazioni: [`SECURITY-INTEGRATIONS.md`](SECURITY-INTEGRATIONS.md)

## 6. Passkey landlord

1. Account admin → **Accesso sicuro (Passkey)** → Aggiungi passkey
2. Logout → Accedi con email admin → **Accedi con passkey**
3. RP ID deve essere `curaxe.it` (HTTPS obbligatorio)

## 7. Verifica post-deploy

- `GET https://api.curaxe.it/up` → 200
- `GET https://api.curaxe.it/api/v1/meta` → JSON
- Login OTP / admin
- Checkout test (Stripe test mode)
- Webhook: Stripe Dashboard → Send test event `checkout.session.completed`
- Header sicurezza presenti (`SecurityHeaders`)

## Sicurezza

- Mai commitare `.env`
- Secret Stripe solo cifrati in `billing_settings` (o env fallback)
- Rate limiting su auth, passkey login, webhook
- Audit log su settings Stripe, refund, trial, passkey CRUD
