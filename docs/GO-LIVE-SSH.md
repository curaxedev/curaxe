# Go-live SSH Curaxe — guida passo-passo

Pubblicazione su Hostinger Cloud Professional:

| Cosa | Dove |
|------|------|
| SPA | `https://curaxe.it` (+ `www`) |
| API Laravel | `https://api.curaxe.it` |
| Codice | monorepo primario **[BackSoftwareJR/bk-curaxe](https://github.com/BackSoftwareJR/bk-curaxe)** (private, accesso completo) |
| Mirror | [curaxedev/curaxe](https://github.com/curaxedev/curaxe) (push quando hai WRITE) |

Flusso: **pannello Hostinger (DNS/DB/SSL) → SSH clone → `.env` → migrate → build web → cron/coda → verifiche**.  
Secrets (Stripe, Resend, DB) **solo sul server**, mai su GitHub.

> Hostinger SSH spesso usa porta **`65002`** (non 22). Controlla: hPanel → Advanced → SSH Access.

---

## Fase 0 — Prima di toccare il server (checklist)

Fai queste cose nel pannello / DNS. Segna quando fatte.

### 0.1 Domini e SSL

- [ ] Dominio `curaxe.it` puntato a Hostinger (A/NS)
- [ ] Sito/website creato per `curaxe.it`
- [ ] Sottodominio `api.curaxe.it` creato
- [ ] SSL Let’s Encrypt attivo su **entrambi** (HTTPS ok)

### 0.2 SSH

- [ ] SSH Access abilitato
- [ ] Annota: **host**, **porta** (es. 65002), **user**
- [ ] Dal Mac prova:  
  `ssh -p 65002 USER@HOST`  
  (sostituisci porta/user/host)

### 0.3 Database MySQL

In hPanel → Databases → MySQL:

- [ ] Crea database (es. `curaxe_prod`)
- [ ] Crea utente DB con password forte
- [ ] Assegna utente al DB (tutti i privilegi)
- [ ] Annota: `DB_HOST` (spesso `localhost`), `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`

### 0.4 GitHub repo privato (consigliato)

Il repo è pubblico: **rendilo Private** (Settings → Danger zone).

Per clonare un repo **privato** sul server serve una delle due:

**Opzione consigliata — Deploy key (sola lettura)**

1. Sul server (dopo il primo login SSH):  
   `ssh-keygen -t ed25519 -C "curaxe-server-clone" -f ~/.ssh/curaxe_github -N ""`
2. `cat ~/.ssh/curaxe_github.pub` → copia
3. GitHub → repo **BackSoftwareJR/bk-curaxe** → Settings → Deploy keys → Add → read-only  
   (su `curaxedev/curaxe` non basta WRITE: senza Admin non vedi Deploy keys)
4. Configura SSH GitHub sul server:

```bash
cat >> ~/.ssh/config <<'EOF'
Host github.com
  HostName github.com
  User git
  IdentityFile ~/.ssh/curaxe_github
  IdentitiesOnly yes
EOF
chmod 600 ~/.ssh/config ~/.ssh/curaxe_github
ssh -T git@github.com
```

**Alternativa:** clone HTTPS + Personal Access Token (scade / più rischioso). Preferisci deploy key.

### 0.5 Node / PHP sul server

Dopo SSH:

```bash
php -v          # serve 8.3+
composer -V     # se manca, installalo o usa php composer.phar
node -v         # 20+ se buildi sul server; altrimenti build in locale/CI
```

---

## Fase 1 — Layout cartelle sul server

Layout consigliato (monorepo fuori dal web root pubblico dove possibile):

```text
~/curaxe/                          ← clone monorepo
  federicoandreoli-api/
  federicoandreoli-web/

~/domains/api.curaxe.it/
  public_html  → symlink a ~/curaxe/federicoandreoli-api/public

~/domains/curaxe.it/
  public_html/                     ← contenuto di web/dist (o symlink)
```

### 1.1 Clone

```bash
cd ~
git clone git@github.com:BackSoftwareJR/bk-curaxe.git curaxe
cd ~/curaxe
git status
```

Se Hostinger impone `public_html` e non puoi cambiare document root:

```bash
# API: svuota public_html del sottodominio api (ATTENZIONE: backup prima)
cd ~/domains/api.curaxe.it
# Se public_html è vuoto/default:
rm -rf public_html
ln -s ~/curaxe/federicoandreoli-api/public public_html
```

Se puoi impostare **Document Root** su `.../federicoandreoli-api/public`, ancora meglio (niente symlink).

---

## Fase 2 — API Laravel (`.env` + Composer + DB)

```bash
cd ~/curaxe/federicoandreoli-api
cp .env.example .env
nano .env   # oppure vi
```

### 2.1 Valori produzione obbligatori

```env
APP_NAME="Curaxe"
APP_ENV=production
APP_DEBUG=false
APP_URL=https://api.curaxe.it
LOG_LEVEL=error

FRONTEND_URL=https://curaxe.it
FRONTEND_URLS=https://curaxe.it,https://www.curaxe.it
SANCTUM_STATEFUL_DOMAINS=curaxe.it,www.curaxe.it

DB_CONNECTION=mysql
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=NOME_DB
DB_USERNAME=USER_DB
DB_PASSWORD=PASSWORD_DB

SESSION_DRIVER=database
QUEUE_CONNECTION=database
CACHE_STORE=database

MAIL_MAILER=log
# Quando Resend è pronto:
# MAIL_MAILER=resend
# RESEND_API_KEY=re_xxx
MAIL_FROM_ADDRESS=noreply@curaxe.it
MAIL_FROM_NAME=Curaxe

WEBAUTHN_RP_ID=curaxe.it
WEBAUTHN_RP_NAME=Curaxe
WEBAUTHN_ORIGIN=https://curaxe.it
WEBAUTHN_ORIGINS=https://curaxe.it,https://www.curaxe.it

CLOUDFLARE_TRUST_PROXIES=false
# Metti true SOLO dopo Cloudflare Proxied davanti all’origin
CLOUDFLARE_TURNSTILE_ENABLED=false

STRIPE_MODE=test
# Chiavi: meglio wizard admin dopo il go-live; lascia vuoto ora
```

Poi:

```bash
chmod 600 .env
composer install --no-dev --optimize-autoloader --no-interaction
php artisan key:generate
php artisan migrate --force
```

### 2.2 Storage link

```bash
# Prova artisan; se symlink() è disabilitato su Hostinger:
php artisan storage:link || \
  ln -s ~/curaxe/federicoandreoli-api/storage/app/public \
        ~/curaxe/federicoandreoli-api/public/storage
```

### 2.3 Admin iniziale (NO seed demo in produzione)

**Non** lanciare `db:seed` con DemoUsers in produzione (password note `DemoPass123!`).

Crea admin una tantum con tinker:

```bash
php artisan tinker
```

```php
$u = new \App\Models\User();
$u->name = 'Admin Curaxe';
$u->email = 'admin@curaxe.it';   // tua email reale
$u->role = \App\Domains\Auth\Enums\UserRole::PlatformAdmin;
$u->password = 'SCEGLI_PASSWORD_FORTE_QUI';
$u->email_verified_at = now();
$u->save();
```

(Se serve TOTP, configuralo dopo dal flusso auth esistente.)

### 2.4 Cache Laravel

```bash
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

### 2.5 Verifica API

Dal browser / curl:

```bash
curl -sI https://api.curaxe.it/up
curl -s https://api.curaxe.it/api/v1/meta
```

Attesi: `200` e JSON `{"name":...,"version":1}`.

---

## Fase 3 — Frontend SPA

### 3.1 Build (sul server se Node c’è)

```bash
cd ~/curaxe/federicoandreoli-web
npm ci
VITE_USE_MOCKS=false \
VITE_API_URL=https://api.curaxe.it \
VITE_SITE_ORIGIN=https://curaxe.it \
npm run build
```

### 3.2 Pubblica su document root

```bash
# Esempio: copia dist nel public_html del dominio
rsync -a --delete dist/ ~/domains/curaxe.it/public_html/
```

Se usi ancora **coming soon** temporaneo:

```bash
# Solo landing, senza SPA completa
cp coming-soon/index.html ~/domains/curaxe.it/public_html/index.html
# (+ eventuali asset della cartella coming-soon)
```

### 3.3 SPA fallback (Apache)

In `public_html` assicurati di avere rewrite verso `index.html` per le route React (il progetto ha già `.htaccess` tipico Vite/SPA — copialo da `federicoandreoli-web/public` o `dist` se presente).

Verifica: `https://curaxe.it` carica; `https://curaxe.it/accedi` non dà 404 Apache grezzo.

---

## Fase 4 — Cron + coda (obbligatori)

### Cron (hPanel → Advanced → Cron Jobs)

```text
* * * * * cd /home/USER/curaxe/federicoandreoli-api && php artisan schedule:run >> /dev/null 2>&1
```

### Worker email

Senza Supervisor, avvio persistente minimo:

```bash
# screen/tmux se disponibili
cd ~/curaxe/federicoandreoli-api
nohup php artisan queue:work database --sleep=1 --tries=3 --max-time=3600 >> storage/logs/queue.log 2>&1 &
```

Oppure cron ogni minuto che riavvia solo se morto (meno ideale ma funziona su shared/cloud base).

---

## Fase 5 — Sicurezza post-deploy

- [ ] `APP_DEBUG=false`, `APP_ENV=production`
- [ ] `.env` `chmod 600`
- [ ] Document root API = solo `public/` (niente listing di `vendor/`, `.env`)
- [ ] Repo GitHub **private**
- [ ] HTTPS forzato
- [ ] Cloudflare (dopo): guida `federicoandreoli-api/docs/CLOUDFLARE-SETUP.md`
- [ ] Resend: `docs/RESEND-SETUP.md`
- [ ] Stripe wizard da admin (test): Abbonamenti → procedura guidata
- [ ] Passkey admin da Account (solo dopo HTTPS + RP `curaxe.it`)

---

## Fase 6 — Smoke test produzione

1. `GET https://api.curaxe.it/up` → 200  
2. `GET https://api.curaxe.it/api/v1/meta` → JSON  
3. Login admin su `https://curaxe.it/accedi`  
4. Dashboard admin carica  
5. (Opzionale) OTP / email se Resend attivo  
6. Stripe test checkout solo dopo wizard  

---

## Aggiornamenti successivi (SSH manuale)

```bash
cd ~/curaxe
git pull --ff-only origin main

cd federicoandreoli-api
composer install --no-dev --optimize-autoloader --no-interaction
php artisan migrate --force
php artisan config:cache && php artisan route:cache && php artisan view:cache
php artisan queue:restart || true

cd ../federicoandreoli-web
npm ci
VITE_USE_MOCKS=false VITE_API_URL=https://api.curaxe.it VITE_SITE_ORIGIN=https://curaxe.it npm run build
rsync -a --delete dist/ ~/domains/curaxe.it/public_html/
```

Poi, quando vorrai, collega GitHub Actions (stessa guida `docs/GITHUB-DEPLOY-SECURE.md`).

---

## Ordine di lavoro consigliato OGGI

1. Fase 0 (DNS, SSL, SSH, MySQL, repo private, deploy key)  
2. Fase 1–2 (clone + API up)  
3. Fase 3 (web o coming-soon)  
4. Fase 4 (cron/coda)  
5. Smoke test  
6. Solo dopo: Cloudflare / Resend / Stripe  

**Non fare tutto insieme:** prima API verde (`/up` + `/meta`), poi frontend.
