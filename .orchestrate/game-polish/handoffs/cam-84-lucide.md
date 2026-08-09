<!-- orchestrate handoff
task: cam-84-lucide
branch: orch/game-polish/cam-84-lucide
agentId: bc-4d98213f-f565-462d-bcba-3b736627eb8f
runId: run-c8c0d11d-e5b1-4045-888e-b6c7a9d0dd7f
resultStatus: finished
finishedAt: 2026-08-09T11:04:08.314Z
-->

## Status
success

## Branch
`orch/game-polish/cam-84-lucide`

## What I did
- Fast-forward merged `orch/game-polish/cam-82-zustand` as the CAM-84 base (zustand UI prefs store + GameTable hook imports)
- Added `lucide-react` to `package.json` / `pnpm-lock.yaml`
- **`GameTable.tsx`:** Replaced chrome with tree-shakeable lucide icons:
  - Close sheet `×` → `X`
  - Overflow `···` → `MoreHorizontal`
  - Copy room text → `Copy` / `Check`
  - Leave hardcoded `EXIT` → `LogOut` (aria-label/title use `voice.leaveGame`)
  - Sidebar toggles → icon-only buttons (`Volume2`/`VolumeX`, `Lightbulb`/`LightbulbOff`, `LayoutGrid`/`GalleryHorizontal`, `CircleUser`/`ListOrdered`, `MessageSquare`/`MessageSquareOff`, `Bell`/`BellOff`) with voice strings on `aria-label`/`title`
- **`ThemePicker.tsx`:** Replaced inline Sun/Moon/System SVGs with lucide `Sun`/`Moon`/`Monitor`
- Left suit unicode, peek/swap/penalty flash glyphs, LobbyPlayers placeholders, and voice-embedded symbols unchanged
- Marked CAM-84 **In Progress → In Review** in Linear
- Opened draft PR: https://github.com/evanbrierton/cambio/pull/169

## Measurements
- `lucide-react` in package.json: absent → present (1.30.0)
- GameTable lucide named imports: 0 → 17
- ThemePicker custom SVG LOC: ~55 → 0
- `pnpm test`: 39 passing → 39 passing
- `pnpm lint`: pass → pass
- `pnpm typecheck`: pass → pass

## Verification
type-check-only

## Notes, concerns, deviations, findings, thoughts, feedback
- Branch includes full CAM-82 commit history until that PR merges; CAM-84 is one commit on top (`fce92e3`)
- Icons use `currentColor` via lucide defaults; existing theme/chip button classes apply
- Toggle buttons are icon-only but retain full voice accessibility via `aria-label`/`title`
- ThemePicker appearance icons were in allowed paths and aligned with the lucide adoption goal; not explicitly listed in CAM-84 table but reduces duplicate inline SVG
- PR created with `skip_branch_prefix_check` per orchestrator branch naming (`orch/game-polish/cam-84-lucide`)

## Suggested follow-ups
- Verifier: manual spot-check GameTable settings sheet on mobile — icons render and pick up theme colors
- CAM-85 (zod WS + bot-settings) can proceed on CAM-82 base
- Planner: integrate CAM-82 before or with CAM-84 depending on merge order