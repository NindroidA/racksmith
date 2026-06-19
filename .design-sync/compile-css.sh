#!/usr/bin/env bash
# design-sync: compile RackSmith's Tailwind v4 styles into one static stylesheet.
# globals.css does `@import "tailwindcss"` + `@theme {…}` (CSS-first config, no
# tailwind.config.*). Tailwind v4 auto-detects sources from the repo root (respects
# .gitignore), so src/** and .design-sync/previews/** are scanned but .ds-sync/,
# ds-bundle/, and .cache/ are not. Output is what cfg.cssEntry points at.
set -euo pipefail
cd "$(dirname "$0")/.."   # repo root
OUT=".design-sync/.cache/forge-compiled.css"
mkdir -p "$(dirname "$OUT")"
npx --yes @tailwindcss/cli@4 -i src/app/globals.css -o "$OUT" --optimize
echo "compiled tailwind -> $OUT ($(wc -c < "$OUT" | tr -d ' ') bytes)"
