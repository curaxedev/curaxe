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
# ensure SPA rewrite + no-cache on HTML (evita chunk hash stale dopo deploy)
cat > "${DEST}/.htaccess" <<'HT'
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>

<IfModule mod_headers.c>
  <FilesMatch "\.(html)$">
    Header set Cache-Control "no-cache, no-store, must-revalidate"
    Header set Pragma "no-cache"
    Header set Expires "0"
  </FilesMatch>
  <FilesMatch "\.(js|css|woff2|png|jpg|jpeg|webp|svg|ico)$">
    Header set Cache-Control "public, max-age=31536000, immutable"
  </FilesMatch>
</IfModule>
HT
echo "Published SPA → ${DEST}"
ls -la "${DEST}" | head -20
echo "index refs:"
grep -oE 'assets/index-[^"]+\.js' "${DEST}/index.html" | head -3
