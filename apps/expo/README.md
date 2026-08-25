# @cambio/expo

Expo (React Native) shell for Cambio. Consumes shared workspace packages `@cambio/game` and `@cambio/client`.

## Prerequisites

- Node.js 20+
- pnpm (monorepo root)
- For native builds: Xcode (iOS) and/or Android Studio (emulator)
- PartyServer for connectivity smoke test: `pnpm party:dev` (port 8787)

## Environment

Create `.env` in this directory (or export before `expo start`):

```bash
EXPO_PUBLIC_PARTY_HOST=localhost:8787
```

Production default (when unset): `cambio.brierton.workers.dev` via `@cambio/client/party`.

On a physical device, use your machine's LAN IP instead of `localhost`, e.g. `192.168.1.42:8787`.

## Install

From the repo root:

```bash
pnpm install
```

## Platform adapters

Before any `useGameConnection` usage, the app calls `initExpoPlatform()` in `app/_layout.tsx`, which hydrates AsyncStorage and registers adapters via `setDefaultPlatformAdapters()`. See `docs/mobile/platform-adapters.md`.

## Run

From repo root:

```bash
pnpm party:dev
pnpm --filter @cambio/expo start
```

From this directory:

```bash
pnpm start
```

### Expo Go (quick iteration)

1. Install [Expo Go](https://expo.dev/go) on a simulator or device.
2. Run `pnpm start` and press `i` (iOS simulator) or `a` (Android emulator), or scan the QR code.

Expo Go uses the managed runtime; native modules must stay within Expo Go's supported set (AsyncStorage and expo-clipboard are supported).

### Dev client (custom native code)

When you add config plugins or native modules outside Expo Go:

```bash
pnpm ios      # npx expo run:ios
pnpm android  # npx expo run:android
```

This builds and installs a development client on the simulator/emulator, then starts Metro.

### Web (smoke / CI)

```bash
pnpm web
```

Useful when simulators are unavailable; PartySocket connectivity works against `localhost:8787`.

## Verify

- Home screen: enter nickname, create game, join by code, or start solo vs bots.
- Lobby (`/play/[roomId]`): shows room code, connection status, and connected players via `useGameConnection`.
- Player name persists across launches (AsyncStorage via platform adapters).
- PartyServer must be running for lobby connectivity: `pnpm party:dev` with `EXPO_PUBLIC_PARTY_HOST=localhost:8787`.

## Typecheck

```bash
pnpm --filter @cambio/expo typecheck
```

## Project layout

```
apps/expo/
├── app/              Expo Router routes
├── src/              Platform init + smoke test
├── app.config.ts
├── metro.config.js   Monorepo workspace resolution
└── package.json
```
