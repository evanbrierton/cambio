# Verifier log: store-testing-prep (CAM-40)

**Date:** 2026-08-24  
**Branch:** `orch/project-priority/store-testing-prep`  
**Target:** `store-testing-prep` worker task

## Commands executed

```bash
git checkout orch/project-priority/store-testing-prep
pnpm install
pnpm --filter @cambio/native typecheck
pnpm --filter @cambio/native assets:generate
file apps/native/resources/*.png
pnpm --filter @cambio/native assets:sync   # expected partial failure
git diff f77d02b..HEAD --stat -- src/ party/ packages/
```

## Results

| Check | Outcome |
| --- | --- |
| `typecheck` | PASS (exit 0) |
| `assets:generate` | PASS after `pnpm install`; fetches `https://cambio.brierton.ie/icon/512` |
| Icon dimensions | 1024×1024 RGBA (`icon.png`) |
| Splash dimensions | 2732×2732 RGBA (`splash.png`, `splash-dark.png`) |
| `assets:sync` | FAIL: `cap-assets: not found` (binary is `capacitor-assets` in `node_modules/.bin/`) |
| `ios/` / `android/` | Not present (gitignored; requires local `cap:add:*`) |
| Online mode paths | No changes under `src/`, `party/`, `packages/` vs base `f77d02b` |
| Mobile docs count | 9 files under `docs/mobile/` (7 new CAM-40 docs + 2 pre-existing) |
| Linear CAM-40 | Status **In Progress**; prep checklist items marked complete; operator blockers listed |

## Acceptance criteria mapping

1. **Store asset checklist complete** — `docs/mobile/store-asset-checklist.md` (109 lines)
2. **Upload runbooks iOS/Android** — `ios-testflight-runbook.md`, `android-play-internal-runbook.md`
3. **Device smoke checklist committed** — `device-smoke-checklist.md` covers create/join/solo/reconnect/background
4. **Blockers if credentials missing** — README operator blockers + runbook prerequisite tables

## Findings for planner

- **(med)** `assets:sync` npm script invokes `cap-assets` but installed CLI is `capacitor-assets` → operators following README will hit ENOENT until script is fixed or docs use `pnpm exec capacitor-assets`.
- **(low)** `assets:generate` requires `pnpm install` at repo root (sharp not available until install).
- **(info)** Store upload / device smoke execution correctly deferred to operator (no Apple/Google creds in env).
