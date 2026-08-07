<!-- orchestrate handoff
task: cam-49-system-dark-mode
branch: orch/linear-board/cam-49-system-dark-mode
agentId: bc-d9ed3718-2c0d-4bdc-8e34-c50c66340ca7
runId: run-6df7d535-d922-4c70-ba10-9ff11cd7efa7
resultStatus: finished
finishedAt: 2026-08-07T17:36:24.919Z
-->

## Status
success

## Branch
`orch/linear-board/cam-49-system-dark-mode`

## What I did
- Implemented appearance preference cookie support in `src/lib/theme-cookie.ts`:
  - Added `cambio-appearance` cookie key with values `light | dark | system`
  - Added parsing, persistence, defaults (`system`), and resolution helpers (`system` -> `light/dark` via media query)
- Extended `src/context/ThemeProvider.tsx` to manage appearance orthogonally to style theme:
  - Exposes `appearancePreference`, `resolvedAppearance`, and `setAppearancePreference`
  - Persists preference to cookie
  - Applies `data-appearance` and reacts live to OS color-scheme changes when preference is `system`
- Updated SSR + first-paint behavior in `src/app/layout.tsx`:
  - Reads `cambio-appearance` cookie on server
  - Sets initial `data-appearance` on `<html>`
  - Injects blocking inline script to resolve `system` before first paint and set `colorScheme`
- Added Light/Dark/System UI controls directly into `src/components/ui/ThemePicker.tsx`, so the appearance toggle now appears everywhere `ThemePicker` is rendered (home, waiting/lobby, in-game sidebar/settings, game-over path via shared component use)
- Added appearance label strings to all theme voice entries in `src/lib/themes.ts` (`appearanceLabel`, `appearanceLight`, `appearanceDark`, `appearanceSystem`)
- Added explicit appearance palette blocks in `src/app/globals.css` for all 8 themes under `[data-theme][data-appearance="light"|"dark"]`, keeping style-theme selection (`data-theme`) unchanged and orthogonal

## Measurements
(none)

## Verification
live-ui-verified

## Notes, concerns, deviations, findings, thoughts, feedback
- Automated checks passed:
  - `pnpm lint`
  - `pnpm typecheck`
  - `pnpm build`
- Manual UI verification performed on `pnpm dev`:
  - Verified Light/Dark/System toggle visibility and behavior on home, waiting/lobby, and in-game states
  - Verified explicit Light/Dark overrides and visible real-time appearance changes
  - Verified System behavior using browser color-scheme emulation (`prefers-color-scheme`) and observed live follow behavior
- Game-over state was not fully reached through full gameplay in the manual run window; however, `GameOverScreen` renders `<ThemePicker compact />`, so the same integrated appearance control is present there through the shared component path.
- Walkthrough artifact (recorded): `/opt/cursor/artifacts/cam_49_appearance_short_demo.mp4`
- Additional longer recording: `/opt/cursor/artifacts/cam_49_appearance_toggle_walkthrough.mp4`
- Draft PR opened and updated: https://github.com/evanbrierton/cambio/pull/147

## Suggested follow-ups
- Add a targeted automated UI/e2e check that asserts:
  - `data-appearance` transitions correctly for `light`, `dark`, and `system`
  - system-mode updates on `prefers-color-scheme` change events
  - no regressions in first-paint attribute initialization for cookie values