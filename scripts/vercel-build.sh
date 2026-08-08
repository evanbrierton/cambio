#!/usr/bin/env bash
set -euo pipefail

# Vercel runs this instead of `build` when present.
# - Production: deploy the shared Cloudflare Worker, then build Next.
# - Preview (UI-only): share production Worker (CAM-78).
# - Preview (party/game changes): deploy a paired cambio-pr-* Worker (CAM-79).

DEFAULT_PARTY_HOST="cambio.brierton.workers.dev"
PREVIEW_WORKER_HELPER="scripts/preview-worker.mjs"

export NEXT_PUBLIC_PARTYKIT_HOST="${NEXT_PUBLIC_PARTYKIT_HOST:-$DEFAULT_PARTY_HOST}"

require_cloudflare_creds() {
  local context="$1"
  if [ -z "${CLOUDFLARE_ACCOUNT_ID:-}" ] || [ -z "${CLOUDFLARE_API_TOKEN:-}" ]; then
    echo "Missing CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_API_TOKEN for ${context}."
    echo "Add both in Vercel → Settings → Environment Variables (${context})."
    return 1
  fi
}

preview_touches_worker() {
  git fetch --depth=1 origin main 2>/dev/null || true

  local base_ref=""
  if git rev-parse --verify origin/main >/dev/null 2>&1; then
    base_ref="origin/main"
  elif git rev-parse --verify main >/dev/null 2>&1; then
    base_ref="main"
  else
    echo "Could not resolve main ref to detect Worker changes; sharing production Worker."
    return 1
  fi

  local changed
  changed="$(git diff --name-only "${base_ref}" HEAD || true)"
  if [ -z "${changed}" ]; then
    return 1
  fi

  printf '%s\n' "${changed}" | node "${PREVIEW_WORKER_HELPER}" has-changes
}

deploy_preview_worker() {
  require_cloudflare_creds "Preview" || return 1

  local worker_name party_host
  worker_name="$(node "${PREVIEW_WORKER_HELPER}" worker-name)"
  party_host="$(node "${PREVIEW_WORKER_HELPER}" party-host "${worker_name}")"

  echo "Worker-related changes detected vs main."
  echo "Deploying paired preview Worker: ${worker_name}"
  pnpm exec wrangler deploy --name "${worker_name}"

  export NEXT_PUBLIC_PARTYKIT_HOST="${party_host}"
  echo "Paired preview Worker host: ${NEXT_PUBLIC_PARTYKIT_HOST}"
}

if [ "${VERCEL_ENV:-}" = "production" ]; then
  if require_cloudflare_creds "Production"; then
    echo "Deploying Cloudflare Worker (production)..."
    pnpm party:deploy
  else
    echo "Skipping Worker deploy."
  fi
elif [ "${VERCEL_ENV:-}" = "preview" ]; then
  if preview_touches_worker; then
    deploy_preview_worker
  else
    echo "No party/game Worker changes vs main; sharing production Worker."
  fi
else
  echo "Skipping Worker deploy (VERCEL_ENV=${VERCEL_ENV:-unknown})."
fi

echo "NEXT_PUBLIC_PARTYKIT_HOST=${NEXT_PUBLIC_PARTYKIT_HOST}"
pnpm build
