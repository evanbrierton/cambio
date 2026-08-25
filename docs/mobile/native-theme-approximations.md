# Native theme approximations (CAM-43)

Expo uses shared semantic tokens from `src/lib/theme-tokens.ts` (extracted from `src/app/globals.css`). Web keeps the full CSS theme system; native renders the same palette with simplified effects.

## Shared across web and native

- Theme ids, labels, and swatches (`src/lib/themes.ts`)
- Color tokens per theme × appearance (`src/lib/theme-tokens.ts`)
- Preference keys: `cambio-theme`, `cambio-appearance` (web cookies / native AsyncStorage via `@cambio/client/platform`)

## Web-only (approximated or omitted on native)

| Web effect | Native handling |
| --- | --- |
| `--bg-image` gradients, tiled patterns, party hue-shift animation | Flat `background` token only |
| Scanlines, vignette, confetti/dot overlays (`body::before/after`, `html::before`) | Not rendered |
| `--panel-shadow`, `--title-shadow`, glow box-shadows | Flat borders; no multi-layer shadows |
| `--btn-primary-bg` CSS gradients | Solid midpoint hex from gradient (see `theme-tokens.ts` extraction) |
| `color-mix()` hint/flash backgrounds | Solid semantic colors where needed later |
| Custom display fonts (`--font-display`, Press Start 2P, etc.) | System sans; typography voice strings unchanged |
| Swap/take/snap/peek flash keyframe animations | Deferred to game UI port |
| `filter: brightness()` button hovers | Standard press opacity |
| Party Pop button translateY press depth | Standard press opacity |

## NativeWind mapping

- CSS variables set at runtime via `themeTokensToNativeWindVars()` + NativeWind `vars()`
- Tailwind semantic colors in `apps/expo/tailwind.config.js` mirror web utility names (`bg-surface`, `text-accent`, etc.)

## Persistence

- Web: cookies via `ThemeProvider` + `theme-cookie.ts`
- Expo: `readThemePref` / `writeThemePref` on the hydrated AsyncStorage adapter (`ExpoThemeProvider`)
