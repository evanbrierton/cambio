<!-- orchestrate handoff
task: verify-cam-49-system-dark-mode
branch: `orch/linear-board/cam-49-system-dark-mode` (no commits made; verification-only, source untouched)
agentId: bc-a88e4cf1-8ccb-4aef-bf6a-76c3e78aa734
runId: run-8d4c64fe-f0cb-4b40-aa75-76010fc4b659
resultStatus: finished
finishedAt: 2026-08-07T18:15:09.368Z
-->

All checks complete. Here is my verifier handoff.

## Verification
live-ui-verified

## Target
`cam-49-system-dark-mode` on branch `orch/linear-board/cam-49-system-dark-mode`

## Branch
`orch/linear-board/cam-49-system-dark-mode` (no commits made; verification-only, source untouched)

## Execution
- `pnpm install` → up to date, clean.
- `pnpm lint` (`biome check`) → PASS, "Checked 69 files. No fixes applied."
- `pnpm typecheck` (`tsc --noEmit`) → PASS, no errors.
- `pnpm build` (`next build`) → PASS, compiled + 11/11 pages generated.
- `grep next-themes` across `package.json`, `pnpm-lock.yaml`, `src` → no matches. Not in dependencies.
- SSR cookie test via curl on `pnpm dev`: `cambio-appearance=dark` → `<html data-appearance="dark" ... color-scheme:dark>`; `=light` → `light`; `=system`/`bogus`/none → `light` (pre-JS fallback), with a blocking inline `<script id="cambio-appearance-init">` present in `<head>` that re-resolves `system` via `matchMedia` before paint.
- Static: `src/app/globals.css` has 8 `[data-theme][data-appearance="light"]` + 8 `[data-theme][data-appearance="dark"]` blocks (all 8 themes: retro, casino, party, minimal, calm, ink, library, lodge). `src/lib/themes.ts` has `appearanceLabel/Light/Dark/System` on all 8 theme voices. `ThemePicker.tsx` embeds the Light/Dark/System toggle; used in `page.tsx` (home), `WaitingScreen`, `GameTable` (in-game), `GameOverScreen`.
- Live browser (Chrome + DevTools, real dev server): toggle on home switches palette; `data-appearance` attribute + `cambio-appearance` cookie update to `dark`/`light` accordingly.
- Live: System selected + DevTools "Emulate prefers-color-scheme" dark→light→dark → page follows OS live with no reload.
- Live: explicit Light clicked while OS emulated dark → page stays light (`data-appearance="light"`, cookie `light`) — override wins.
- Live: hard reload (Ctrl+Shift+R) with Light+dark-OS → reloads light, no dark flash (video-reviewed frame-by-frame: only a brief blank white before light render, never dark).
- Live: cycled all 8 themes in both dark and light — all 16 combinations legible/correct, no contrast breakage or palette leak.
- Live: created a room → waiting room shows the appearance toggle; started game → in-game side panel shows the appearance toggle.

## Findings
Per acceptance criterion:
- [x] Preference persists across reloads via `cambio-appearance` cookie: cookie set on toggle; survives hard reload staying `light` (met).
- [x] Default System tracks OS light/dark live; explicit Light/Dark overrides: DevTools emulation flips palette live under System; explicit Light held light against dark OS (met).
- [x] No flash of wrong appearance on first paint (SSR cookie + blocking inline resolve): SSR emits `data-appearance`; head inline script re-resolves `system`; video shows no dark flash on reload (met).
- [x] All 8 themes have correct light and dark palettes under `[data-theme][data-appearance]`: 8+8 CSS blocks; all 16 live states verified legible (met).
- [x] Light/Dark/System toggle appears next to ThemePicker everywhere shown: toggle lives inside `ThemePicker`; verified live on home, waiting, in-game; game-over uses same `<ThemePicker compact />` (met — game-over confirmed by shared component, not reached in gameplay).
- [x] Theme voice strings include appearance labels; next-themes NOT added: 8 voices carry appearance labels; `next-themes` absent everywhere (met).
- [x] `pnpm lint`, `pnpm typecheck`, `pnpm build` pass: all three PASS (met).

Other findings (severity-ordered):
- (low) Game-over screen not exercised via full gameplay; toggle presence there is inferred from the shared `ThemePicker` component (same component verified live on 3 other surfaces). Very low risk.
- (low) Server-side `system` resolves to `light` before JS runs; correct-by-design since the OS preference is unknowable server-side, and the head inline script fixes it pre-paint (confirmed no flash).

## Notes & suggestions
- Verification artifacts (auto-uploaded): demo video  and screenshots , , , , , .
- Implementation matches the existing `cambio-theme` cookie+provider pattern; structural tokens stayed on `[data-theme]`, colors under `[data-theme][data-appearance]`.
- No source files modified; dev server left running. Suggest the worker's proposed follow-up e2e tests for `data-appearance` transitions if desired, but not blocking.