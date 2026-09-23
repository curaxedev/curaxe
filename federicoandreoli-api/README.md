# federicoandreoli-api

Backend Laravel (API) per `apifedericoandreoli.backsoftware.it`.

## Stack

- Laravel 13, PHP 8.4+
- Laravel Sanctum (SPA + token)
- Cache, sessioni e code su **database** (nessun Redis)

## Documentazione interna

- [Autenticazione modulare](docs/AUTH.md)
- [Operatività senza Redis](docs/OPERATIONS-NO-REDIS.md)
- [Scelta DB / PostGIS](docs/DATABASE-CHOICE.md)
- [UI / Stitch](docs/DESIGN-STITCH.md)
- [Checklist deploy Hostinger](../docs/DEPLOYMENT-CHECKLIST.md) (repo workspace root)

## Setup locale

```bash
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate
php artisan serve
```

## Test

```bash
php artisan test
```

## Deploy

Workflow: `.github/workflows/deploy.yml`. Adattare SSH/rsync al server Hostinger; in produzione eseguire `composer install --no-dev`, migrazioni e `config:cache`.
