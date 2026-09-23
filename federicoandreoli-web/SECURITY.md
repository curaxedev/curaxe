# Sicurezza

Questo repository contiene **solo frontend** (React/Vite). Non inserire in Git:

- file `.env`, `.env.local` o varianti con **token, password, chiavi API**;
- certificati (`.pem`, `.p12`, chiavi private);
- dump di database o dati personali.

Per la produzione usare **variabili d’ambiente** nel pannello Hostinger o **GitHub Actions secrets** (solo per deploy, mai nel codice sorgente).

Segnalazioni responsabili: contattare i maintainer del progetto BackSoftware.
