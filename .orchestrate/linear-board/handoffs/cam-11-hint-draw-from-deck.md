<!-- orchestrate handoff
task: cam-11-hint-draw-from-deck
branch: orch/linear-board/cam-11-hint-draw-from-deck
agentId: bc-5a35f635-53d5-4217-8553-278dedf4733a
runId: run-10fdf6b3-2cc6-4707-97c9-f9f0a9da1045
resultStatus: finished
finishedAt: 2026-08-07T17:12:39.823Z
-->

## Status
success

## Branch
`orch/linear-board/cam-11-hint-draw-from-deck`

## What I did
- Updated `src/components/game/GameTable.tsx` with a minimal hint-priority change by removing the `if (view.canSnap && view.canDraw) { return { text: voice.snapHint, tone: "snap" }; }` branch in `getActionBanner`.
- Kept snap-specific behavior intact:
  - `view.phase === "snap_window"` branch unchanged.
  - trailing `if (view.canSnap)` snap-only branch unchanged.
- Reused existing `voice.drawHint` path (via existing `if (view.canDraw)` branch), with no new voice strings and no edits to `src/lib/themes.ts`.
- Committed and pushed the fix, then opened a draft PR against `main` (PR #144).

## Measurements
- `view.canSnap && view.canDraw branch occurrences in src/components/game/GameTable.tsx: 1 → 0`
- `pnpm lint exit code: 0 == 0`
- `pnpm typecheck exit code: 0 == 0`

## Verification
live-ui-verified

## Notes, concerns, deviations, findings, thoughts, feedback
- Draft PR: https://github.com/evanbrierton/cambio/pull/144
- Walkthrough artifact: `/opt/cursor/artifacts/cam_11_draw_priority_and_snap_hints.mp4`
- Manual verification in running dev app confirmed:
  - draw-available own-turn hint shows `TAP DECK OR DISCARD TO DRAW`
  - snap state still shows `TAP ANY MATCHING CARD ON THE TABLE TO SNAP`
- ManagePullRequest required `skip_branch_prefix_check: true` because the required orchestrator branch name does not use the default enforced prefix.

## Suggested follow-ups
- (none)