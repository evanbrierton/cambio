#!/usr/bin/env bash
set -euo pipefail

cleanup() {
  if [[ -n "${PARTY_PID:-}" ]] && kill -0 "$PARTY_PID" 2>/dev/null; then
    kill "$PARTY_PID" 2>/dev/null || true
    wait "$PARTY_PID" 2>/dev/null || true
  fi
}

trap cleanup EXIT INT TERM

lan_ip="$(ipconfig getifaddr en0 2>/dev/null || true)"
if [[ -z "$lan_ip" ]]; then
  lan_ip="$(ipconfig getifaddr en1 2>/dev/null || true)"
fi

# Bind to the real LAN/hotspot IP so Next prints a usable Network URL.
# Binding to 0.0.0.0 makes Next advertise http://0.0.0.0:3000, which phones cannot open.
bind_host="${lan_ip:-0.0.0.0}"

echo "Starting game server on 0.0.0.0:8787..."
pnpm party:dev &
PARTY_PID=$!

echo ""
echo "=========================================="
echo "  Open on your phone (not 0.0.0.0):"
echo "  http://${bind_host}:3000"
echo "=========================================="
echo ""

echo "Starting Next.js on ${bind_host}:3000..."
pnpm exec next dev --hostname "$bind_host" --port 3000
