<!-- orchestrate handoff
task: cam-12-bot-tuning
branch: orch/linear-board/cam-12-bot-tuning
agentId: bc-625648d4-f0b6-470d-b3e6-9465618f31df
runId: run-4eddc5ae-b383-48b6-9ba9-f6bea86e9371
resultStatus: finished
finishedAt: 2026-08-07T17:32:54.622Z
-->

## Status
success

## Branch
`orch/linear-board/cam-12-bot-tuning`

## What I did
- Updated `src/game/bot.ts` to implement difficulty profiles that now drive:
  - human-like action pacing (`botThinkDelay`) with larger delay windows and mild randomized hesitation,
  - uncertainty estimates for unknown cards,
  - base Cambio aggressiveness by difficulty.
- Audited/fixed information hygiene in bot decisions:
  - removed direct hidden-card reads from decision logic (notably own-face-down reads in hand estimation and snap targeting),
  - made decision scoring rely on `BotKnowledge` + uncertainty estimates instead of ground-truth hidden card values,
  - added `BotKnowledge.prepareForState(state)` to clear stale cross-round memory and sync publicly face-up cards / empty slots.
- Reworked Cambio decisioning to be standings-aware:
  - replaced simple fixed-threshold call logic with `shouldCallCambio(...)`,
  - threshold now adjusts using `state.cumulativeScores` (overall standings) and projected totals, making leaders less eager to call early and preventing overly aggressive early-round Cambio calls.
- Kept changes contained to the bot module, then ran required checks and manual solo-vs-bots verification; pushed the branch and opened a draft PR against `main`.

## Measurements
(none)

## Verification
live-ui-verified

## Notes, concerns, deviations, findings, thoughts, feedback
- Automated checks passed:
  - `pnpm install`
  - `pnpm lint`
  - `pnpm typecheck`
  - `pnpm test` (13/13 passing)
- Manual verification completed in a live solo-vs-bots session (2 rounds observed): bots showed visible non-instant thinking delays and did not aggressively call Cambio in early turns.
- Walkthrough artifact: `/opt/cursor/artifacts/cam12_short_bot_delay_early_cambio_check.mp4`
- Draft PR was created from this branch to `main` with handoff summary and artifact attached.

## Suggested follow-ups
- Add targeted bot-behavior unit tests around:
  - `shouldCallCambio` standings adjustments (leader/trailer scenarios),
  - hidden-information safety regressions (no decision path reads hidden `hand[slot].card` values directly).