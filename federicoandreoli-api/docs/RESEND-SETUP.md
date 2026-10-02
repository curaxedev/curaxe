# Guida Resend (email transazionali) — curaxe.it

Resend sostituisce (o affianca) SMTP Hostinger per OTP, reset password, benvenuto, messaggi.

Il codice è già predisposto: mailer `resend` in `config/mail.php`, chiave in `config/services.php`, fallback `log` se manca la API key.

## Cosa fai tu (una tantum)

### 1. Account e dominio

1. Crea account su [https://resend.com](https://resend.com)
2. **Domains** → Add Domain → `curaxe.it`
3. Aggiungi i record DNS che Resend mostra (tipicamente SPF, DKIM, a volte DMARC) sul DNS di `curaxe.it` (dopo Cloudflare: crea i record come **DNS only** grigio se Resend lo richiede per verifica, poi puoi tornare a Proxied dove sensato)
4. Attendi verifica dominio (verde in dashboard Resend)

### 2. API key

1. Resend → **API Keys** → Create
2. Nome: `curaxe-production`
3. Permesso: Sending access
4. Copia la chiave `re_…` (una sola volta)

### 3. Indirizzo From

Usa un indirizzo sul dominio verificato, es.:

- `noreply@curaxe.it`
- oppure `assistenza@curaxe.it`

### 4. Variabili sul server API (`.env` Hostinger)

```env
MAIL_MAILER=resend
MAIL_FROM_ADDRESS=noreply@curaxe.it
MAIL_FROM_NAME="Curaxe"

RESEND_API_KEY=re_xxxxxxxxxxxxxxxx

# Lascia SMTP Hostinger come backup opzionale (failover):
# MAIL_HOST=smtp.hostinger.com
# MAIL_PORT=465
# MAIL_USERNAME=noreply@curaxe.it
# MAIL_PASSWORD=...
```

Poi:

```bash
cd /path/to/federicoandreoli-api
php artisan config:cache
php artisan queue:restart   # se usi worker
```

### 5. Test invio

```bash
php artisan tinker
>>> Mail::raw('Test Curaxe Resend', fn ($m) => $m->to('tua@email.it')->subject('Test Resend'));
```

Oppure login OTP su staging e controlla la casella + dashboard Resend → Emails.

### 6. Invio email (sincrono)

Le mail transazionali (OTP, welcome, reset, ecc.) partono **subito** via Resend nella stessa richiesta HTTP: non dipendono dal cron/`queue:work`.

Il cron `queue:work` resta utile per eventuali job non-mail in futuro, ma **non è più obbligatorio** per ricevere OTP.

Tempo tipico Resend: ~150–300 ms per messaggio.
## Comportamento applicativo

| Situazione | Mailer effettivo |
|------------|------------------|
| `MAIL_MAILER=resend` + `RESEND_API_KEY` valorizzata | Resend API |
| `MAIL_MAILER=resend` senza chiave | `log` (nessun invio reale) |
| `MAIL_MAILER=smtp` senza `MAIL_PASSWORD` | `log` |
| `MAIL_MAILER=failover` | prova `resend` → `smtp` → `log` |

## Sicurezza

- Non commitare `RESEND_API_KEY`
- Ruota la chiave se esposta
- From deve essere sul dominio verificato (altrimenti Resend rifiuta)
- In locale lascia `MAIL_MAILER=log` o usa chiave di test Resend

## Checklist go-live

- [ ] Dominio `curaxe.it` verificato su Resend
- [ ] `RESEND_API_KEY` in `.env` produzione
- [ ] `MAIL_FROM_ADDRESS=noreply@curaxe.it`
- [ ] `php artisan config:cache`
- [ ] Worker coda attivo
- [ ] Test OTP / password reset ricevuti
