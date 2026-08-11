# Handoff: tutorial-implement

## Status
success

## Branch
`evanbrierton/tutorial-v1-9adb`

## What my subtree did
- **CAM-66:** `src/lib/tutorial.ts` + `src/hooks/useTutorial.ts` with `"0"`/`"1"` localStorage flags and replay helpers; unit tests in `tutorial.test.ts`.
- **CAM-69:** `src/lib/rules-content.ts` + `src/app/rules/page.tsx`; links from home and tutorial modal.
- **CAM-68:** `src/components/tutorial/TutorialModal.tsx` — 5-step modal with Skip/Back/Next/Got it, Escape=skip, focus trap, framer-motion; auto-open on `/` when home unseen; **How to play** replays.
- **CAM-67:** `react-joyride@3.2.0` + theme-styled `TutorialCoach.tsx` custom tooltip.
- **CAM-70:** `data-tutorial` on deck, discard, own-hand seat, call-cambio chrome; coach mounted in `GameTable`; action hint toast suppressed while coach active; no coach in lobby.
- **CAM-71:** Escape/skip mark seen; modal focus trap + keyboard nav; mobile-friendly modal/coach sizing.
- Added `docs/orchestrate/project-priority-discovery.md` Tutorial section.

## Verification
unit-test-verified

## Notes, concerns, deviations, findings, thoughts, feedback
- Implemented directly on single branch (matchmaking-v1 precedent) — orchestrate worker spawn not executed from subplanner turn.
- Parent should open draft PR against `main`; subplanner did not per handoff rule.
- Manual live-ui smoke (first visit modal → solo game coach) not run in cloud VM.
- Upstream matchmaking branch not merged; tutorial is based on `main`.

## Suggested follow-ups
- Open draft PR against `main`.
- Manual regression: first visit, skip, replay via How to play, coach skip/finish persistence.
- Optional: link `/rules` from game settings menu.
