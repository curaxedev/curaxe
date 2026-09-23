# Federico-Ad / Curaxe (monorepo)

Piattaforma: SPA React + API Laravel.

| Cartella | Produzione |
|----------|------------|
| [federicoandreoli-web](federicoandreoli-web/) | `https://curaxe.it` |
| [federicoandreoli-api](federicoandreoli-api/) | `https://api.curaxe.it` |

## Deploy sicuro

Guida completa (Actions, chiave SSH, cosa mettere / non mettere nei secret):

→ **[docs/GITHUB-DEPLOY-SECURE.md](docs/GITHUB-DEPLOY-SECURE.md)**

Altre guide:

- [DEPLOY-HOSTINGER.md](federicoandreoli-api/docs/DEPLOY-HOSTINGER.md)
- [CLOUDFLARE-SETUP.md](federicoandreoli-api/docs/CLOUDFLARE-SETUP.md)
- [RESEND-SETUP.md](federicoandreoli-api/docs/RESEND-SETUP.md)
- [SECURITY-INTEGRATIONS.md](federicoandreoli-api/docs/SECURITY-INTEGRATIONS.md)

## Principio sicurezza

- **GitHub Secrets** = solo accesso deploy (SSH key dedicata + host/path).
- **Server `.env`** = Stripe, Resend, DB, Turnstile.
- Mai password pannello Hostinger in CI.
