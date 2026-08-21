<!-- orchestrate handoff
task: capacitor-shell
branch: orch/project-priority/capacitor-shell
agentId: bc-72bdc60d-94b3-4c4b-b5fa-3e5786dc3eb6
runId: run-ed1111c2-9646-4f3b-a4b6-034c102d7d83
resultStatus: finished
finishedAt: 2026-08-21T16:30:36.554Z
-->

## Status
success

## Branch
`orch/project-priority/capacitor-shell`

## What I did
- Updated `pnpm-workspace.yaml` to include `apps/*` so `apps/native` is a workspace package.
- Added a new Capacitor workspace app at `apps/native`:
  - `package.json` with Capacitor scripts (`cap:doctor`, `cap:sync`, `cap:add:*`, `cap:open:*`) and dependencies:
    - `@capacitor/core`
    - `@capacitor/cli`
    - `@capacitor/ios`
    - `@capacitor/android`
    - `@capacitor/status-bar`
    - `@capacitor/splash-screen`
  - `capacitor.config.ts` in remote-URL mode with env-driven URL precedence aligned to `src/lib/site.ts` behavior:
    1) `CAPACITOR_SERVER_URL`
    2) `NEXT_PUBLIC_APP_URL`
    3) `https://${VERCEL_URL}`
    4) `http://localhost:3000`
  - Added WebView networking config (`allowNavigation`) for the resolved app host plus Cloudflare/PartyKit hosts and localhost, plus cleartext handling via `CAPACITOR_ALLOW_CLEARTEXT`.
  - Added baseline status bar + splash config (`StatusBar.overlaysWebView=false`, splash color/duration/spinner settings).
  - Added `tsconfig.json`, `.gitignore` (ignoring `ios/`, `android/`, build outputs), and `web/.gitkeep`.
- Added `apps/native/README.md` documenting:
  - local setup and run with Xcode + Android Studio
  - `npx cap add` flow via pnpm scripts
  - remote-URL vs future bundled-export mode
  - LAN/dev cleartext configuration and WebSocket host expectations.
- Pushed branch and opened draft PR to `main`: https://github.com/evanbrierton/cambio/pull/213

## Measurements
- `pnpm-workspace package globs: 1 → 2`
- `git diff --shortstat (origin/main...HEAD): 0 files changed → 7 files changed, 172 insertions(+)`
- `pnpm install (root) exit code: 0 == 0`
- `pnpm typecheck (root) exit code: 0 == 0`
- `pnpm lint (root) exit code: 1 → 0`
- `pnpm --filter @cambio/native cap:doctor exit code: 0 == 0`
- `pnpm --filter @cambio/native cap:sync exit code: 0 == 0`
- `pnpm --filter @cambio/native cap:add:ios exit code: 0 == 0`
- `pnpm --filter @cambio/native cap:add:android exit code: 0 == 0`

## Verification
type-check-only

## Notes, concerns, deviations, findings, thoughts, feedback
- I kept code changes confined to `apps/**` and `pnpm-workspace.yaml` as requested.
- `pnpm install` regenerates `pnpm-lock.yaml` locally because of the new workspace package/deps, but I did **not** commit lockfile changes to stay within your allowed-path constraint.
- I verified `cap add ios/android` succeeds locally; generated platform directories are intentionally gitignored (`apps/native/.gitignore`) to avoid committing native build/signing artifacts.
- No changes were made to `src/**`, `packages/**`, `party/**`, web runtime behavior, or PartySocket path logic.

## Suggested follow-ups
- Decide whether to allow committing `pnpm-lock.yaml` in a follow-up to avoid potential frozen-lockfile CI drift.
- CAM-39 follow-up: implement native plugin integrations on top of this shell scaffold.
- Define canonical `CAPACITOR_SERVER_URL` values per environment (prod/staging) and finalize native app IDs/signing settings.