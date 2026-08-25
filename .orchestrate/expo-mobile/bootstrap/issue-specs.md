# Linear issue specs — Expo mobile (run 2)

Source: [Project priority order](https://linear.app/ebrierton-cambio/document/project-priority-order-67a9122bb396)

**Deferred:** Offline P2P CAM-23/24/25. **Merged:** CAM-40 store prep (#234).

## CAM-41 — Expo mobile app scaffold (In Progress)

Create Expo app with Expo Router in `apps/expo` (package name `@cambio/expo`):

- Wire `@cambio/game` and `@cambio/client` workspace deps
- AsyncStorage-backed platform adapters in `packages/client/src/platform/expo-*.ts`
- Home placeholder screen showing app loads
- Confirm PartySocket can connect (smoke test / dev screen)
- README with simulator/emulator workflow

**Acceptance:**
- App boots on iOS simulator and Android emulator (or document if VM cannot run simulators)
- WebSocket session to PartyServer from RN demonstrated
- Shared packages typecheck for RN consumer

## CAM-42 — Port Home and Lobby screens

Depends on CAM-41 scaffold.

- Home: name input, create room, join code, solo vs bots
- Play route: lobby waiting, host start, copy room code
- Navigation parity with web `/` and `/play/[roomId]`
- Player name via storage adapter
- Web Next.js unchanged

**Acceptance:**
- Create/join/solo works against PartyServer on device/simulator
- Lobby shows players and host controls

## CAM-43 — Port theme system to NativeWind

Depends on CAM-41; parallel with CAM-42.

- Extract design tokens from `src/app/globals.css`
- NativeWind in Expo app
- Theme picker parity (basic)
- Theme pref persists via storage adapter

**Acceptance:**
- Core themes render on native
- Web themes unchanged

## Out of scope this run

- CAM-44 GameTable port (XL)
- CAM-40 operator uploads (Apple/Google credentials)
- Offline P2P
