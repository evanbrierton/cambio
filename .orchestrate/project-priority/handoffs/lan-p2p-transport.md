<!-- orchestrate handoff
task: lan-p2p-transport
branch: orch/project-priority/lan-p2p-transport
agentId: bc-fb99b4f9-69ac-4e44-9a38-cb2ff1c7f5ab
runId: run-d2e496c1-d6ed-4eb4-8150-322399f0f293
resultStatus: finished
finishedAt: 2026-08-21T16:30:40.365Z
-->

## Status
success

## Branch
`orch/project-priority/lan-p2p-transport`

## What I did
- Added `src/p2p/types.ts` with LAN transport contracts:
  - `LanSessionConfig` including `mode`, `roomId`, `hostIp`, optional `port`, heartbeat settings
  - transport event/disconnect reason types
  - defaults/constants (`DEFAULT_LAN_PORT = 9876`, heartbeat bounds/defaults)
- Added `src/p2p/lan-transport.ts` implementing transport layer only:
  - Host-side `LanHostRelay` (Option B in-tab relay) that accepts guest sockets, fans out `ServerMessage`, and collects `ClientMessage`
  - Guest-side `LanGuestTransport` that connects via `ws://{host-ip}:{port}/room/{roomId}`
  - Local-mode guarded entry points:
    - `createLanHostRelay(...)` returns `null` unless `mode === "local"`
    - `createLanGuestTransport(...)` returns `null` unless `mode === "local"`
  - Heartbeat ping/pong with timeout-based disconnect detection (<=5s), plus host-close signaling (`host_closing`) so guests emit disconnect
  - JSON serialization helpers for `ClientMessage`/`ServerMessage` reusing `@cambio/game` wire parsers/types (no message shape redefinition)
- Added focused tests in `src/p2p/lan-transport.test.ts`:
  - serialization round-trip for `ClientMessage` and `ServerMessage`
  - host fan-out + guest receive + guest->host client message collection with in-process mock sockets
  - heartbeat timeout disconnect within 5 seconds
  - inert behavior when mode is not local
- Kept scope confined to `src/p2p/**` only; no changes to online PartySocket path files.

## Measurements
- `src/p2p files: 0 → 3`
- `pnpm test: 1 failing / 210 passing → 0 failing / 211 passing`
- `pnpm typecheck errors: 1 → 0`
- `pnpm lint errors: 4 → 0`

## Verification
unit-test-verified

## Notes, concerns, deviations, findings, thoughts, feedback
- Implemented CAM-22 as transport-only per scope: no CTA/lobby/home UI changes and no integration into `useGameConnection`/PartySocket path.
- Host relay is intentionally lightweight/in-tab (Option B) and transport remains inert unless explicitly activated via `mode === "local"`.
- Heartbeat logic required one post-test fix: timeout now tracks missing pong correctly (no timeout reset loop without pong), matching the <=5s disconnect requirement.
- Opened/updated draft PR on `main` from this branch as requested.

## Suggested follow-ups
- Wire this transport behind a future explicit local-mode entry point once Capacitor shell work is ready (without changing current online mode behavior).
- Add a thin adapter layer for real LAN WebSocket server acceptor (if needed later) that feeds accepted sockets into `LanHostRelay.registerGuestSocket(...)`.