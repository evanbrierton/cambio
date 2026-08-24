<!-- orchestrate handoff
task: store-testing-prep
branch: orch/project-priority/store-testing-prep
agentId: bc-af8b6572-0ebd-42e5-afe1-117f8d431697
runId: run-967aa271-8b90-410e-ace6-bd989436559a
resultStatus: finished
finishedAt: 2026-08-24T18:20:54.829Z
-->

## Status
success

## Branch
`orch/project-priority/store-testing-prep`

## What I did
- Added store-ready PNG assets in `apps/native/resources/` (1024 icon, 2732 splash + splash-dark) generated from production brand icon via `scripts/generate-resources.mjs`
- Added `assets:generate` and `assets:sync` scripts to `apps/native/package.json` (sharp + @capacitor/assets); added `store.config.json` with bundle ID `ie.brierton.cambio`, display name **Cambio**, and store URL constants
- Updated `apps/native/README.md` with CAM-40 store prep section, asset commands, doc index, and operator credential blockers; extended `.gitignore` for keystore files
- Created seven docs under `docs/mobile/`:
  - `store-asset-checklist.md` — identity, icons, listing graphics, signing prerequisites
  - `ios-testflight-runbook.md` — Xcode signing, archive, TestFlight upload
  - `android-play-internal-runbook.md` — keystore, AAB build, Play internal track
  - `device-smoke-checklist.md` — device matrix for create/join/solo/reconnect/background
  - `webview-limitations.md` — Capacitor WebView limits vs future Expo
  - `privacy-policy-template.md` and `store-metadata-template.md` — store submission drafts
- Moved Linear **CAM-40** to **In Progress** with prep tasks checked off; linked branch; documented remaining operator steps (Apple/Google accounts, keystore, actual uploads, smoke results)
- Opened draft PR #234 against `main`

## Measurements
- `docs/mobile/*.md` count: 2 → 9
- `apps/native/resources/*.png` count: 0 → 3
- `pnpm --filter @cambio/native typecheck`: pass → pass

## Verification
type-check-only

Ran `pnpm --filter @cambio/native typecheck` and `assets:generate` (confirmed 1024×1024 icon, 2732×2732 splash). No TestFlight/Play upload possible — store credentials not available in this environment.

## Notes, concerns, deviations, findings, thoughts, feedback
- `ios/` and `android/` remain gitignored and are not generated in CI; `assets:sync` requires local `cap:add:ios` / `cap:add:android` first — documented in runbooks
- Bundle ID, display name, and app name already correct in `capacitor.config.ts`; no change needed
- **Operator blockers:** Apple Developer Program, App Store Connect app record, Google Play Console account, Android upload keystore — all documented, none in repo
- Privacy policy URL (`https://cambio.brierton.ie/privacy`) referenced but not yet published — template provided
- Online Cloudflare / remote-URL mode unchanged; no edits under `src/`, `party/`, or `packages/`
- CAM-40 acceptance criteria for tester installs remain open until operator uploads builds and runs device smoke checklist

## Suggested follow-ups
- Operator: enroll Apple/Google accounts, create app records for `ie.brierton.cambio`, generate upload keystore, run `assets:sync`, upload to TestFlight and Play internal
- Publish privacy policy page from template before store submission
- Execute `docs/mobile/device-smoke-checklist.md` on physical devices; attach results to CAM-40
- After smoke pass, promote CAM-40 acceptance criteria and proceed to CAM-23 (useP2PConnection) per priority order