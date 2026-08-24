# Verifier handoff: p2p-hook (CAM-23)

## Verification
verifier-failed

## Target
`p2p-hook` on branch `orch/project-priority/p2p-hook`

## Branch
`orch/project-priority/p2p-hook`

## Execution
- `git checkout orch/project-priority/p2p-hook` → on target branch (HEAD f16ba51)
- `pnpm install` → success
- `pnpm test src/p2p/lan-transport.test.ts src/hooks/useP2PConnection.test.ts src/game/host.test.ts` → 3 files, 30/30 passed
- `pnpm typecheck` → clean
- Started `pnpm party:dev` (8787) + `next dev --hostname 127.0.0.1 --port 3000` → both listening
- Manual Chrome (computerUse): host `/play/test?mode=local&host=1&name=Host` → lobby OK (1/6)
- Manual Chrome: guest `/play/test?mode=local&join=1&endpoint=127.0.0.1:9876&name=Guest` → **"LOST CONNECTION TO HOST."**, host stays 1/6
- Manual Chrome: online `/play/test?host=1&name=OnlineHost` → lobby OK; PartyKit on 8787 running
- `node .orchestrate/verifier/p2p-hook-browser-test.mjs` (Playwright headless) → hostLobbyOk=true, guestLobbyOk=false, guestLostConnection=true, hostPlayersAfterGuestJoin=1/6, onlineLobbyOk=true, onlinePartySocket8787=true (ws://127.0.0.1:8787/parties/main/test?...)
- `netstat -tlnp | grep 9876` → port 9876 not listening (expected for native LAN; localhost relies on SharedWorker dev bridge)
- Both host/guest tabs report `typeof SharedWorker === "function"`

## Findings
Per acceptance criterion:
- [x] useP2PConnection return type matches useGameConnection: test asserts 15 shared keys; hook returns `{ connected, ...messageState, error, send }` same as `useGameConnection` (met)
- [ ] mode=local host/guest lobby works over LAN transport: host lobby works; guest join fails live with heartbeat disconnect — host never shows 2/6 (not met)
- [x] Online play flow unchanged: `OnlinePlaySession` still uses `useGameConnection`; Playwright captured PartySocket to `:8787`; online lobby loads (met)
- [x] Tests pass: `pnpm test src/p2p/ src/hooks/useP2PConnection.test.ts src/game/host.test.ts` → 30/30 (met)

Other findings (severity-ordered):
- (high) Localhost guest join broken end-to-end: SharedWorker dev bridge connects briefly then guest hits `heartbeat_timeout` ("Lost connection to host"); join never reflected on host player list. Unit tests pass via direct mock sockets, not SharedWorker path.
- (med) No native TCP/WebSocket listener on port 9876 — real LAN guest connections off localhost remain future work (noted by implementer).
- (low) Return-shape test checks key names only, not TypeScript structural parity at compile time (types enforced indirectly via `PlaySessionView` using `GameConnectionState`).

## Notes & suggestions
- Root cause likely in `lan-dev-bridge.ts` relay/ping-pong or host `registerDevBridgeHost` message routing — guest `connected` fires (otherwise error would be `connection_error`) but host does not retain guest and heartbeats fail within 5s.
- CAM-24/25 should not assume localhost two-tab join works until dev bridge is fixed or native LAN server lands.
- Screenshots: `/opt/cursor/artifacts/screenshot_local_host_lobby.png`, `screenshot_guest_lost_connection.png`, `screenshot_online_lobby.png`
