<!-- orchestrate handoff
task: cam-81-83-themes
branch: orch/game-polish/cam-81-83-themes
agentId: bc-0dc8a90a-9292-4acf-a83f-c743381a1ef4
runId: run-2b2c4341-c890-4309-913a-dbad6739a962
resultStatus: finished
finishedAt: 2026-08-09T10:28:36.579Z
-->

## Status
success

## Branch
`orch/game-polish/cam-81-83-themes`

## What I did
- **CAM-81**: Added `cookies-next`; replaced Cookie Store-only `setThemeCookie` / `setAppearanceCookie` in `src/lib/theme-cookie.ts` with `setCookie` (`document.cookie` fallback). Preserved keys, path `/`, 1-year max-age, `SameSite=Lax`. SSR read in `layout.tsx` unchanged.
- **CAM-83**: Added `next-themes`; refactored `src/context/ThemeProvider.tsx` to wrap `NextThemesProvider` (`attribute="data-theme"`, `themes={THEME_IDS}`, `enableSystem={false}`, `enableColorScheme={false}`, `storageKey=cambio-theme`) while keeping appearance (light/dark/system) in a separate context with existing cookie + `data-appearance` + FOUC script. `setTheme` persists via `cookies-next` and applies `theme-fonts.ts` classes.
- Added `THEME_IDS` export in `src/lib/themes.ts`.
- Added head init script in `layout.tsx` to sync `cambio-theme` cookie → localStorage before next-themes hydrates (avoids stale-localStorage FOUC).
- Left `ThemePicker`, `useThemeVoice`, `THEME_VOICES`, and appearance FOUC script behavior intact.
- Marked CAM-81 and CAM-83 **In Progress → In Review** in Linear.
- Opened draft PR #166 against `main`.

## Measurements
- `package.json` deps (`cookies-next`, `next-themes`): 0 → 2
- Cookie Store-only write paths in `theme-cookie.ts`: 2 → 0
- Style themes driven by next-themes (`data-theme`): no → yes (8 themes)
- `pnpm test`: 39 passing → 39 passing
- `pnpm lint && pnpm typecheck`: pass → pass

## Verification
live-ui-verified

Style theme switches update `data-theme` and persist across hard refresh with no FOUC. Appearance light/dark/system toggles independently without affecting style theme.

## Notes, concerns, deviations, findings, thoughts, feedback
- next-themes still reads/writes `localStorage` under `cambio-theme`; cookie remains source of truth via `setThemeCookie` on change and the new head sync script before hydration. This avoids FOUC when localStorage is stale.
- `ThemePicker` unchanged — still calls `useTheme().setTheme`, now backed by next-themes + cookies-next.
- PR created with `skip_branch_prefix_check` because orchestrator requires branch name `orch/game-polish/cam-81-83-themes` (not `evanbrierton/…`).

## Suggested follow-ups
- **CAM-82**: zustand persist for UI prefs (unblocks CAM-84, CAM-85).
- **CAM-84**: lucide-react GameTable chrome (after CAM-82).
- **CAM-64**: configurable card point values (parallel).
- **CAM-75**: distinct swap VFX/SFX (parallel after CAM-82 if touching sounds).