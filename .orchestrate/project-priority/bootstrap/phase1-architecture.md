# Offline P2P Phase 1 — architecture reference

Read this before implementing CAM-23/24/25. Do **not** re-extract or duplicate `GameHost`.

## Shared core

Both online and offline modes share `GameHost` + `engine.ts`. Only the **transport** differs.

```
Online:  PartySocket → CambioParty (thin adapter) → GameHost
Offline: LAN WebSocket → useP2PConnection → GameHost (host device)
```

## Shipped prerequisites

| Slice | Status | Key paths |
| --- | --- | --- |
| GameHost extract (Phase 0) | Done | `src/game/host.ts`, `party/cambio.ts` |
| LAN transport (CAM-22) | Done | `src/p2p/lan-transport.ts`, `src/p2p/types.ts` |
| Capacitor shell (Phase 2a) | Done | `apps/native/` |

## LAN transport API (CAM-22)

Entry points in `src/p2p/lan-transport.ts`:

- `createLanHostRelay(config, options?)` → `LanHostRelay | null` (null unless `config.mode === "local"`)
- `createLanGuestTransport(config, options?)` → `LanGuestTransport | null`

`LanSessionConfig` (`src/p2p/types.ts`):

```ts
{ mode: "local", roomId, hostIp, port?, heartbeatIntervalMs?, heartbeatTimeoutMs? }
```

Events via `onEvent`:

- `{ type: "connected", role: "host" | "guest" }`
- `{ type: "server_message", message: ServerMessage }`
- `{ type: "client_message", clientId, message: ClientMessage }` (host only)
- `{ type: "disconnected", role, reason, ... }`

Host relay fans out server messages to guests; guests send client messages to host.

**Important:** Transport is inert unless `mode === "local"`. No file outside `src/p2p/**` currently imports it.

## useGameConnection contract (mirror this)

`src/hooks/useGameConnection.ts` return shape workers must match:

```ts
{
  connected, view, error, send,
  fleetingPeek, peekFlash, swapFlash, takeFlash, snapFlash,
  penaltyFlash, cambioFlash, reshuffleFlash, discardDrawFlash, deckDrawFlash
}
```

Internals:

- Uses `useServerMessages` for inbound handling
- Player ID via `storageKey` / `freshSessionKey` from `src/lib/party.ts`
- Connect query frozen in `connectQueryRef` so URL cleanup doesn't tear down socket

## Play page routing

`src/app/play/[roomId]/page.tsx` currently always calls `useGameConnection`.

Phase 1 adds:

- `mode=local` query param → `useP2PConnection`
- `host=1` / `join=1` + optional `endpoint` (IP:port) for local sessions
- Default / `mode=online` → unchanged `useGameConnection`

## GameHost host mode wiring

`GameHost` expects `HostPeer` objects:

```ts
type HostPeer = { playerId: string; send: (message: ServerMessage) => void; connected: boolean }
```

See `party/cambio.ts` for the online adapter pattern. For LAN host:

1. Instantiate `GameHost` with `roomId`
2. Wire `LanHostRelay.onEvent` client_message → `host.handleMessage(peer, message)`
3. Wire GameHost outbound → relay broadcast to guests

## Constraints (from project priority doc)

| Do | Don't |
| --- | --- |
| Finish Phase 1 on existing `GameHost` + LAN transport | Duplicate host logic in client |
| Add **Play nearby** on Capacitor-wrapped home | Expo UI ports before Phase 1 |
| Keep `party/cambio.ts` thin | Pile logic back into fat `CambioParty` |
| Use storage/clipboard adapters | Raw `localStorage` / cookie glue in native |

## Test commands

```bash
pnpm test src/p2p/lan-transport.test.ts
pnpm test src/game/host.test.ts
pnpm test   # full suite before handoff
```

## Linear issues

- CAM-23: useP2PConnection hook (In Progress)
- CAM-24: Play nearby lobby + routing (blocked by CAM-23)
- CAM-25: Host reliability — Wake Lock, visibility pause (blocked by CAM-23)
