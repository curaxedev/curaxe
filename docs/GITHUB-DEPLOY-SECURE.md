# Deploy sicuro Curaxe: GitHub Actions + SSH (best practice)

## TL;DR — cosa fare

| Domanda | Risposta |
|---------|----------|
| 1 o 2 repo? | **1 monorepo** (`web/` + `api/`) |
| Password Hostinger nei secret GitHub? | **Mai** |
| Dove mettere Stripe / Resend / DB? | Solo `.env` **sul server** |
| Come pubblica Actions? | Chiave SSH **dedicata al deploy** (ed25519), revocabile in 10 secondi |
| Alternativa senza secret SSH su GitHub? | CI su GitHub + `git pull` manuale via SSH quando vuoi |

**Non** usare “metto la password, pubblico, poi la cambio”: è fragile, ti blocchi fuori, e la password del pannello non è pensata per CI.

---

## Tre modelli (dal più automatico al più manuale)

### A — Consigliato: Actions → SSH con deploy key

```text
push su main
  → GitHub Actions (test + build)
  → SSH con chiave "curaxe-deploy" (solo deploy)
  → sul server: git pull / rsync + composer/migrate o pubblica dist/
```

- Su GitHub Secrets metti **solo** ciò che serve al deploy (host, user, chiave privata deploy, path).
- Credenziali app (Stripe, Resend, DB) **restano sul server**, mai in GitHub.
- Per “spegnere” il deploy: togli la riga della chiave da `~/.ssh/authorized_keys` sul server (o disabiliti il workflow). Nessuna password da ruotare.

### B — Semi-manuale (zero chiave privata su GitHub)

```text
push → Actions fa solo CI (test/build artifact)
tu → SSH e lanci uno script ./scripts/server-deploy.sh
```

Ideale se vuoi **controllo umano** su ogni release. Nessun secret SSH in GitHub.

### C — Solo Hostinger “Ridistribuisci” da Git

Comodo ma meno controllo (migrate, cache, build Vite spesso incompleti). Ok come backup, non come unico flusso per Laravel + SPA.

---

## Setup chiave deploy (una volta)

Fai questo **dal tuo Mac**, non sul server pubblico.

```bash
# Chiave SOLO per Curaxe deploy (passphrase vuota ok se la private key vive solo in GitHub Secrets;
# oppure metti passphrase e usa ssh-agent — per semplicità Hostinger: senza passphrase + secret GitHub)
ssh-keygen -t ed25519 -C "curaxe-github-deploy" -f ~/.ssh/curaxe_deploy -N ""
```

Ottieni:

- `~/.ssh/curaxe_deploy` → **privata** → andrà in GitHub Secret `DEPLOY_SSH_KEY`
- `~/.ssh/curaxe_deploy.pub` → **pubblica** → andrà sul server

### Sul server Hostinger (SSH)

```bash
mkdir -p ~/.ssh && chmod 700 ~/.ssh
# Incolla il contenuto di curaxe_deploy.pub:
echo 'ssh-ed25519 AAAA... curaxe-github-deploy' >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

Best practice:

- User SSH dedicato se Hostinger lo permette (non l’admin del pannello se evitabile).
- Chiave usata **solo** da Actions; la tua chiave personale resta separata.
- Non abilitare login password SSH se puoi (solo chiavi).

### In GitHub (repo monorepo)

Settings → Secrets and variables → Actions → New repository secret:

| Secret | Contenuto |
|--------|-----------|
| `DEPLOY_SSH_HOST` | IP o hostname SSH Hostinger |
| `DEPLOY_SSH_USER` | utente SSH |
| `DEPLOY_SSH_KEY` | intero file **privato** `curaxe_deploy` (inclusa riga BEGIN/END) |
| `DEPLOY_API_PATH` | path assoluto API sul server, es. `/home/u…/domains/api.curaxe.it/federicoandreoli-api` |
| `DEPLOY_WEB_PATH` | path document root SPA, es. `/home/u…/domains/curaxe.it/public_html` |

Opzionale ma consigliato: **Environment** `production` con required reviewers (Settings → Environments) così il deploy su `main` chiede conferma umana.

---

## Cosa NON mettere mai su GitHub

- `APP_KEY`, `DB_PASSWORD`, `STRIPE_SECRET`, `RESEND_API_KEY`, Turnstile secret
- Password pannello Hostinger / FTP
- Dump DB, `.env` di produzione

Il file `.env` si crea **una volta sul server** (copia da `.env.example` + valori reali) e si aggiorna a mano quando cambi integrazioni.

---

## Flusso dopo il setup

1. Lavori in locale → push su `main` (o PR → merge).
2. Workflow `CI` gira sempre (test).
3. Workflow `Deploy API` / `Deploy Web` partono su push a path `federicoandreoli-api/**` o `federicoandreoli-web/**` (o `workflow_dispatch` manuale).
4. Se qualcosa è storto: Actions → Cancel; sul server la chiave deploy si toglie e nessuno può più pubblicare.

### Spegnere il deploy in 30 secondi

```bash
# Sul server: rimuovi la riga curaxe-github-deploy da authorized_keys
nano ~/.ssh/authorized_keys
```

O in GitHub: cancella il secret `DEPLOY_SSH_KEY` / disabilita i workflow.

---

## Checklist sicurezza Hostinger + Cloudflare

- [ ] SSH solo a chiave (password SSH disabilitata se possibile)
- [ ] `.env` solo sul server, permessi `chmod 600`
- [ ] Document root API = `…/public` (non root Laravel)
- [ ] `APP_DEBUG=false` in produzione
- [ ] Cloudflare davanti; `CLOUDFLARE_TRUST_PROXIES=true` solo dopo
- [ ] Bot Fight su frontend; webhook Stripe su `api` non bloccato
- [ ] Environment `production` con approval (opzionale ma meglio)

---

## Creare il repo monorepo (passi tuoi)

1. GitHub → New repository privato `curaxe` (o `curaxe-platform`).
2. In locale, dalla cartella workspace che contiene `federicoandreoli-web` e `federicoandreoli-api`:

```bash
cd /Users/julianrovera/Desktop/Federico-Ad
git init
git add federicoandreoli-api federicoandreoli-web docs .github README.md
git commit -m "Initial Curaxe monorepo"
git branch -M main
git remote add origin git@github.com:TUO_USER/curaxe.git
git push -u origin main
```

Attenzione: se `federicoandreoli-web` ha già un `.git` interno, o lo rimuovi (`rm -rf federicoandreoli-web/.git`) dopo aver salvato lo storico altrove, oppure tieni web come subtree — per semplicità **un solo `.git` alla root**.

3. Configura i secrets sopra.
4. Primo deploy: Actions → `Deploy Web` / `Deploy API` → Run workflow.

Guide collegate: [DEPLOY-HOSTINGER.md](../federicoandreoli-api/docs/DEPLOY-HOSTINGER.md), [CLOUDFLARE-SETUP.md](../federicoandreoli-api/docs/CLOUDFLARE-SETUP.md), [RESEND-SETUP.md](../federicoandreoli-api/docs/RESEND-SETUP.md).
