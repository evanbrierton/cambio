#!/usr/bin/env bash
set -euo pipefail

# Vercel runs this instead of `build` when present.
# Deploy the game server Worker on production only (not preview branches).
# Preview + production clients share cambio.brierton.workers.dev via
# NEXT_PUBLIC_PARTYKIT_HOST (see src/lib/party.ts).

DEFAULT_PARTY_HOST="cambio.brierton.workers.dev"
export NEXT_PUBLIC_PARTYKIT_HOST="${NEXT_PUBLIC_PARTYKIT_HOST:-$DEFAULT_PARTY_HOST}"
echo "NEXT_PUBLIC_PARTYKIT_HOST=${NEXT_PUBLIC_PARTYKIT_HOST}"

if [ "${VERCEL_ENV:-}" = "production" ]; then
  if [ -z "${CLOUDFLARE_ACCOUNT_ID:-}" ] || [ -z "${CLOUDFLARE_API_TOKEN:-}" ]; then
    echo "Missing CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_API_TOKEN — skipping Worker deploy."
    echo "Add both in Vercel → Settings → Environment Variables (Production)."
  else
    echo "Deploying Cloudflare Worker (production)..."
    pnpm party:deploy
  fi
else
  echo "Skipping Worker deploy (VERCEL_ENV=${VERCEL_ENV:-unknown}); using shared production Worker."
fi

pnpm build
