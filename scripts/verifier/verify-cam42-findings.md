# CAM-42 Verifier Findings

## Acceptance criteria

| Criterion | Result | Evidence |
|-----------|--------|----------|
| Create room navigates to lobby | Partial | Expo web navigates to `/play/[roomId]`; PartySocket smoke confirms lobby state with 1 player; lobby UI blank on Expo web |
| Join by code works | Met (protocol) | PartySocket join test: 2 players in lobby |
| Solo vs bots starts game lobby | Met (protocol) | PartySocket solo test: 3 players, isSoloMode true |
| Lobby shows connected players | Partial | PartySocket receives player list in state messages; Expo web UI does not render lobby |
| Web app unchanged | Met | Zero diff in `src/` vs main; Next.js homepage and lobby work |

## High: Expo web lobby WebSocket reconnection loop

Expo web (`pnpm --filter @cambio/expo web`) shows home screen correctly but lobby route stays blank. Browser opens thousands of WebSocket connections to `ws://localhost:8787/parties/main/{roomId}`; wrangler logs repeated "Network connection lost". Same party server works for Next.js web lobby and Node PartySocket smoke script.

Likely client-side remount/reconnect in `apps/expo/app/play/[roomId].tsx` + `useGameConnection` on web platform. Native Expo Go not tested in this environment.

## Med: Fresh clone requires pnpm install for Expo typecheck

Before `pnpm install`, `pnpm --filter @cambio/expo typecheck` failed with missing expo module types. After install, passes.

## Low: Expo web package version warnings

Expo CLI warns react 19 / async-storage versions differ from Expo 52 expected versions; home still bundles.
