#!/usr/bin/env bash
# Reproduce CAM-44 GameTable MVP verification (automated portion).
set -euo pipefail
cd "$(dirname "$0")/../.."
pnpm install
pnpm --filter @cambio/expo typecheck
pnpm test
