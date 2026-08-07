<!-- orchestrate handoff
task: cam-5-player-seats-no-scroll
branch: orch/linear-board/cam-5-player-seats-no-scroll
agentId: bc-062035a8-88ce-4aa5-a2e9-bda8aa4542d7
runId: run-9efa07ff-3158-4de5-8c33-90751726281f
resultStatus: finished
finishedAt: 2026-08-07T17:48:01.854Z
-->

## Status
success

## Branch
`orch/linear-board/cam-5-player-seats-no-scroll`

## What I did
- Updated `src/components/game/PlayerScrollStage.tsx`:
  - Kept the existing measured fit check (`contentWidth` vs available rail width) and used it to toggle static mode via `.is-static` on stage/rail.
  - In static mode, disabled `scrollToCenter`, reset scroll to `left: 0`, and kept items flat (no per-item 3D transform/opacity styling).
  - Preserved existing overflow carousel behavior (spacers, scroll centering, 3D transform pipeline, reduced-motion behavior).
  - Ensured fit/overflow recalculation on player-count changes by making layout measurement depend on `childCount`, while keeping existing resize + `ResizeObserver` wiring.
- Updated `src/app/globals.css` (only `.players-3d-*` selectors):
  - Added `.players-3d-stage.is-static` and `.players-3d-rail.is-static` modifiers.
  - Static mode now centers seats, disables horizontal scrolling/snap behavior, flattens 3D context, and hides lead/trail spacers so they consume no width.
- Committed/pushed to the required branch and opened/updated a draft PR against `main`: https://github.com/evanbrierton/cambio/pull/145

## Measurements
(none)

## Verification
live-ui-verified

## Notes, concerns, deviations, findings, thoughts, feedback
- Automated checks passed:
  - `pnpm lint` ✅
  - `pnpm typecheck` ✅
- Recorded UI walkthrough artifacts:
  - `/opt/cursor/artifacts/cam5_player_scroll_static_vs_overflow_verification.mp4` (3-player fit/static + 6-player overflow behavior)
  - `/opt/cursor/artifacts/cam5_resize_fit_overflow_crossover_4players.mp4` (explicit resize crossover: overflow @ ~942px → fit @ 1000px → overflow @ ~942px)
- No extra files are left modified; working tree is clean.

## Suggested follow-ups
- Add a focused component/integration test around `PlayerScrollStage` fit detection (mock item widths + rail width) to lock static-vs-overflow behavior and prevent regressions in future layout refactors.