<!-- orchestrate handoff
task: verify-p2p-hook
branch: orch/project-priority/p2p-hook
agentId: bc-66cd31f2-13a0-462b-b239-66b796e7f9dc
runId: run-5c346ffb-656f-4db5-9f3e-825084e08b0d
resultStatus: finished
finishedAt: 2026-08-24T18:56:20.665Z
-->

## Verification
verifier-failed

## Target
`p2p-hook` on branch `orch/project-priority/p2p-hook`

## Branch
`orch/project-priority/p2p-hook`

## Execution
- `git checkout orch/project-priority/p2p-hook` → on target branch (HEAD f16ba51)
- `pnpm install` → success
- `pnpm test src/p2p/lan-transport.test.ts src/hooks/useP2PConnection.test.ts src/game/host.test.ts` → 3 files, **30/30 passed**
- `pnpm typecheck` → clean (0 errors)
- Started `pnpm party:dev` (8787) + `next dev --hostname 127.0.0.1 --port 3000` → both listening (`curl :3000` → 200; workerd on :8787)
- Manual Chrome: `/play/test?mode=local&host=1&name=Host` → lobby loads, Host shown 1/6
- Manual Chrome: `/play/test?mode=local&join=1&endpoint=127.0.0.1:9876&name=Guest` → **"LOST CONNECTION TO HOST."**; host remains 1/6
- Manual Chrome: `/play/test?host=1&name=OnlineHost` (no `mode=local`) → online lobby loads
- `node .orchestrate/verifier/p2p-hook-browser-test.mjs` (Playwright headless) → `hostLobbyOk=true`, `guestLobbyOk=false`, `guestLostConnection=true`, `hostPlayersAfterGuestJoin=1/6`, `onlineLobbyOk=true`, `onlinePartySocket8787=true` (`ws://127.0.0.1:8787/parties/main/test?...`)
- `netstat -tlnp | grep 9876` → port 9876 not listening (localhost path depends on SharedWorker dev bridge)
- Both host/guest tabs: `typeof SharedWorker === "function"`

## Findings
Per acceptance criterion:
- [x] useP2PConnection return type matches useGameConnection: hook returns `{ connected, ...messageState, error, send }` identical to `useGameConnection`; test asserts 15 shared public keys; `PlaySessionView` types both via `GameConnectionState` (**met**)
- [ ] mode=local host/guest lobby works over LAN transport: host lobby OK; guest join fails live — heartbeat disconnect, host never reaches 2/6 (**not met**)
- [x] Online play flow unchanged: `OnlinePlaySession` still mounts only `useGameConnection`; Playwright captured PartySocket to `:8787`; online lobby functional (**met**)
- [x] Tests pass: `pnpm test src/p2p/ src/hooks/useP2PConnection.test.ts src/game/host.test.ts` → 30/30 (**met**)

Other findings (severity-ordered):
- (high) Localhost guest join broken end-to-end: SharedWorker dev bridge appears to connect briefly (`heartbeat_timeout` not `connection_error`), but join never registers on host and guest shows "Lost connection to host." Unit tests pass via direct mock socket pairs, bypassing the dev bridge.
- (med) No native WebSocket listener on port 9876 — real LAN guest connections off localhost remain unimplemented (acknowledged by implementer).
- (low) Return-shape unit test validates key names only, not runtime behavior of the dev bridge path.

## Notes & suggestions
- Likely fix target: `src/p2p/lan-dev-bridge.ts` relay/ping-pong routing or host-side `registerDevBridgeHost` message handling — guest `connected` fires but host player list and pong relay do not complete.
- CAM-24 (Play nearby CTA) and CAM-25 (host reliability) should not assume two-tab localhost join works until dev bridge is fixed or a native LAN listener is added.
- Verifier artifacts committed: `.orchestrate/verifier/p2p-hook-browser-test.mjs`, `p2p-hook-test-output.txt`, `p2p-hook-verifier-handoff.md`
- Screenshots: `/opt/cursor/artifacts/screenshot_local_host_lobby.png`, `screenshot_guest_lost_connection.png`, `screenshot_online_lobby.png`