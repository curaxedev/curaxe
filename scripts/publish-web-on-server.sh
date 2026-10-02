#!/usr/bin/env bash
# Run on Hostinger after: cd ~/curaxe && git pull
set -euo pipefail
ROOT="${HOME}/curaxe"
SRC="${ROOT}/federicoandreoli-web/dist-prod"
DEST="${HOME}/domains/curaxe.it/public_html"
test -f "${SRC}/index.html" || { echo "Missing ${SRC}/index.html — git pull first"; exit 1; }
mkdir -p "${DEST}"
rsync -a --delete \
  --exclude '.git' \
  --exclude 'public_html.bak' \
  "${SRC}/" "${DEST}/"
# ensure SPA rewrite
if [[ ! -f "${DEST}/.htaccess" ]]; then
  cat > "${DEST}/.htaccess" <<'HT'
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
HT
fi
echo "Published SPA → ${DEST}"
ls -la "${DEST}" | head -20
