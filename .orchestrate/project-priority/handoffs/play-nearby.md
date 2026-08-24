<!-- orchestrate handoff
task: play-nearby
branch: orch/project-priority/play-nearby
agentId: bc-587a1791-0312-43f7-ad52-07218c6c32d2
runId: run-cc372d1f-cc31-4393-99cb-07c290e12bb4
resultStatus: finished
finishedAt: 2026-08-24T18:38:08.612Z
-->

## Status
success

## Branch
`orch/project-priority/play-nearby`

## What I did
- Added **Play nearby** section to `src/app/page.tsx` with Host/Join tabs, local navigation (`mode=local&host=1` / `mode=local&join=1&endpoint=...`), mobile-default-join via `useMobileViewport`, and mobile host warning. Online Create/Join/Solo/Find Match buttons unchanged.
- Created `src/components/game/LocalHostPanel.tsx` showing room code, host IP:port, copy-to-clipboard, keep-awake warning, and guest error states (unreachable host, host left, lost connection).
- Integrated `LocalHostPanel` into `src/components/game/GameTable.tsx` for `mode=local` lobby sessions (reads URL params; online lobbies unaffected).
- Added `src/hooks/useMobileViewport.ts` for responsive default Host vs Join.
- Marked CAM-24 Done in Linear. Opened draft PR #237 (stacks on `orch/project-priority/p2p-hook`).

## Measurements
- `pnpm test`: 280 passing → 280 passing
- `src/app/page.tsx` LOC: 222 → 343
- `src/components/game/LocalHostPanel.tsx` LOC: 0 → 175
- `src/hooks/useMobileViewport.ts` LOC: 0 → 21

## Verification
live-ui-verified

## Notes, concerns, deviations, findings, thoughts, feedback
- Bootstrap docs at `.orchestrate/project-priority/bootstrap/` were not present; implemented from CAM-24 Linear spec and upstream CAM-23 handoff.
- Branch builds on `orch/project-priority/p2p-hook` (CAM-23). Planner should integrate p2p-hook first or merge both PRs (#235 + #237).
- Host endpoint in lobby is derived from `window.location.hostname:9876` (same as `useP2PConnection` host resolution). Guest join on real LAN IP still needs native TCP WS listener; localhost dev bridge works for host-side testing only.
- Guest join to a non-running host correctly shows connection error in `LocalHostPanel` (expected without active host).
- Did not modify `src/lib/clipboard.ts` — existing `copyToClipboard` reused.

## Suggested follow-ups
- CAM-25: Wake Lock, visibility pause, host-disconnected guest UX polish.
- Native LAN WebSocket server plugin for real `ws://{lan-ip}:9876` guest connections off localhost.
- CAM-40: Capacitor store testing prep.