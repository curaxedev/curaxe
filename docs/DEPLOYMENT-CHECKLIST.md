# Checklist DNS, SSL e hosting (Hostinger Cloud Professional)

Domini produzione:

| Ruolo | Dominio |
|-------|---------|
| Frontend SPA | `https://curaxe.it` (+ `www.curaxe.it`) |
| API Laravel | `https://api.curaxe.it` |

Flusso: push GitHub → SSH su Hostinger → `git pull` + build/migrate. Dettaglio operativo: [federicoandreoli-api/docs/DEPLOY-HOSTINGER.md](../federicoandreoli-api/docs/DEPLOY-HOSTINGER.md).

## DNS

- [ ] Record **A** / **CNAME** per `curaxe.it` e `www` → IP Hostinger
- [ ] Record **A** / **CNAME** per `api.curaxe.it` → stesso o host API
- [ ] Propagazione verificata (`dig curaxe.it`, `dig api.curaxe.it`)

## SSL / TLS

- [ ] Let’s Encrypt su `curaxe.it`, `www.curaxe.it`, `api.curaxe.it`
- [ ] Redirect HTTP → HTTPS
- [ ] `APP_URL=https://api.curaxe.it`, `FRONTEND_URL=https://curaxe.it`

## Hosting

### Frontend (`curaxe.it`)

- [ ] Document root = contenuto `federicoandreoli-web/dist` (SPA statica)
- [ ] Build: `VITE_USE_MOCKS=false VITE_API_URL=https://api.curaxe.it npm run build`

### API (`api.curaxe.it`)

- [ ] PHP 8.3+, document root → `federicoandreoli-api/public`
- [ ] Estensioni: openssl, pdo, mbstring, tokenizer, xml, curl, ctype, json, fileinfo, bcmath, pdo_mysql
- [ ] `storage/` e `bootstrap/cache/` scrivibili
- [ ] Cron `schedule:run` + `queue:work database`

## Post-deploy

- [ ] `php artisan migrate --force` (dopo backup DB)
- [ ] `GET https://api.curaxe.it/up` → 200
- [ ] CORS SPA → API ok
- [ ] Wizard Stripe landlord (test) + webhook
- [ ] Passkey admin su HTTPS `curaxe.it`
