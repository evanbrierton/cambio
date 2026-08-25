# Expo GameTable — architecture reference (run 3)

## Prerequisites

Run 2 shipped `apps/expo/` with Expo Router, `@cambio/client` adapters, home/lobby, NativeWind themes. Code lives on open PR branches — **stack before building CAM-44**.

## Target layout after stack

```
apps/expo/
├── app/
│   ├── _layout.tsx      # providers, platform init
│   ├── index.tsx        # home (CAM-42)
│   └── play/
│       └── [roomId].tsx # lobby → GameTable when phase !== lobby
├── src/
│   ├── components/game/ # NEW: Expo GameTable, PixelCard RN port
│   └── theme/           # ExpoThemeProvider (CAM-43)
packages/client/         # useGameConnection — shared with web
packages/game/           # engine types — no React DOM
```

## GameTable port strategy

1. Read web `GameTable.tsx` for state selectors and action dispatch patterns (`useGameConnection` methods).
2. Create RN components under `apps/expo/src/components/game/` — do **not** import from `src/components/game/` (DOM/Framer).
3. Port `PixelCard` to RN `View`/`Text` with theme tokens from `src/lib/theme-tokens.ts`.
4. Replace post-lobby placeholder in `play/[roomId].tsx` with `<ExpoGameTable />`.
5. Use NativeWind for styling; Reanimated optional for v1 (static layout ok).

## Party / connection

- Env: `EXPO_PUBLIC_PARTY_HOST` (default prod worker)
- `pnpm party:dev` on 8787 for local smoke
- Reuse existing verifier pattern: `scripts/verifier/verify-cam42-lobby.mjs`

## Test commands

```bash
pnpm install
pnpm --filter @cambio/expo typecheck
pnpm --filter @cambio/client typecheck   # should pass after wire-schema fix
pnpm typecheck                          # should pass after tsconfig fix
pnpm test
```

## PR strategy

- `stack-expo-prs` → single stacked branch, update PR #242 base or open new stacked PR
- `expo-ci-fixes` → same stacked branch
- `expo-gametable-mvp` → branch from stacked+fixes, open PR against `main` (or stacked PR)
