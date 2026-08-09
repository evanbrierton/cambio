<!-- orchestrate handoff
task: cam-85-zod
branch: orch/game-polish/cam-85-zod
agentId: bc-ee437904-de51-4061-a1d5-9251d7c246f2
runId: run-2caa3153-0149-425b-a8ad-b495ce54492e
resultStatus: finished
finishedAt: 2026-08-09T11:30:55.324Z
-->

## Status
success

## Branch
`orch/game-polish/cam-85-zod`

## What I did
- Merged upstream `orch/game-polish/cam-82-zustand` and `orch/game-polish/cam-64-card-points` into the CAM-85 branch before implementing
- Added `src/game/wire-schema.ts` with Zod schemas for all `ClientMessage` / `ServerMessage` variants, including CAM-64 `set_card_points` and `cardPoints` on `PlayerView`, plus safe JSON parse helpers
- Updated `party/cambio.ts` to reject invalid client messages with an error response via `parseClientMessageJson`
- Updated `src/hooks/useGameConnection.ts` to silently ignore invalid server messages via `parseServerMessageJson`
- Extended `src/lib/bot-settings.ts` with `legacyBotSettingsSchema` and parse helpers for legacy `cambio-bot-settings` JSON
- Added `src/store/ui-prefs-schema.ts` for CAM-82 zustand persist blob validation; wired into `src/store/ui-prefs.ts` migration/rehydrate paths
- Added parse tests in `wire-schema.test.ts`, `bot-settings.test.ts`, and `ui-prefs-schema.test.ts`
- Marked CAM-85 **In Review** in Linear; opened draft PR https://github.com/evanbrierton/cambio/pull/170

## Measurements
- `JSON.parse(...) as` casts at WS/bot-settings boundaries (`src` + `party`): 3 → 0
- `pnpm test`: 50 passing → 63 passing
- `LOC(src/game/wire-schema.ts)`: 0 → 290
- Schema parse test files: 0 → 3

## Verification
unit-test-verified

## Notes, concerns, deviations, findings, thoughts, feedback
- Branch includes merged CAM-82 + CAM-64 commits (not just CAM-85 delta); planner should integrate all three when merging to `main`
- Server rejects bad client messages with `{ type: "error" }`; client ignores bad server messages (no error surfaced) — intentional asymmetry matching prior behavior
- `bot-settings.ts` imports switched to relative paths (`../game/types`) so vitest can load schema tests without a path-alias config change
- Legacy bot settings schema uses `.passthrough()` so unknown keys from older blobs do not break migration
- No live WS or lobby manual testing performed

## Suggested follow-ups
- Verifier: spot-check lobby host `set_card_points` over WS after merge; confirm invalid payloads are rejected server-side
- Integrate CAM-82 (#167) and CAM-64 (#168) before or with this PR to avoid duplicate/conflicting merges
- CAM-84 (lucide GameTable chrome) and CAM-75 (swap VFX/SFX) remain unblocked on prefs/types work