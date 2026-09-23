# f-andr-bs — Frontend Federico Andreoli

Repository GitHub: [BackSoftwareJR/f-andr-bs](https://github.com/BackSoftwareJR/f-andr-bs)

Applicazione **React 19 + Vite 8 + TypeScript**: interfaccia pubblica (home, directory profili demo, flussi registrazione, login). Il backend Laravel resta su un host/API separato; qui **non** vanno committati segreti né `.env` reali.

## Cosa non va mai in Git

- File `.env`, `.env.local`, `.env.production` personalizzati (sono in `.gitignore`).
- Token, password API, chiavi private, certificati (vedi anche `SECURITY.md`).
- Solo i template `.env.example` e `.env.production.example` sono versionati (URL pubblici di esempio).

## Sviluppo locale

```bash
npm install
cp .env.example .env
# Lasciare VITE_API_URL vuoto: le richieste /api usano il proxy verso :8000 (vedi vite.config.ts)
npm run dev
```

Con API Laravel in locale: `php artisan serve` (porta 8000).

## Build produzione

Impostare le variabili `VITE_*` (stessi valori di `.env.production.example`) nel pannello Hostinger / CI, **oppure**:

```bash
cp .env.production.example .env.production
npm ci
npm run build
```

**Hostinger (install solo produzione):** `vite`, `@vitejs/plugin-react`, `typescript` e `@types/*` sono in **`dependencies`**, così un `npm install --omit=dev` installa comunque tutto ciò che serve a `npm run build`. ESLint resta in `devDependencies` (solo `npm run lint`).

Output statico in `dist/` — da servire come sito statico. **Le route client** (`/registrazione/intent`, `/dashboard`, …) non sono file reali: il server deve rispondere sempre con `index.html`, altrimenti ottieni **404** aprendo o aggiornando l’URL direttamente.

| Ambiente | Cosa usare |
|----------|------------|
| **Netlify / Cloudflare Pages** | `public/_redirects` (già presente: `/*` → `index.html` 200) |
| **Apache (molti piani Hostinger)** | `public/.htaccess` (copiato in `dist/` alla build) — abilita `mod_rewrite` |
| **Nginx** | `try_files $uri $uri/ /index.html;` nel `location /` |

In pannello Hostinger: assicurati che la **root del dominio** punti alla cartella `dist` (o dove pubblichi la build) e che Apache non sovrascriva con regole che ignorano `.htaccess`.

## Automazione (GitHub → Hostinger)

- **CI** (`.github/workflows/ci.yml`): su ogni Pull Request verso `main` esegue `npm ci` e `npm run build` con URL pubblici di produzione (solo verifica compile).
- **Deploy** (`.github/workflows/deploy.yml`): su push su `main` (e avvio manuale) build + upload artifact `dist`. Decommentare lo step FTP e configurare i **secrets** nel repository se serve deploy automatico verso Hostinger.

Per pipeline Hostinger che clona da GitHub: impostare nello step di build le variabili d’ambiente come in `.env.production.example` (o secrets del provider), poi pubblicare la cartella `dist/`.

## Route principali

| Percorso | Contenuto |
|----------|-----------|
| `/` | Home |
| `/come-funziona` | Come funziona |
| `/profili`, `/profili/:id` | Directory e dettaglio profilo (mock) |
| `/iscriviti` | Landing iscrizione professionisti |
| `/accedi` | Login (UI) |
| `/registrazione/…` | Wizard intent / offro / cerco |

## Licenza / uso

Uso interno progetto BackSoftware; allineare licenza e visibilità del repo con l’organizzazione.
