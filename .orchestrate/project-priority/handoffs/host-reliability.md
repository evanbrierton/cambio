<!-- orchestrate handoff
task: host-reliability
branch: orch/project-priority/host-reliability
agentId: bc-fdfd0ed6-1a9d-4ae9-a17e-16fa57fb6069
runId: run-e4a4f0e5-c5e0-4d72-af16-39f5732fd716
resultStatus: finished
finishedAt: 2026-08-24T18:29:58.130Z
-->

## Status
success

## Branch
`orch/project-priority/host-reliability`

## What I did
- Added `src/hooks/useHostReliability.ts` with `requestScreenWakeLock`, `mountHostReliability`, and `useHostReliability` — screen Wake Lock during active local host sessions, release on game end/unmount, re-acquire on `visibilitychange` when tab becomes visible.
- Extended `src/game/host.ts` with `pauseForHostVisibility` / `resumeFromHostVisibility`: clears snap timers on hide, broadcasts `hostPaused`, extends `snapWindowEndsAt` by hidden duration on resume, blocks `dispatchMessage` while paused.
- Wired `useHostReliability` into `src/hooks/useP2PConnection.ts` for `role=host` only (online `useGameConnection` untouched).
- Updated `src/components/game/GameTable.tsx` via URL params (`mode=local`, `host=1`): mobile host warning banner, guest pause banner, host-disconnect retry toast.
- Added unit tests in `src/hooks/useHostReliability.test.ts` and `src/game/host.test.ts`.
- Marked CAM-25 Done in Linear. Opened draft PR #236.

## Measurements
- `pnpm test src/game/host.test.ts`: 19 passing → 22 passing
- `pnpm test src/hooks/useHostReliability.test.ts`: 0 passing → 5 passing
- `pnpm test src/hooks/useP2PConnection.test.ts`: 7 passing → 7 passing
- `LOC(src/hooks/useHostReliability.ts)`: 0 → 95
- `LOC(src/game/host.ts)`: 1067 → 1121

## Verification
unit-test-verified

## Notes, concerns, deviations, findings, thoughts, feedback
- Bootstrap docs at `.orchestrate/project-priority/bootstrap/` were not in the workspace; implemented from CAM-25 Linear spec and upstream p2p-hook branch.
- Branched from `orch/project-priority/p2p-hook` (CAM-23); PR #236 targets `main` and includes p2p-hook commits until planner integrates.
- `hostPaused` is spread onto broadcast `PlayerView` without modifying `@cambio/game` types (not in allowed modify paths). GameTable reads it as an optional field.
- Wake Lock and visibility pause only mount via `useP2PConnection` when `role=host`; online Cloudflare path uses `useGameConnection` and is unaffected.
- Manual browser verification (tab switch pause/resume, Wake Lock on device) was not run in this VM — unit tests cover timer extension and wake-lock lifecycle.

## Suggested follow-ups
- CAM-24: Play nearby homepage CTA, lobby host IP/port display, copy-to-clipboard (if not already merged).
- CAM-40: Capacitor store testing prep.
- Native LAN WebSocket server plugin for real `ws://{lan-ip}:9876` guest connections off localhost.
- Host migration (#74–#76) for recovery when host tab is killed entirely.