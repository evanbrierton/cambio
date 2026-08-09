<!-- orchestrate handoff
task: cam-64-card-points
branch: orch/game-polish/cam-64-card-points
agentId: bc-fe6cef81-6599-4c52-8a69-fb1af8430ce9
runId: run-da5c224d-796d-4840-9748-138a2864b9d5
resultStatus: finished
finishedAt: 2026-08-09T10:22:55.232Z
-->

## Status
success

## Branch
`orch/game-polish/cam-64-card-points`

## What I did
- Added `CardPointValues` to `GameState` with defaults, clamps (−5…25), and host-only `set_card_points` client message (lobby/ended only)
- Made `cardPoints(card, values)` config-aware in `src/game/cards.ts`; threaded through `scoring.ts`, `bot.ts`, and `bot-chat-events.ts`
- Initialized in `createRoom`, handled in `engine.ts`, migrated older rooms in `party/cambio.ts`
- Exposed `cardPoints` + `canSetCardPoints` on `PlayerView`
- Added five lobby selects in `LobbyPlayers.tsx` (host editable, guests read-only)
- Added `ThemeVoice` labels for all 8 themes in `themes.ts`
- Updated README scoring docs
- Added focused tests in `cards.test.ts` and `engine.test.ts`
- Marked CAM-64 In Progress → In Review in Linear
- Opened draft PR #168 against `main`

## Measurements
- `pnpm test`: 39 passing → 50 passing
- `cards.test.ts`: 0 → 64 LOC (new file)
- `engine.test.ts` CAM-64 tests: 0 → 6 new cases
- `themes.ts` card-point labels: 0 → 45 LOC added (5 fields × 8 themes + type)
- Configurable card point categories: 0 → 5 (ace, face, joker, blackKing, redKing)

## Verification
unit-test-verified

## Notes, concerns, deviations, findings, thoughts, feedback
- Mirrors `set_joker_count` exactly: host-only, lobby/ended phases, frozen during active rounds
- Migration uses `{ ...DEFAULT_CARD_POINTS, ...state.cardPoints }` for partial/missing persisted state
- `BotKnowledge` stores point values on `prepareForState` so estimate/snap logic stays config-aware
- Used `skip_branch_prefix_check` for PR creation because orchestrator requires exact branch name `orch/game-polish/cam-64-card-points`
- Did not modify `GameTable.tsx`, `context/**`, `theme-cookie.ts`, or `layout.tsx` per scope
- No live UI verification; engine tests cover defaults, host gating, mid-round rejection, and custom red-king scoring

## Suggested follow-ups
- Verifier: manual lobby check — host changes red king value, starts game, confirms scoring uses new value; non-host sees read-only values
- CAM-85 can now add Zod schema for `set_card_points` alongside other client messages
- CAM-83 should avoid large edits to the new card-point label fields in `themes.ts`