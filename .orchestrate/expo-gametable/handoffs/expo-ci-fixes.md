<!-- orchestrate handoff
task: expo-ci-fixes
branch: orch/expo-gametable/expo-ci-fixes
agentId: bc-136d4e00-9460-4ad1-8b6a-7eae9ef6b4e0
runId: run-ea42e3ec-c786-42fd-b768-62fc039c1d99
resultStatus: finished
finishedAt: 2026-08-25T17:48:45.497Z
-->

## Status
success

## Branch
`orch/expo-gametable/expo-ci-fixes`

## What I did
- **`tsconfig.json`** — Excluded `apps/expo` from root typecheck (Expo has its own tsconfig).
- **`packages/client/tsconfig.json`** — Added `@cambio/game` / `@cambio/game/*` path mappings so `@cambio/game/wire-schema` resolves for client typecheck.
- **`apps/expo/package.json`** — Pinned `nativewind@4.1.23` and `react-native-css-interop@0.1.22` for Reanimated v3 / Expo 52 compatibility (avoids `react-native-worklets/plugin` from NativeWind 4.2+).
- **`apps/expo/app/play/[roomId].tsx`** — Fixed WS reconnect storm: lock `sessionMode`/`soloOptions` at mount via ref; keep host/join in URL cleanup (matching web app); skip redundant `router.replace` when params unchanged.
- **`pnpm-lock.yaml`** — Updated for pinned NativeWind versions.
- Opened draft PR #244 against `main` (stacked on `orch/expo-gametable/stack-expo-prs` / PR #243).

## Measurements
- `pnpm typecheck`: fail → pass
- `pnpm --filter @cambio/client typecheck`: fail → pass
- `pnpm --filter @cambio/expo typecheck`: pass → pass
- Expo Metro web bundle: fail (worklets plugin) → pass (863 modules)
- Expo web lobby WS reconnect storm: present → absent (stable Connected for 9+ seconds)

## Verification
live-ui-verified

Manual test: `pnpm party:dev` + `pnpm --filter @cambio/expo web -- --port 8081`. Created game as "TestPlayer", lobby showed room code + player list with stable Connected status (no reconnect storm). Theme change to "Cocoa Night" persisted after reload.

Artifact: `/opt/cursor/artifacts/expo-lobby-stable.webp`

## Notes, concerns, deviations, findings, thoughts, feedback
- Chose **pinning NativeWind 4.1.23** over adding `react-native-worklets` — verifier logs show worklets 0.12.x/0.4.x cause Metro TerminalReporter and HMRClient failures on RN 0.76 / Expo 52. NativeWind 4.2+ requires Reanimated 4 worklets plugin.
- No `.npmrc` / `publicHoistPattern` needed after NativeWind pin; Metro bundle succeeded without extra hoisting config.
- WS reconnect root cause: `sessionMode`/`soloOptions` derived from URL params could flip when `router.replace` ran, retriggering `useGameConnection` effect. Ref-lock at mount + idempotent URL cleanup mirrors web `page.tsx` pattern.
- Branch uses `orch/` prefix per orchestrator spec; PR created with `skip_branch_prefix_check` (tool default expects `evanbrierton/`).
- PR #244 base is `main` but code depends on stack branch (#243); planner should merge stack first or retarget.

## Suggested follow-ups
- CAM-44 GameTable MVP on this stacked base: port minimal table shell, wire post-lobby route, core draw/discard actions.
- Consider aligning Expo React/RN versions with Expo 52 expected versions (React 18.3.1) in a separate pass — current React 19 works but emits compatibility warnings.
- Native (iOS/Android) EAS build verification with pinned NativeWind 4.1.23.