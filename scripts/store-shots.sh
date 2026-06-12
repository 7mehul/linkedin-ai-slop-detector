#!/usr/bin/env bash
# SlopShield store screenshots: renders the harness and popup stage in headless
# Chrome at the Chrome Web Store's preferred 1280x800. Output: store/screenshots/.
# Zero project dependencies; needs Chrome (or Chromium/Edge) and python3.
set -euo pipefail

cd "$(dirname "$0")/.."
PORT=8799
OUT="store/screenshots"
mkdir -p "$OUT"

CHROME=""
for c in \
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  "/Applications/Chromium.app/Contents/MacOS/Chromium" \
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge" \
  "$(command -v google-chrome || true)" \
  "$(command -v chromium || true)"; do
  if [ -n "$c" ] && [ -x "$c" ]; then CHROME="$c"; break; fi
done
if [ -z "$CHROME" ]; then
  echo "error: no Chrome/Chromium binary found" >&2
  exit 1
fi

python3 -m http.server "$PORT" --directory . >/dev/null 2>&1 &
SERVER_PID=$!
trap 'kill $SERVER_PID 2>/dev/null || true' EXIT
sleep 1

shot() {
  local url="$1" file="$2"
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars \
    --window-size=1280,800 --force-device-scale-factor=1 \
    --virtual-time-budget=8000 \
    --screenshot="$OUT/$file" "http://localhost:$PORT/$url" 2>/dev/null
  echo "wrote $OUT/$file"
}

shot "test/harness.html?clean"                      "01-redacted-feed.png"
shot "test/harness.html?clean&only=0005,0006"       "02-side-eye-badge.png"
shot "store/popup-stage.html"                       "03-popup-report.png"
