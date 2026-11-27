#!/usr/bin/env bash
# Assemble l'aperçu web publiable (page hébergée) dans apps/desktop/preview-dist.
# Le serveur d'aperçu ne sert pas les .sf2 : la banque de sons est livrée en base64.
set -euo pipefail
cd "$(dirname "$0")/../apps/desktop"
npx vite build >/dev/null
OUT=preview-dist
rm -rf "$OUT" && mkdir -p "$OUT/font" "$OUT/soundfont/generaluser"
cp -r dist/index.html dist/icon.svg dist/assets "$OUT/"
cp dist/font/Bravura.woff2 dist/font/Bravura.woff dist/font/Bravura-OFL.txt "$OUT/font/"
base64 -w 0 dist/soundfont/sonivox.sf2 > "$OUT/soundfont/sonivox.sf2.b64.txt"
cp dist/soundfont/LICENSE "$OUT/soundfont/LICENSE.txt"
for f in dist/soundfont/generaluser/*.sf3; do
  base64 -w 0 "$f" > "$OUT/soundfont/generaluser/$(basename "$f").b64.txt"
done
cp dist/soundfont/generaluser/LICENSE.txt "$OUT/soundfont/generaluser/LICENSE.txt"
find "$OUT" -type f | sort
