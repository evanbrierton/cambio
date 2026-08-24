<!-- orchestrate handoff
task: p2p-hook
branch: orch/project-priority/p2p-hook
agentId: bc-f2319e34-4fb2-4b80-ba85-c8f37739d80c
runId: run-201aebb6-31a7-4e74-a629-6919fc18672e
resultStatus: finished
finishedAt: 2026-08-24T18:26:23.135Z
-->

## Status
success

## Branch
`orch/project-priority/p2p-hook`

## What I did
- Added `src/hooks/useP2PConnection.ts` mirroring `useGameConnection` return shape via `useServerMessages`, with host (`GameHost` + `LanHostRelay`) and guest (`LanGuestTransport` + `endpoint`) roles and frozen connect query.
- Added `src/p2p/p2p-host-session.ts` to mirror `party/cambio.ts` connect/message/disconnect over LAN peers without duplicating engine logic.
- Added `src/p2p/lan-endpoint.ts` (parse `hostIp:port`) and `src/p2p/lan-dev-bridge.ts` (SharedWorker bridge for localhost dev testing).
- Extended `src/p2p/lan-transport.ts` with `sendServerMessage()` for per-guest server fan-out.
- Updated `src/app/play/[roomId]/page.tsx` to route `mode=local` through `LocalPlaySession` / `useP2PConnection`; online stays on `OnlinePlaySession` / `useGameConnection` (only one transport hook mounts).
- Added `src/hooks/useP2PConnection.test.ts` covering endpoint parsing, host/guest lobby join, broadcast, and return-shape parity.
- Marked CAM-23 Done in Linear. Opened draft PR #235.

## Measurements
- `pnpm test src/p2p/lan-transport.test.ts src/hooks/useP2PConnection.test.ts src/game/host.test.ts`: 23 passing → 30 passing
- `src/hooks/useP2PConnection.ts` LOC: 0 → 387
- `src/p2p/p2p-host-session.ts` LOC: 0 → 273

## Verification
unit-test-verified

## Notes, concerns, deviations, findings, thoughts, feedback
- Play page uses separate `OnlinePlaySession` / `LocalPlaySession` components so `useGameConnection` does not open PartySocket during `mode=local` (required since `useGameConnection` is outside the allowed modify list).
- Localhost guest connections use the SharedWorker dev bridge; joining via real LAN IP still needs a native TCP WS listener (Capacitor/future work). CAM-24 should wire homepage CTAs and surface host IP/port in lobby UI.
- Guest join handshake sends `{ type: "join", playerId, name }` after transport connect; host assigns final seat id via `GameHost.handleConnect` (same as online reconnect semantics).
- Bootstrap docs at `.orchestrate/project-priority/bootstrap/` were not present in the workspace; implemented from Linear CAM-23 spec and existing `party/cambio.ts` / `lan-transport.ts` patterns.

## Suggested follow-ups
- CAM-24: Play nearby homepage CTA, lobby host IP/port display, copy-to-clipboard.
- CAM-25: Wake Lock, visibility pause, host-disconnected guest UX.
- Native LAN WebSocket server plugin to accept real `ws://{lan-ip}:9876` guest connections off localhost.