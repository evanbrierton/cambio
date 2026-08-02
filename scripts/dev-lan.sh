#!/usr/bin/env bash
set -euo pipefail

cleanup() {
  if [[ -n "${PARTY_PID:-}" ]] && kill -0 "$PARTY_PID" 2>/dev/null; then
    kill "$PARTY_PID" 2>/dev/null || true
    wait "$PARTY_PID" 2>/dev/null || true
  fi
}

trap cleanup EXIT INT TERM

echo "Starting game server on 0.0.0.0:8787..."
pnpm party:dev &
PARTY_PID=$!

echo "Starting Next.js dev server..."
pnpm dev
