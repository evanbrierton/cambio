<!-- orchestrate handoff
task: matchmaking-v1-closeout
branch: orch/priority-closeout/matchmaking-v1-closeout
agentId: bc-4972fa55-e421-4f17-9bff-d1d58f5aedb1
runId: run-6d6153b3-df41-42e6-9fe6-974c6080cd0b
resultStatus: finished
finishedAt: 2026-08-21T15:33:07.234Z
-->

## Status
success

## Branch
(no branch)

## What I did
- Ran full quality gate on fresh `main` after `pnpm install`: lint, typecheck, test (156), build — all green.
- Audited `main` against CAM-91, CAM-92, and CAM-53 acceptance criteria via Linear MCP + code/trace review of `src/game/host.ts`, `src/game/engine.ts`, `src/matchmaking/queue.ts`, `party/matchmaking.ts`, `party/cambio.ts`, `src/hooks/useMatchmaking.ts`, `src/app/match/page.tsx`, `src/app/page.tsx`.
- Confirmed all acceptance criteria are **met** on `main`; no product-code or test changes required (regression coverage already present and passing).
- Reconciled Linear: moved CAM-91, CAM-92, CAM-53, CAM-70 → **Done** with evidence comments linking #193/#194/#195/#197. Did **not** move CAM-34 (no `StorageAdapter`/`ClipboardAdapter` on this `main` snapshot), CAM-50 epic (P2 backlog children CAM-58–62 remain), or CAM-65 epic (CAM-71 polish still Backlog).
- No PR opened (no repo changes). PR #208 noted as superseded by main; not merged or closed.

## Measurements
- `pnpm test`: 156 passing → 156 passing
- `pnpm test src/game/host.test.ts src/matchmaking/queue.test.ts`: 25 passing → 25 passing
- `pnpm lint`: 0 issues → 0 issues
- `pnpm typecheck`: pass → pass
- `pnpm build`: pass → pass

## Verification
unit-test-verified

## Notes, concerns, deviations, findings, thoughts, feedback

### CAM-91 acceptance (all MET)

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Stale matchmade lobby with away players clears seats | **MET** | `purgeStaleMatchmadeLobbyPlayers()` in `src/game/engine.ts:150-171` called from `restoreFromSaved()` at `src/game/host.ts:116`; live path via `removeAwayMatchLobbyPlayer()` timer at `host.ts:409-437`. Test: `purges stale away humans when restoring a matchmade lobby`. |
| Two strangers same chosen name both seat | **MET** | `allocateDisplayName()` auto-suffixes in matchmade rooms (`engine.ts:294-318`). Test: `auto-suffixes duplicate names in matchmade rooms` → `["Alex", "Alex 2"]`. |
| Friend rooms reject duplicate names | **MET** | Non-matchmade returns `"That name is already taken."` (`engine.ts:304-305`). Test: `still rejects duplicate names in friend rooms`. |
| In-progress matchmade games keep disconnected players | **MET** | `handleDisconnect()` only removes lobby away seats; in-game sets `connected=false` without removal (`host.ts:343-356` vs 358+). Test: `keeps disconnected players during an in-progress matchmade game`. |

### CAM-92 acceptance (all MET)

| Criterion | Status | Evidence |
|-----------|--------|----------|
| After game starts, Find Match never returns that roomId | **MET** | `startMatchmadeGame()` → `onMatchLobbyClosed` → `party/cambio.ts:35-46` POST `/close-lobby` → `closeLobby()` removes room from buckets+assignments (`queue.ts:125-144`). Test: `stops seating into a lobby after closeLobby`; `auto-starts matchmade rooms…` verifies `closed === ["test-room"]`. |
| Leaving running game + Find Match → new/open lobby | **MET** | Started room removed from queue (above); fresh `match=1` join rejected if `phase !== "lobby"` (`host.ts:272-283`). Test: `rejects Find Match into a matchmade room that already started`. |
| Open lobbies still fill FIFO | **MET** | `assignPlayer()` uses `sortedLobbies().find(...)` by `createdAt` (`queue.ts:49-51,76-78`). Test: `seats into oldest open lobby with space (FIFO)`. |

**Leaver reseat blocking:** `matchLobbyDepartedIds` blocks passive reconnect (`host.ts:220-224,293-299,420`); Find Match with `match=1` clears departed id for open-lobby re-entry (`host.ts:286-287`). Test: `rejects passive reconnect after an away seat is removed`.

### CAM-53 acceptance (all MET)

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Home one Find Match CTA | **MET** | `src/app/page.tsx:105-112` — single `goToMatch()` button → `/match`; no match knobs on home. |
| Changing target/bot-fill while queued re-buckets | **MET** | `useMatchmaking.findMatch()` cancels prior socket+enqueue (`useMatchmaking.ts:55-63`); `/match` page `useEffect` deps include `targetSize`/`fillWithBots` (`match/page.tsx:49-86`). |
| Successful match lands in correct lobby with match flags | **MET** | Redirect to `/play/{roomId}?match=1&targetSize=…&fillWithBots=…&host=1` (`match/page.tsx:64-71`); GameHost sets `isMatchmade`/target/bots on connect (`host.ts:266-270`). |
| Cancel dequeues and returns home | **MET** | Cancel button → `router.push("/")` + cleanup `cancel()` sends cancel WS message (`match/page.tsx:74-77,143-145`; `useMatchmaking.ts:28-39`). |

### Regression tests confirmed (all passing, no additions needed)
**host.test.ts:** `purges stale away humans when restoring a matchmade lobby`, `auto-suffixes duplicate names in matchmade rooms`, `still rejects duplicate names in friend rooms`, `keeps disconnected players during an in-progress matchmade game`, `rejects Find Match into a matchmade room that already started`, `rejects passive reconnect after an away seat is removed`, `auto-starts matchmade rooms at target size with bot fill`, `allows Find Match re-entry to the same lobby after leaving`.

**queue.test.ts:** `seats into oldest open lobby with space (FIFO)`, `stops seating into a lobby after closeLobby`.

### Quality gate output (main @ 05e1bdc)
```
pnpm lint     → Checked 112 files, no issues
pnpm typecheck → pass
pnpm test     → 20 files, 156 tests passed (1.05s)
pnpm build    → Next.js 16.3.0 compiled successfully
```

### Linear status changes
- **CAM-91** In Review → **Done** (comment added)
- **CAM-92** In Review → **Done** (comment added)
- **CAM-53** Backlog → **Done** (comment added)
- **CAM-70** Backlog → **Done** (satisfied by #197; comment added)
- **CAM-34** — unchanged (In Review); no `StorageAdapter`/`ClipboardAdapter` on this `main` checkout
- **CAM-50** — unchanged (In Review); P2 children CAM-58–62 intentionally Backlog
- **CAM-65** — unchanged (In Review); CAM-71 polish still Backlog

### PR
**no PR - no repo changes**

## Suggested follow-ups
- Move **CAM-50** epic to Done once planner decides P2 children (CAM-58–62) should be detached or re-parented from the v1 epic.
- Reconcile **CAM-34** after confirming mobile Phase 0-1 (#200–203) is on the remote `main` this VM snapshot lacks (`packages/` absent locally).
- Planner may close or archive stale PR #208 when ready (substance already on main).