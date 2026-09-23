#!/usr/bin/env bash
# Deploy manuale sul server (modello B: niente chiave privata su GitHub).
# Uso (da SSH sul server, nella cartella API o come indicato):
#   bash scripts/server-deploy-api.sh
#   bash scripts/server-deploy-web.sh   # se buildi sul server; altrimenti build in locale + rsync
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
API_DIR="${API_DIR:-$ROOT/federicoandreoli-api}"

cd "$API_DIR"
git fetch --prune origin
git checkout main
git pull --ff-only origin main
composer install --no-dev --optimize-autoloader --no-interaction
php artisan migrate --force
php artisan storage:link || true
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan queue:restart || true
echo "API OK $(date -u +%Y-%m-%dT%H:%M:%SZ)"
