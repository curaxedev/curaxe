# Operatività senza Redis

Stack previsto: `CACHE_STORE=database`, `SESSION_DRIVER=database`, `QUEUE_CONNECTION=database`.

## Code (Laravel)

Le migrazioni default includono le tabelle `jobs` e `job_batches`. In produzione serve un processo che consumi la coda:

```bash
php artisan queue:work database --sleep=1 --tries=3 --max-time=3600
```

Opzioni comuni su Hostinger:

- **Supervisor** (VPS o piano che lo consente) con un program `queue:work`.
- **Cron ogni minuto** (meno ideale): `php artisan schedule:run` e in `routes/console.php` schedulare job brevi, oppure `queue:work --stop-when-empty` se il provider lo permette in un cron.

## Scheduler

Aggiungere al crontab del server:

```
* * * * * cd /path/to/federicoandreoli-api && php artisan schedule:run >> /dev/null 2>&1
```

## Cache

Driver `database`: eseguire `php artisan cache:table` se non già incluso nelle migrazioni del progetto (Laravel 13 include `cache` nella migrazione `0001_01_01_000001_create_cache_table`).

Dopo deploy:

```bash
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

## Limiti

Senza Redis non si usa **Laravel Horizon**. Il rate limiting distribuito tra più istanze PHP richiede in futuro un backend condiviso (es. database o broker come da roadmap FRD fase 2).
