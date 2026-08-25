<!-- orchestrate handoff
task: verify-expo-gametable-mvp
branch: `orch/expo-gametable/expo-gametable-mvp` (commit `0270399` — verifier artifacts only)
agentId: bc-31c6519c-dce7-496c-be4d-56d3a8a1a417
runId: run-dcb96790-9e75-4c67-8e4b-f2f58840783c
resultStatus: finished
finishedAt: 2026-08-25T18:05:17.377Z
-->

## Verification
live-ui-verified

## Target
`expo-gametable-mvp` on branch `orch/expo-gametable/expo-gametable-mvp`

## Branch
`orch/expo-gametable/expo-gametable-mvp` (commit `0270399` — verifier artifacts only)

## Execution
- `pnpm install` → installed 733 packages; `apps/expo/node_modules` was missing in snapshot (typecheck failed before install)
- `pnpm --filter @cambio/expo typecheck` → **PASS** (exit 0, no errors)
- `pnpm test` → **PASS** — 34 test files, 277 tests, 0 failures
- `pnpm party:dev` → PartyServer ready on `http://0.0.0.0:8787` (404 on `/` expected; WS 101 on party routes)
- `EXPO_PUBLIC_PARTY_HOST=localhost:8787 pnpm --filter @cambio/expo web -- --port 8081` → Expo web **200** on `http://localhost:8081`
- Manual: home → nickname "Verifier" → Solo vs 2 bots (medium) → "Play vs bots" → lobby Start → setup_peek (slots 3 & 4) → **GameTable** visible (seats, deck, discard, own hand) — not `GameInProgressView` placeholder
- Manual: draw from deck (42→41 cards, 5♦ in DRAWN slot) → discard → header changed "Your turn" → "Sleepy Marble's turn"
- Manual: bots played autonomously → turn returned to "Your turn", discard top Q♣, deck 40
- Artifact: `/opt/cursor/artifacts/verifier_expo_gametable_solo_draw_discard.mp4`
- Committed `verifier/expo-gametable-mvp/{execution-log.md,repro.sh}` and pushed to branch

## Findings
Per acceptance criterion:
- [x] Post-lobby shows GameTable not placeholder: GameTable with player seats, deck/discard piles, and hand cards after lobby start; no placeholder text (met)
- [x] Solo game: draw and discard work via UI: drew 5♦ from deck, discarded via DISCARD button, turn advanced to bot (met)
- [x] No game logic duplicated in Expo — uses useGameConnection: sole connection in `app/play/[roomId].tsx`; `GameTable`/`TableDeckArea` only call `send({ type: ... })` with view flags from hook (met)
- [x] `pnpm --filter @cambio/expo typecheck` passes: clean after `pnpm install` (met)

Other findings (severity-ordered):
- (med) Fresh snapshot requires `pnpm install` before Expo typecheck — without it, 25+ TS2307 module-not-found errors and `expo/tsconfig.base` missing
- (low) `GameInProgressView` still exported in `LobbyView.tsx` but unused; play route correctly renders `GameTable`
- (low) No web regression observed in this pass; only Expo web path exercised (Next.js dev server not started)

## Notes & suggestions
- Verifier repro script: `verifier/expo-gametable-mvp/repro.sh` covers automated checks; manual UI still needs `party:dev` + Expo web as documented in `apps/expo/README.md`.
- Upstream artifact `/opt/cursor/artifacts/expo_gametable_solo_draw_discard.mp4` not present in this VM; independent recording captured equivalent flow.
- Planner should ensure CI/install step includes Expo workspace deps so typecheck is not env-dependent.