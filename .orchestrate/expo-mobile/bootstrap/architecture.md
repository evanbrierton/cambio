# Expo mobile — architecture reference

Read before implementing CAM-41/42/43. **Do not** touch Offline P2P product work (deferred).

## Repo layout

```
cambio/
├── apps/
│   ├── native/     ← Capacitor shell (remote URL WebView) — keep unchanged
│   └── expo/       ← NEW: Expo app (CAM-41 creates this; use `apps/expo` or `apps/mobile` per issue — prefer `apps/expo` to avoid clashing with issue's `apps/mobile` naming; CAM-41 says `apps/mobile` but workspace already uses apps/* — use `apps/expo` unless issue explicitly requires `apps/mobile`)
├── packages/
│   ├── game/       ← @cambio/game — engine, types, wire-schema
│   └── client/     ← @cambio/client — useGameConnection, party config, platform adapters
├── src/            ← Next.js web app — DO NOT break; Expo is additive
└── party/          ← Cloudflare Workers — unchanged
```

## Shared packages

**@cambio/game** (`packages/game/`): pure TS game logic, no React DOM.

**@cambio/client** (`packages/client/`):
- `useGameConnection` — PartySocket hook (peerDep: react)
- `@cambio/client/platform` — adapter interfaces

Platform adapter contract (`packages/client/src/platform/types.ts`):

```ts
interface ClientPlatformAdapters {
  persistentStorage: StorageAdapter;
  sessionStorage: StorageAdapter;
  clipboard: ClipboardAdapter;
}
```

Expo must implement:
- **AsyncStorage** (or expo-secure-store for player IDs) for storage adapters
- **expo-clipboard** for clipboard adapter
- Call `setDefaultPlatformAdapters()` before mounting connection hooks

See `docs/mobile/platform-adapters.md`.

## Party host config

`packages/client/src/party.ts` — `getPartyHost()` reads env. Expo needs:
- `EXPO_PUBLIC_PARTY_HOST` or similar (document in README)
- Default production: `cambio.brierton.workers.dev`

## Web reference screens (port targets)

| Expo route | Web reference |
| --- | --- |
| Home | `src/app/page.tsx` |
| Play/Lobby | `src/app/play/[roomId]/page.tsx` |
| Game | `src/components/game/GameTable.tsx` (CAM-44 — out of scope this run) |

CAM-42: create/join/solo + lobby waiting UI only. Use `useGameConnection` from `@cambio/client`.

## Constraints

| Do | Don't |
| --- | --- |
| Add `apps/expo` as new workspace package | Modify Next.js routes for Expo |
| Extend `@cambio/client/platform` with Expo adapters | Duplicate game logic from `packages/game` |
| Keep Capacitor `apps/native` working | Offline P2P / LAN / useP2PConnection |
| Use Expo Router file-based routing | Port GameTable yet (CAM-44 deferred) |

## Test commands

```bash
pnpm --filter @cambio/game typecheck
pnpm --filter @cambio/client typecheck
pnpm --filter @cambio/expo typecheck   # after scaffold exists
pnpm test
```

## Dev workflow (document in apps/expo/README.md)

- Expo Go vs dev client
- iOS simulator: `npx expo run:ios`
- Android emulator: `npx expo run:android`
- PartyServer: `pnpm party:dev` on port 8787
