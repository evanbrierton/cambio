<!-- orchestrate handoff
task: expo-gametable-mvp
branch: orch/expo-gametable/expo-gametable-mvp
agentId: bc-4b33b5a7-8f96-4ade-9338-817369282735
runId: run-52491bd4-60b6-49f2-911b-df28ba321300
resultStatus: finished
finishedAt: 2026-08-25T17:58:43.418Z
-->

## Status
success

## Branch
`orch/expo-gametable/expo-gametable-mvp`

## What I did
- **`apps/expo/src/components/game/`** — Added RN GameTable MVP: `PixelCard` (theme-token card face/back), `PlayerSeat` (2×2 hand, turn/host/bot badges), `TableDeckArea` (deck count, drawn slot, discard pile + actions), `GameTable` (composes table, wires setup_peek / draw / swap / discard via `send`).
- **`apps/expo/app/play/[roomId].tsx`** — Replaced `GameInProgressView` placeholder with `GameTable`; passes full `useGameConnection` state (`fleetingPeek`, flash props, `send`).
- **Linear CAM-44** — Kept In Progress; prepended MVP progress note (not Done).
- **Draft PR #245** opened against `main`.

## Measurements
- `pnpm --filter @cambio/expo typecheck`: fail → pass
- `pnpm test`: 277 passing → 277 passing
- Post-lobby UI: placeholder → GameTable
- Solo draw/discard: not wired → working via UI
- Game logic in Expo: none (uses `useGameConnection`)

## Verification
live-ui-verified

Manual: `pnpm party:dev` + `pnpm --filter @cambio/expo web -- --port 8081`. Solo vs 2 bots → lobby → start → setup peek (cards #3/#4) → playing phase with deck/discard/seats → drew 2♣ from deck → discarded → turn advanced to Clever Pebble → bots played → turn returned.

Artifact: `/opt/cursor/artifacts/expo_gametable_solo_draw_discard.mp4`

## Notes, concerns, deviations, findings, thoughts, feedback
- `bootstrap/architecture.md` and `run2-handoffs.md` were not present in the checkout; used upstream `expo-ci-fixes` handoff + web `GameTable`/`PixelCard` as references.
- MVP includes setup_peek and swap (needed to reach playing phase and complete draw→discard loop); deferred snap overlays, ability UI, chat, sounds, game-over, Reanimated animations.
- Theme tokens use `foreground`/`foregroundMuted` (not `text`/`textMuted`); success dot uses static `colors.success` from `@/theme`.
- Branch stacks on `orch/expo-gametable/expo-ci-fixes` (PR #244); PR #245 base is `main` — planner should merge stack first or retarget.
- `.orchestrate/` left out of commit/PR diff per spec.

## Suggested follow-ups
- Port snap overlays, ability flows, cambio/reshuffle/game-over screens for full CAM-44 acceptance.
- Add Reanimated card flip/flash animations per `docs/mobile/native-theme-approximations.md`.
- Native iOS/Android EAS smoke on real devices.
- Retarget PR #245 base to merged stack branch once #243/#244 land.