<!-- orchestrate handoff
task: verify-cam-64
branch: orch/game-polish/cam-64-card-points
agentId: bc-220a13c7-fca2-425c-b2dc-956a45de919a
runId: run-6c6c0f18-a86a-4eeb-b25a-c48c0d029f79
resultStatus: finished
finishedAt: 2026-08-09T10:58:57.156Z
-->

## Verification
live-ui-verified

## Target
`cam-64-card-points` on branch `orch/game-polish/cam-64-card-points`

## Branch
`orch/game-polish/cam-64-card-points`

## Execution
- `pnpm install` → lockfile up to date, deps installed
- `pnpm lint` → 79 files checked, no issues
- `pnpm typecheck` → clean (`tsc --noEmit`)
- `pnpm test` → **50/50 tests pass** (5 files)
- `pnpm vitest run src/game/cards.test.ts` → **5/5 pass** (defaults, config-aware scoring, normalize/clamp)
- `pnpm vitest run src/game/engine.test.ts -t "set_card_points"` → **6/6 pass** (defaults, host lobby edit, non-host reject, mid-round block, custom red-king scoring, PlayerView flags)
- `pnpm vitest run --config verifier/vitest.verify.config.mts` → **9/9 pass** (added `verifier/verify_cam64.test.ts`: ended-phase host edit, migration merge, BotKnowledge custom points)
- `pnpm run ci` → lint + typecheck + test (50) + `party:check` (wrangler dry-run OK) + `next build` — **all green**
- Live UI: `pnpm party:dev` (:8787) + `NEXT_PUBLIC_PARTYKIT_HOST=localhost:8787 pnpm dev` (:3000) → host lobby shows 5 card-point dropdowns; changed RED K PTS 25→15 (log: "Card point values updated"); guest in same room sees values as read-only text including red king 15 → screenshots at `verifier/artifacts/e2dc6.webp`, `b62dc.webp`, `948f1.webp`
- `gh pr view 168` → draft PR open, base `main`, head `orch/game-polish/cam-64-card-points`, title/body reference CAM-64
- Committed verifier artifacts → `687c45f` pushed to branch

## Findings
Per acceptance criterion:
- [x] New rooms default to ace 1 / face 10 / joker 0 / black king -2 / red king 25: `engine.test.ts` createRoom assertion + `cards.test.ts` default `cardPoints()` — **met**
- [x] Host can change all five values in lobby and after a round ends; non-hosts read-only: engine tests (lobby edit, `canSetCardPoints` host/guest) + verifier ended-phase test + live UI (host selects, guest spans) — **met**
- [x] Values cannot change during an active round: engine test rejects `set_card_points` in `playingState()` — **met**
- [x] End-of-round scores and bot decisions use room configured values: engine test sets redKing=5, hearts K scores 5; verifier `BotKnowledge.points()` uses configured values after `prepareForState` — **met** (scoring not re-checked live mid-game; engine test is authoritative)
- [x] Older persisted rooms migrate cleanly: verifier tests replicate `{ ...DEFAULT_CARD_POINTS, ...state.cardPoints }` merge + partial override + clamp — **met**
- [x] pnpm lint, typecheck, and test pass: full `pnpm run ci` green, 50 main-suite + 5 supplemental verifier CAM-64 tests — **met**
- [x] Draft PR open against main mentioning CAM-64: PR #168 draft, links CAM-64 — **met**

Other findings (severity-ordered):
- (low) Live UI did not start a round to observe in-game scoring with custom red king; engine test `"uses configured values for end-of-round scoring"` covers this path
- (low) "CREATE GAME" button on home page hung once during UI session; bypassed via direct `/play/[roomId]` navigation — lobby card-point controls unaffected

## Notes & suggestions
- Verifier added `verifier/verify_cam64.test.ts`, `verifier/CAM64_VERIFICATION.md`, and lobby screenshots under `verifier/artifacts/` — no target source files modified
- All 8 themes define the five card-point label fields in `src/lib/themes.ts`; README scoring section documents host-configurable values
- Follow-up: optional live round-end scoring walkthrough if planner wants UI-level scoring confirmation beyond engine tests