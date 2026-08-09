<!-- orchestrate handoff
task: cam-75-swap-vfx
branch: orch/game-polish/cam-75-swap-vfx
agentId: bc-95a8705a-b284-4c1a-9c23-7a00122f1e94
runId: run-b00ff3eb-5f34-483b-a38c-00285c72d2df
resultStatus: finished
finishedAt: 2026-08-09T10:32:15.214Z
-->

## Status
success

## Branch
`orch/game-polish/cam-75-swap-vfx`

## What I did
- Added `src/components/game/SwapFlashOverlay.tsx` — gold/violet dual-tone overlay with crossing SVG arcs, orbit ring, rotating ⇄ icon, and slot label.
- Updated `src/components/cards/PixelCard.tsx` — imports new overlay; swap card motion uses exchange-style `rotateY`/lateral shift instead of generic wobble.
- Updated `src/app/globals.css` — dedicated `--swap-flash-a/b` palette and animations; dual-seat gold/violet seat glow distinct from cyan draw-pile flash (`accent-alt`).
- Updated `src/lib/sounds.ts` — split `draw` into `deckDraw`, `discardDraw`, `reshuffle`; redesigned `swap` as crossing square-wave tones with resolution chime.
- Updated `src/hooks/useGameConnection.ts` — plays flash-driven sounds on `swap_flash`, `deck_draw_flash`, `discard_draw_flash`, `reshuffle_flash` WS events.
- Updated `src/hooks/useGameSounds.ts` — removed log-based draw sound and duplicate swap/reshuffle handling (kept signature for GameTable compat).
- Marked CAM-75 **In Progress → In Review** on Linear.
- Opened draft PR #165 against `main`.

## Measurements
- `src/components/game/SwapFlashOverlay.tsx` LOC: 0 → 55
- `SoundId` draw-family variants: 1 (`draw`) → 4 (`deckDraw`, `discardDraw`, `reshuffle`, `swap`)
- `pnpm test`: 39 passing → 39 passing
- `pnpm lint && pnpm typecheck`: pass → pass

## Verification
type-check-only

Automated checks pass; screen recording captures the enhanced swap overlay styling. Live Queen/Jack/King swap in a solo bot game was not completed (party connection timed out during browser attempt).

## Notes, concerns, deviations, findings, thoughts, feedback
- `PixelCard` lives at `src/components/cards/PixelCard.tsx` (brief cited `src/components/game/PixelCard.tsx`); modified cards path since that is where `SwapFlashOverlay` was inlined.
- `GameTable.tsx` untouched per scope; seat highlight differentiation achieved via CSS overrides on existing `.swap-seat-flash` classes.
- Draw/take audio now tied to WS flash events instead of log string matching — avoids conflation and removes duplicate playback.
- Screen recording artifact: `/opt/cursor/artifacts/cam-75-swap-flash-distinct-vfx.mp4`
- Draft PR: https://github.com/evanbrierton/cambio/pull/165

## Suggested follow-ups
- Verifier: live solo-bot game — trigger Queen/Jack/King swap vs deck draw and confirm distinct VFX/SFX end-to-end.
- CAM-82: zustand persist for sound prefs may simplify `sounds.ts` hydration once merged.