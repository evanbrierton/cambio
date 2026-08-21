<!-- orchestrate handoff
task: capacitor-plugins
branch: orch/project-priority/capacitor-plugins
agentId: bc-da1b2447-4ba7-47c6-bf71-ebd20797f175
runId: run-a74db3fe-f654-47dd-9523-349a4d9fdb95
resultStatus: finished
finishedAt: 2026-08-21T16:57:59.759Z
-->

## Status
success

## Branch
`orch/project-priority/capacitor-plugins`

## What I did
- Added guarded Capacitor runtime/plugin helpers in `packages/client/src/platform/capacitor.ts`:
  - native-platform detection via `Capacitor.isNativePlatform()`
  - guarded Share (`shareRoomInvite`), Clipboard (`copyWithNativeClipboard`), and Haptics (`triggerSnapHaptic`, `triggerCambioHaptic`) calls
  - all plugin calls no-op/fail-safe when not native or plugin is absent
- Added a native clipboard adapter in `packages/client/src/platform/capacitor-clipboard.ts` implementing the existing `ClipboardAdapter` contract, with web fallback.
- Updated `packages/client/src/platform/index.ts` so default adapters use the new native clipboard adapter wrapper while preserving existing web behavior via fallback.
- Added targeted unit tests in `packages/client/src/platform/capacitor-clipboard.test.ts` covering:
  - non-native fallback path
  - native clipboard success path
  - native clipboard failure fallback path
- Wired lobby invite sharing UI in:
  - `src/components/game/GameTable.tsx` (room-header share button shown only in lobby on native+plugin availability)
  - `src/components/game/WaitingScreen.tsx` (same native-only share affordance)
- Added guarded haptics triggers for snap and cambio events in `src/components/game/GameTable.tsx`.
- Added native plugin dependencies to `apps/native/package.json`:
  - `@capacitor/share`
  - `@capacitor/clipboard`
  - `@capacitor/haptics`
- Pushed branch and opened a draft stacked PR with base `orch/project-priority/capacitor-shell`:
  - https://github.com/evanbrierton/cambio/pull/216

## Measurements
- `pnpm lint exit code: 0 == 0`
- `pnpm typecheck exit code: 0 == 0`
- `pnpm test passing tests: 207 → 210`
- `pnpm --filter @cambio/native cap:sync exit code: 0 == 0`
- `git diff --shortstat (origin/orch/project-priority/capacitor-shell...HEAD) files changed: 0 → 7`

## Verification
unit-test-verified

## Notes, concerns, deviations, findings, thoughts, feedback
- All Capacitor plugin calls are guarded by native-platform/plugin-presence checks; pure web paths remain unchanged (verified manually in-browser and via fallback logic tests).
- Manual web regression artifact (copy feedback works, no native share button shown on web):  
  `/opt/cursor/artifacts/cam39_lobby_copy_and_share_guard_short.mp4`
- I followed the scoped override and set PR base to `orch/project-priority/capacitor-shell` (stacked PR), not `main`.
- `pnpm-lock.yaml` changed locally due dependency install but was intentionally left out of commit to keep within the allowed-path scope you specified.

## Suggested follow-ups
- Run native device/simulator verification on iOS and Android to confirm:
  - share sheet presentation from lobby
  - clipboard write behavior in native shell
  - haptic feedback feel/intensity for snap and cambio events
- Decide whether to publish lockfile updates in a separate allowed-scope follow-up so CI lockfile state matches new `apps/native` dependencies.