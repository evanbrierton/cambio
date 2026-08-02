#!/usr/bin/env bash
set -euo pipefail

# Vercel runs this instead of `build` when present.
# Deploy the game server Worker on production only (not preview branches).

if [ "${VERCEL_ENV:-}" = "production" ]; then
  if [ -z "${CLOUDFLARE_ACCOUNT_ID:-}" ] || [ -z "${CLOUDFLARE_API_TOKEN:-}" ]; then
    echo "Missing CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_API_TOKEN — skipping Worker deploy."
    echo "Add both in Vercel → Settings → Environment Variables (Production)."
  else
    echo "Deploying Cloudflare Worker (production)..."
    pnpm party:deploy
  fi
else
  echo "Skipping Worker deploy (VERCEL_ENV=${VERCEL_ENV:-unknown})."
fi

pnpm build
