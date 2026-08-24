<!-- orchestrate handoff
task: verify-store-testing-prep
branch: orch/project-priority/store-testing-prep
agentId: bc-756e7dc3-1770-4167-970b-5247e059b859
runId: run-ec08967d-1559-4615-abac-f201ccc4eafa
resultStatus: finished
finishedAt: 2026-08-24T18:22:24.216Z
-->

## Verification
type-check-only

## Target
`store-testing-prep` on branch `orch/project-priority/store-testing-prep`

## Branch
`orch/project-priority/store-testing-prep`

## Execution
- `git checkout orch/project-priority/store-testing-prep` → on target branch; 2 worker commits + verifier commit `6097309`
- `pnpm install` → success (112 packages including `sharp`, `@capacitor/assets`)
- `pnpm --filter @cambio/native typecheck` → exit 0
- `pnpm --filter @cambio/native assets:generate` → exit 0; fetches `https://cambio.brierton.ie/icon/512`, writes 3 PNGs
- `file apps/native/resources/*.png` → `icon.png` 1024×1024 RGBA; `splash.png` / `splash-dark.png` 2732×2732 RGBA
- `pnpm --filter @cambio/native assets:sync` → FAIL: `sh: cap-assets: not found` (installed binary is `capacitor-assets`); `ios/` and `android/` absent (gitignored, expected pre-`cap:add:*`)
- `git diff f77d02b..HEAD --stat -- src/ party/ packages/` → empty (online Cloudflare mode unchanged)
- Manual doc review → 7 new CAM-40 docs under `docs/mobile/`; README CAM-40 section with doc index and operator blockers; `store.config.json` + `capacitor.config.ts` identity verified (`ie.brierton.cambio`, **Cambio**)
- Linear `get_issue CAM-40` → **In Progress**; prep subtasks checked; operator remainders listed; PR #234 linked
- Verifier artifact committed → `.verifier/store-testing-prep-verification.md`

## Findings
Per acceptance criterion:
- [x] Store asset checklist complete: `docs/mobile/store-asset-checklist.md` covers identity, icons/splash, listing graphics, signing prerequisites, pre-upload smoke gate (met)
- [x] Upload runbooks documented for iOS and Android: `docs/mobile/ios-testflight-runbook.md` (103 lines) and `docs/mobile/android-play-internal-runbook.md` (153 lines) with signing, archive/AAB, upload, troubleshooting, version bump steps (met)
- [x] Device smoke checklist committed: `docs/mobile/device-smoke-checklist.md` includes create (C1–C3), join (J1–J2), solo (S1–S3), reconnect (R1–R3), background/lifecycle (B1–B3), device matrix template (met)
- [x] Blockers documented if credentials missing: README operator blockers section; runbook “Prerequisites (operator)” + “Blocker if missing” callouts; `store-asset-checklist.md` signing table marked **Operator action**; Linear CAM-40 remaining operator items listed (met)

Other findings (severity-ordered):
- (med) `assets:sync` script broken: `apps/native/package.json` invokes `cap-assets` but `node_modules/.bin/` exposes `capacitor-assets` only → ENOENT on fresh `pnpm install`; runbooks/README tell operators to run `assets:sync`
- (low) `assets:generate` fails without prior root `pnpm install` (`Cannot find package 'sharp'`) — documented workflow assumes install first
- (low) Privacy policy URL `https://cambio.brierton.ie/privacy` referenced but not published; template provided
- (info) CAM-40 end-user acceptance (TestFlight/Play installs, smoke results attached) correctly remains open — requires operator credentials and physical devices

## Notes & suggestions
- Fix `assets:sync` to use `capacitor-assets` (or `pnpm exec capacitor-assets`) before operator handoff; verify once after local `cap:add:ios` / `cap:add:android`.
- Prep scope for CAM-40 worker task is complete; planner can mark prep done and queue operator follow-ups (accounts, keystore, `assets:sync`, uploads, device smoke execution).
- No TestFlight/Play upload or live shell UI testing possible in verifier environment; that gap is expected and documented, not a prep defect.