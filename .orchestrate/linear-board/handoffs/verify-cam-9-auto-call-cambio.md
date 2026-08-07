<!-- orchestrate handoff
task: verify-cam-9-auto-call-cambio
branch: `orch/linear-board/cam-9-auto-call-cambio` (no verifier commits added; nothing new to commit)
agentId: bc-6e619442-0794-4e0e-b7a3-393fddcef9ef
runId: run-f8e65bec-48a4-4d36-8b5c-b29b5338e068
resultStatus: finished
finishedAt: 2026-08-07T17:04:52.011Z
-->

All verification checks pass. Every in-play hand-emptying path is covered: only `clearHandSlot` reduces a hand's size in play (lines 1054 snap, 1100 snap_give), and both are immediately followed by `tryAutoCallCambioForEmptyHand`. Other hand ops (`swap` line 948, `swapSlots` 750-751, penalty `placeCardInHand` 577) are net-neutral or additive, and `discard_drawn` discards the drawn card, not a hand card — so there is no uncovered "discard" empties-hand path in this engine.

## Verification
unit-test-verified

## Target
`cam-9-auto-call-cambio` on branch `orch/linear-board/cam-9-auto-call-cambio`

## Branch
`orch/linear-board/cam-9-auto-call-cambio` (no verifier commits added; nothing new to commit)

## Execution
- `git fetch origin orch/linear-board/cam-9-auto-call-cambio` + checkout → on target branch at `2df9e85` (2 commits above `main` @ `4a3c08a`).
- `pnpm test` (vitest run) → **18 passed / 0 failed**, 1 test file.
- `pnpm exec vitest run --reporter=verbose` → all 5 new CAM-9 cases pass by name:
  - auto-calls Cambio when a successful snap empties a hand ✓
  - does not auto-call when the snapped player still has cards ✓
  - applies the same caller protections as manual Cambio ✓
  - does not auto-call again when Cambio is already active ✓
  - auto-calls Cambio when snap_give empties the giver's hand ✓
- `pnpm lint` (biome check) → **0 errors**, 69 files checked.
- `pnpm typecheck` (tsc --noEmit) → **0 errors**.
- Code inspection of `src/game/engine.ts` diff + grep of all `.hand`/`clearHandSlot`/`placeCardInHand` sites to confirm path coverage.

## Findings
Per acceptance criterion:
- [x] A player's hand reaching 0 auto-enters `cambio_final` with that player as `cambioCallerId` and `hasCalledCambio=true`: `enterCambioFinal()` sets all three fields + log (shared with manual `call_cambio`); `tryAutoCallCambioForEmptyHand()` fires it when `hand.length === 0`. Confirmed at runtime by the snap and snap_give tests asserting `phase==='cambio_final'`, `cambioCallerId`, `hasCalledCambio`. **(met)**
- [x] Auto-call applies identical caller protection (no spy/swap targeting, caller cannot snap): protections derive purely from `cambioCallerId === playerId && phase === 'cambio_final'` (`isProtected`/`canTargetPlayer`) and the snap block `hasCalledCambio && phase === 'cambio_final'`. Since the auto path sets identical state, the "applies the same caller protections as manual Cambio" test passes, asserting `"Cambio caller cannot snap."`, spy `"That player is protected."`, and blind-switch `"That player's cards are protected."`. **(met)**
- [x] No auto-call when cards remain; no double-call if already called: guard `if (state.cambioCallerId || state.phase === 'cambio_final') return;` plus `if (player.hand.length > 0) return;`. Confirmed by the "still has cards" test (stays `playing`, `cambioCallerId` null) and the "already active" test (caller unchanged as alice, bob's `hasCalledCambio` stays false). **(met)**
- [x] New/updated vitest cases in `src/game/engine.test.ts` cover the above and `pnpm test` passes: new `describe("auto Cambio call on empty hand (CAM-9)")` with 5 cases; full suite 18/18 green. **(met)**
- [x] `pnpm lint` and `pnpm typecheck` pass: biome 0 errors, tsc 0 errors. **(met)**

Other findings (severity-ordered):
- (low) Design note (not a criterion violation): auto-call is intentionally gated to `phase === 'playing'`, so a hand emptied during `snap_window`/`revealed` will not auto-call. This matches the task's "trigger without disrupting snap windows/reshuffle" intent and the upstream's stated decision; no acceptance criterion requires firing outside `playing`.
- (low) Cross-player snap semantics: on a successful cross-player snap that empties the target's hand, the auto-call fires for the target before the `snap_give` step returns a card, so the target becomes the protected caller yet ends with 1 card. This is consistent with the task's explicit "snap that discards a matched card" + "snap-give flow" path list and does not break turn/snap flow (all 13 pre-existing tests still pass). Flagging only as a gameplay nuance for the planner.

## Notes & suggestions
- Turn flow is preserved by only running `resolveCambioCallTurnTransition` when the emptying player is the current turn holder; the manual `call_cambio` case was refactored to reuse the same `enterCambioFinal` + `resolveCambioCallTurnTransition` helpers, so no behavior drift there.
- Manual `pnpm dev` browser QA was optional and not performed; automated coverage exercises the exact changed code paths, so `unit-test-verified` is the strongest fully-supported claim. If desired, a follow-up live QA in `pnpm dev` could confirm final-round UX messaging after a live snap-to-zero.
- No target source files were modified by me; no PR/merge/rebase actions taken.