<!-- orchestrate handoff
task: tutorial-v1
branch: evanbrierton/tutorial-v1-9adb
agentId: bc-8d22bef3-834a-4b1d-87c2-9c47efef9adb
runId: run-524cb382-4e6c-41a5-b360-32268f4081ef
resultStatus: finished
finishedAt: 2026-08-11T14:20:43.879Z
-->

## Status
success

## Branch
`evanbrierton/tutorial-v1-9adb`

## What my subtree did
- **CAM-66:** `src/lib/tutorial.ts` + `src/hooks/useTutorial.ts` — `cambio-tutorial-home-seen` / `cambio-tutorial-game-seen` flags (`"0"`/`"1"`), mark/replay/reset helpers, SSR-safe hydration.
- **CAM-68:** `TutorialModal` on `/` — 5-step intro (goal, peek, turn, snap, Cambio), auto-open for first visit, **How to play** replay, `/rules` link.
- **CAM-69:** `src/lib/rules-content.ts` + `src/app/rules/page.tsx` — full rules from README structure; linked from home + modal.
- **CAM-67:** `react-joyride@3.2.0` + `TutorialCoach` with pixel-border custom tooltip.
- **CAM-70:** `data-tutorial` on deck, own-hand seat, discard, call-cambio chrome; coach in `GameTable`; action hint toast suppressed while coach runs; skipped in lobby.
- **CAM-71:** Escape/skip marks seen; modal focus trap + arrow keys; framer-motion; mobile-safe sizing.
- Published orchestrate workspace at `.orchestrate/tutorial-v1/` and `docs/orchestrate/project-priority-discovery.md`.

## Verification
unit-test-verified

(`pnpm typecheck`, `pnpm test` 83 passed, `pnpm lint`, `pnpm build` all green. No live browser smoke.)

## Notes, concerns, deviations, findings, thoughts, feedback
- Implemented directly on one branch (matchmaking-v1 precedent) — orchestrate worker fan-out not run from this subplanner VM.
- **No draft PR opened** per subplanner handoff rule; branch pushed: https://github.com/evanbrierton/cambio/tree/evanbrierton/tutorial-v1-9adb
- Branch is based on `main`, not upstream `evanbrierton/matchmaking-v1-745b` — parent may want to rebase/stack after matchmaking lands.
- Manual first-visit → solo-game coach flow not exercised in cloud VM.

## Suggested follow-ups
- Parent opens draft PR against `main`: https://github.com/evanbrierton/cambio/compare/main...evanbrierton/tutorial-v1-9adb
- Manual regression: first visit modal, skip/finish persistence, **How to play** replay, in-game coach skip/finish, `/rules` on mobile.
- Optional: `/rules` link in game settings menu.