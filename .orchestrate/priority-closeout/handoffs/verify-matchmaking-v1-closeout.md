<!-- orchestrate handoff
task: verify-matchmaking-v1-closeout
branch: (no branch) — I committed nothing; verification ran directly against `main` (`05e1bdc`), working tree clean.
agentId: bc-178c3d8f-bc3e-4a0d-963c-b8579312dec9
runId: run-50d3fc48-4a0a-483d-bb7d-e95b4efbcb6f
resultStatus: finished
finishedAt: 2026-08-21T15:37:29.150Z
-->

I've independently verified the Matchmaking v1 closeout against `main` (HEAD `05e1bdc`). Every acceptance path passes and is exercised by regression tests.

## Verification
unit-test-verified

## Target
`matchmaking-v1-closeout` on branch `orch/priority-closeout/matchmaking-v1-closeout`

## Branch
(no branch) — I committed nothing; verification ran directly against `main` (`05e1bdc`), working tree clean.

## Execution
- `pnpm install` → "Already up to date" (deps present, lockfile current).
- `pnpm lint` → `Checked 112 files in 100ms. No fixes applied. ✔ No issues found`.
- `pnpm typecheck` → `tsc --noEmit`, exit 0, no output.
- `pnpm test` → **20 files / 156 tests passed** (1.02s).
- `pnpm build` → Next.js 16.3.0 compiled + static generation of 13 routes, exit 0.
- `pnpm test src/game/host.test.ts src/matchmaking/queue.test.ts` → **2 files / 25 tests passed**.
- `rg closeLobby|purgeStaleMatchmadeLobbyPlayers|matchLobbyDepartedIds` → present in `party/matchmaking.ts`, `src/matchmaking/queue.ts`, `src/game/host.ts`, `src/game/engine.ts` (+ tests).
- `rg RTCPeerConnection|webrtc|createOffer|iceCandidate|react-native|Capacitor|Tauri|mdns|multicast` across repo → **no matches** (no Phase 6 code).
- `git log` → matchmaking landed via #193/#194/#195; no later rework commits touching `host.ts`/`queue.ts`/`matchmaking.ts` (only tutorial/CAM-93 commits sit on top).

## Findings
Per acceptance criterion:
- [x] **Quality gate passes** (lint/typecheck/test/build): met — outputs above.
- [x] **CAM-91 — stale away-seat purge**: met — `purgeStaleMatchmadeLobbyPlayers()` (`engine.ts:150-171`) removes disconnected non-bot humans in matchmade lobbies, called from `migrateHostState`→`restoreFromSaved` (`host.ts:116,727`); live path via `removeAwayMatchLobbyPlayer` timer (`host.ts:409-438`). Test: `purges stale away humans when restoring a matchmade lobby` (green).
- [x] **CAM-91 — duplicate names both seat**: met — `allocateDisplayName` auto-suffixes only when `state.isMatchmade` (`engine.ts:294-318`), wired through join (`engine.ts:957,963`). Test: `auto-suffixes duplicate names in matchmade rooms` → `["Alex","Alex 2"]`.
- [x] **CAM-91 — friend-room duplicate rejection**: met — non-matchmade returns `"That name is already taken."` (`engine.ts:304-305`). Test: `still rejects duplicate names in friend rooms`.
- [x] **CAM-91 — in-game disconnect retention**: met — `handleDisconnect` only removes seats when `isMatchmadeLobby`; in-progress just sets `connected=false` (`host.ts:332-368`). Test: `keeps disconnected players during an in-progress matchmade game`.
- [x] **CAM-92 — closeLobby removes started room from queue**: met — `startMatchmadeGame`→`onMatchLobbyClosed`→`party/cambio.ts:35-47` POST `/close-lobby`→`closeLobby` strips buckets+assignments (`queue.ts:125-144`). Tests: `stops seating into a lobby after closeLobby`; `auto-starts matchmade rooms…` asserts `closed === ["test-room"]`.
- [x] **CAM-92 — started-room join rejection**: met — fresh `match=1` join rejected when `phase !== "lobby"` (`host.ts:272-284`). Test: `rejects Find Match into a matchmade room that already started`.
- [x] **CAM-92 — FIFO fill**: met — `sortedLobbies` by `createdAt` + first with space (`queue.ts:49-51,76-78`). Test: `seats into oldest open lobby with space (FIFO)`.
- [x] **CAM-92 — leaver blocking (matchLobbyDepartedIds)**: met — departed id added on away-removal (`host.ts:420`), blocks passive reconnect (`host.ts:220-224,289-300`), cleared on explicit Find Match re-entry (`host.ts:286-287`). Tests: `rejects passive reconnect after an away seat is removed`; `allows Find Match re-entry to the same lobby after leaving`.
- [x] **CAM-53 — single Find Match CTA**: met — one `goToMatch()` button →`/match` on home; no match knobs on `page.tsx` (`page.tsx:62-66,105-112`).
- [x] **CAM-53 — re-bucketing while queued**: met — `findMatch` supersedes prior socket (`useMatchmaking.ts:53-63`); `/match` effect re-runs on `targetSize`/`fillWithBots` deps (`match/page.tsx:44-86`).
- [x] **CAM-53 — match-flag redirect**: met — redirect to `/play/{roomId}?match=1&targetSize=…&fillWithBots=…&host=1` (`match/page.tsx:64-71`); host applies match config on connect (`host.ts:266-270`).
- [x] **CAM-53 — cancel/dequeue**: met — Cancel →`router.push("/")` + cleanup `cancel()` sends WS `cancel` (`match/page.tsx:74-77,143-145`; `useMatchmaking.ts:28-40`); server `onClose`/`cancel` frees seat (`party/matchmaking.ts:87-114`).
- [x] **No Phase 6 code / no rework of merged phases**: met — zero WebRTC/LAN/native-shell references; git history shows matchmaking merged via #193/#194/#195 with no subsequent edits to the matchmaking/host/engine files.

Other findings (severity-ordered):
- (low) The upstream worker's Linear reconciliation (CAM-91/92/53/70 → Done) is outside my repo-scoped verification; I could not and did not re-check Linear state. Code/test evidence fully backs those transitions.
- (low) PR #208 (`stale-lobby-host-cleanup`) is a stale duplicate — its substance (`purgeStaleMatchmadeLobbyPlayers`, `closeLobby`, `matchLobbyDepartedIds`) is already on `main`. Not merged/closed by me (planner owns integration).

## Notes & suggestions
- No repo changes were needed or made; regression coverage for both CAM-91 and CAM-92 already exists and passes, so this is a genuine `unit-test-verified` (the CAM-91/CAM-92 code paths are exercised by passing tests, not merely type-checked).
- Focused suites are deterministic (fake timers); no flakiness observed across the full and focused runs.
- Planner follow-ups the upstream flagged remain reasonable: decide CAM-50 epic closure once P2 children (CAM-58–62) are re-parented, and reconcile CAM-34 against the mobile Phase 0-1 `packages/` that this checkout does not contain.