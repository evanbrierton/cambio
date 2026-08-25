<!-- orchestrate handoff
task: stack-expo-prs
branch: orch/expo-gametable/stack-expo-prs
agentId: bc-3a4e9b54-1997-4575-98f7-ed9c52c6c8b9
runId: run-96c3410a-9c0d-4736-a047-7da8dc7292e5
resultStatus: finished
finishedAt: 2026-08-25T17:39:49.144Z
-->

## Status
success

## Branch
`orch/expo-gametable/stack-expo-prs`

## What I did
- Created stack branch from `evanbrierton/expo-gametable-7bff` and merged in order: `orch/expo-mobile/expo-scaffold` (#240) → `orch/expo-mobile/expo-home-lobby` (#241, `-X theirs`) → `orch/expo-mobile/expo-themes` (#242, `-X theirs`); all three merged cleanly without manual conflict resolution.
- Fixed post-merge regression in `apps/expo/app/index.tsx`: themes branch had replaced CAM-42 home/lobby UI (create/join/solo) with a theme-only demo; restored full lobby flow wrapped in `ThemedScreen` with `NativeThemePicker` retained.
- Pushed branch; opened draft PR #243 (base `main`); posted merge-order comment on PR #242 documenting stack supersedes independent landing.

## Measurements
- stacked PR branches merged: 0 → 3
- conflict markers in tree: 0 == 0
- `pnpm --filter @cambio/expo typecheck`: fail (pre-stack) → pass

## Verification
type-check-only

## Notes, concerns, deviations, findings, thoughts, feedback
- **Parallel fork structure:** #241 and #242 both forked from scaffold (`c99a65f`), not sequentially. Stack merges them in dependency order; `-X theirs` on themes took themes' `index.tsx`, which dropped lobby UI — fixed manually in one commit on the stack branch.
- **PR #242 base unchanged:** Retargeting #242 to the stack base would show empty diff (themes already merged). Documented merge order via comment on #242 and in PR #243 body instead.
- **Verifier gaps not in scope:** Root typecheck, Metro worklets plugin, Expo web lobby reconnect storm remain for follow-up workers per `run2-handoffs.md`.
- **Lobby/play routes preserved:** `apps/expo/app/play/[roomId].tsx`, `LobbyView.tsx`, NativeWind config (`tailwind.config.js`, `global.css`, metro/babel), and platform adapters (`packages/client/src/platform/expo*.ts`) all present on stack.

## Suggested follow-ups
- Fix root `tsconfig.json` to exclude `apps/expo/**` or add project references (verifier gap #1).
- Add `react-native-worklets/plugin` and resolve pnpm Metro hoisting for native NativeWind verification (gap #4).
- Fix Expo web lobby WebSocket reconnect storm on `/play/[roomId]` (gap #3).
- CAM-44 GameTable MVP on this stacked base: port minimal table shell, wire post-lobby route, core draw/discard actions.