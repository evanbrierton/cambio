# CAM-81/83 Verifier Log

Date: 2026-08-09
Branch: `orch/game-polish/cam-81-83-themes`
Verifier: cloud agent (cam-81-83-themes verify task)

## Automated checks

```
pnpm install → OK (cookies-next 6.1.1, next-themes 0.4.6 added)
pnpm lint → OK (78 files, no issues)
pnpm typecheck → OK
pnpm test → OK (4 files, 39 tests passed)
```

## package.json deps confirmed

- `cookies-next`: ^6.1.1
- `next-themes`: ^0.4.6

## Code inspection

- `src/lib/theme-cookie.ts`: `setCookie` from cookies-next (document.cookie via cookie-functions.js); no Cookie Store API writes
- `src/context/ThemeProvider.tsx`: NextThemesProvider with `attribute="data-theme"`, `themes={[...THEME_IDS]}`, `enableSystem={false}`, `enableColorScheme={false}`, `storageKey="cambio-theme"`
- Appearance axis separate: `setAppearancePreference`, `data-appearance`, APPEARANCE_INIT_SCRIPT in layout.tsx
- `layout.tsx`: SSR cookie read preserved; THEME_INIT_SCRIPT syncs cookie → localStorage before hydration

## PR

- Draft PR #166 open against `main`, title mentions CAM-81 + CAM-83

## Live UI (Playwright against http://localhost:3000)

Run: `cd verifier && pnpm install --ignore-workspace && node cam-81-83-themes-verify.mjs`

Results (13/13 PASS):

1. FOUC init: cookie theme beats stale localStorage (library vs retro in localStorage)
2. FOUC init: appearance cookie applied before hydration (dark)
3. Style switch updates data-theme (casino)
4. Style switch writes cambio-theme cookie
5. THEME_VOICES updates (casino tagline)
6. Appearance light does not reset style theme
7. Appearance switch updates data-appearance
8. Appearance switch writes cambio-appearance cookie
9. Hard reload persists style theme
10. Hard reload persists appearance
11. All 8 style themes selectable
12. System appearance preference stored in cookie
13. System appearance resolves to light or dark

## Font classes (manual spot-check)

- retro → `press_start_2p_*` on `<html>`
- casino → `playfair_display_*` on `<html>`
- ink → `noto_serif_jp_*` on `<html>`
