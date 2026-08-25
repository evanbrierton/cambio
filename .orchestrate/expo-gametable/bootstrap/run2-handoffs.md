# Expo run 2 — handoff summary (read before run 3)

Source branches and PRs from orchestration run 2 (`expo-mobile`).

## Open PRs (stack order)

| Order | PR | Branch | Linear |
| --- | --- | --- | --- |
| 1 | [#240](https://github.com/evanbrierton/cambio/pull/240) | `orch/expo-mobile/expo-scaffold` | CAM-41 Done |
| 2 | [#241](https://github.com/evanbrierton/cambio/pull/241) | `orch/expo-mobile/expo-home-lobby` | CAM-42 Done |
| 3 | [#242](https://github.com/evanbrierton/cambio/pull/242) | `orch/expo-mobile/expo-themes` | CAM-43 Done |

All three PRs target `main` independently. Workers internally fast-forwarded from scaffold; **stack them** before CAM-44.

## Verifier gaps to fix

1. **Root typecheck** — `pnpm typecheck` fails because root `tsconfig.json` includes `apps/expo/**` without `@/*` path aliases. Exclude `apps/expo` or add project references.
2. **`@cambio/client typecheck`** — pre-existing `@cambio/game/wire-schema` resolution failure in `useGameConnection.ts`.
3. **Expo web lobby** — WebSocket reconnection storm on `/play/[roomId]` (Expo web only); Node PartySocket smoke passes; Next.js lobby works.
4. **Metro / NativeWind** — missing `react-native-worklets/plugin`; pnpm metro hoisting issues blocked native UI verification for CAM-43.

## CAM-44 scope (this run — MVP only)

Full XL scope is too large for one worker. **Run 3 MVP:**

- Stack merged Expo base on branch `orch/expo-gametable/stack-expo-prs`
- Fix CI gaps above on stacked branch
- Port minimal `GameTable` shell to Expo: render table from `useGameConnection` state, show player hands/cards (read-only ok for v1), wire post-lobby route to GameTable instead of placeholder
- Core actions for v1: draw from deck, discard drawn card, basic turn indicator
- Defer: snap overlay polish, ability cards, chat panel, sound, Reanimated juice, game-over screen polish

Web references: `src/components/game/GameTable.tsx`, `src/components/cards/PixelCard.tsx`.

## Do not touch

- Offline P2P (CAM-23/24/25 deferred)
- Next.js web game UI (except shared token/type fixes)
- `apps/native` Capacitor shell
- `party/` server logic
