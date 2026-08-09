# Game polish discovery brief

**Generated:** 2026-08-09 (bootstrap-discovery worker)  
**Project:** [Game polish](https://linear.app/ebrierton-cambio/project/game-polish-b61fef31d7b3)  
**Repo:** https://github.com/evanbrierton/cambio  
**Prod:** https://cambio.brierton.ie  
**Stack:** Next.js 16.3 App Router + PartyKit (`party/cambio.ts`) + Vitest + Biome

---

## Scope for this wave

Ship CAM-80 library adoption (CAM-82, CAM-81→CAM-83, CAM-84, CAM-85), CAM-64 configurable card point values, and CAM-75 distinct swap VFX/SFX.

**Deferred (do not start):** CAM-55 settings page, CAM-57 theme naming, CAM-17 broader juice, CAM-56 auth-synced prefs.

---

## Already Done (do not reopen)

| Issue | Title |
|-------|-------|
| CAM-74 | Rejoining game with a drawn card breaks the game |
| CAM-72 | Cambio notification overlay should block player moves |
| CAM-13 | Block all play until snap winner gives card to opponent |
| CAM-12 | Bot tuning |
| CAM-6/7 | Drawn/discard UX |
| CAM-49 | System-aware dark mode (light/dark/system appearance) |
| CAM-76/77 | Card ability swap-out + discard copy |

Priority bugs called out on the project (CAM-74/72/13/12/6/7) are Done in Linear as of discovery.

---

## Execution order

### CAM-80 children (sequenced)

| Order | Issue | Title | Priority | Blocked by |
|-------|-------|-------|----------|------------|
| 1 | **CAM-82** | zustand persist UI prefs | High | — |
| 2 | **CAM-81** | cookies-next theme cookie | Medium | — (parallel with 82 after day 1 ok) |
| 3 | **CAM-83** | next-themes for 8 style themes | High | CAM-81 |
| 4 | **CAM-84** | lucide-react chrome icons | Medium | CAM-82 (clears GameTable hook churn) |
| 5 | **CAM-85** | zod WS + bot-settings | Medium | CAM-82; preferably after CAM-64 message shape |

### Independent polish (can parallelize with CAM-80 after CAM-82 lands)

| Issue | Title | Size | Notes |
|-------|-------|------|-------|
| **CAM-64** | Configurable card point values | L | Engine/lobby/themes; no hard dep on CAM-80 |
| **CAM-75** | Distinct swap VFX/SFX | S | PixelCard/sounds; avoid GameTable settings chrome |

**Recommended merge order:** CAM-82 → (CAM-64 ∥ CAM-81) → CAM-83 → CAM-84 → CAM-85 (after CAM-64 if message types change) → CAM-75 (anytime after CAM-82 if touching sounds.ts).

---

## Path contention map

| Hot file | Issues | Rule |
|----------|--------|------|
| `src/components/game/GameTable.tsx` | CAM-82 → CAM-84 | Sequence; CAM-75 must not touch settings chrome |
| `src/lib/themes.ts` | CAM-64 (labels), CAM-83 (minimal) | CAM-83 must NOT flatten style+appearance; avoid large `THEME_VOICES` edits |
| `theme-cookie.ts` + `ThemeProvider.tsx` + `layout.tsx` | CAM-81 → CAM-83 only | |
| `src/game/types.ts` + `party/cambio.ts` + `engine.ts` | CAM-64 then CAM-85 | |
| `bot-settings.ts` + `page.tsx` | CAM-82 then CAM-85 | |
| `sounds.ts` + `PixelCard.tsx` + `globals.css` | CAM-75 (+ CAM-82 splits sound pref) | |

---

## Verified repo state (2026-08-09)

### Dependencies (`package.json`)

| Package | Declared | Imported in src/party | Worker action |
|---------|----------|----------------------|---------------|
| `zustand` ^5.0.14 | yes | **no** | CAM-82 uses it |
| `zod` ^4.4.3 | yes | **no** | CAM-85 uses it |
| `cookies-next` | **no** | — | CAM-81 adds |
| `next-themes` | **no** | — | CAM-83 adds |
| `lucide-react` | **no** | — | CAM-84 adds |

### Theme / appearance (CAM-81, CAM-83; CAM-49 done)

**Paths (all exist):**

- `src/context/ThemeProvider.tsx` — custom React context for style + appearance
- `src/lib/theme-cookie.ts` — cookie keys, parsers, client writes
- `src/lib/themes.ts` — 8 style theme ids + `THEME_VOICES`
- `src/lib/theme-fonts.ts` — per-theme font classes
- `src/app/layout.tsx` — SSR seed (`data-theme`, `data-appearance`, FOUC script)
- `src/app/globals.css` — token blocks per theme + appearance
- `src/components/ui/ThemePicker.tsx`
- `src/hooks/useThemeVoice.ts`

**Style themes (8):** `retro` | `casino` | `party` | `minimal` | `calm` | `library` | `lodge` | `ink`

**Two axes (must stay separate):**

- **Style:** `data-theme` via `cambio-theme` cookie
- **Appearance:** `data-appearance` via `cambio-appearance` cookie → light/dark/system (CAM-49)

**Known gap:** `setThemeCookie` / `setAppearanceCookie` in `theme-cookie.ts` use `cookieStore` only and silently no-op when unavailable (lines 28–29, 40–41). CAM-81 fixes with `cookies-next` + `document.cookie` fallback.

**CAM-83 constraints:**

- `enableSystem={false}` on style themes (appearance owns system)
- `attribute="data-theme"`
- Keep custom appearance path + `APPEARANCE_INIT_SCRIPT` in layout
- Replace `ThemeProvider.tsx`; coordinate cookie backend with CAM-81
- Keep `THEME_VOICES`, `theme-fonts.ts`, `ThemePicker` UI

---

## CAM-82: zustand persist UI prefs

### Current localStorage prefs

| Pref | Storage key | Lib | Hook | Consumers |
|------|-------------|-----|------|-----------|
| Hints | `cambio-hints-enabled` | `src/lib/hints.ts` | `useHintsEnabled` | `GameTable` |
| Chat notifs | `cambio-chat-notifications-enabled` | `src/lib/notifications.ts` | `useNotificationPrefs` | `GameTable` |
| Event notifs | `cambio-event-notifications-enabled` | ↑ same file | ↑ | `GameTable` |
| Player grid | `cambio-player-grid-enabled` | `src/lib/player-layout.ts` | `usePlayerGridEnabled` | `GameTable` |
| Own seat | `cambio-own-seat-display` | ↑ | `useOwnSeatDisplay` | `GameTable` |
| Sound | `cambio-sound-enabled` | accessors in `src/lib/sounds.ts` | `useSoundEnabled` | `GameTable`; `playSound` reads storage directly |
| Bots | `cambio-bot-settings` | `src/lib/bot-settings.ts` | hydrate in page | `src/app/page.tsx` |
| Nickname | `cambio-player-name` | `PLAYER_NAME_KEY` in `src/lib/party.ts` | inline in page | `src/app/page.tsx` |

**Hook pattern today:** each hook does `useState(default)` + `useEffect(() => setEnabled(isX()))` on mount — causes GameTable re-render churn CAM-84 wants gone.

**Keep out of zustand:**

- `useGameConnection` (socket + flash timers)
- Ephemeral GameTable UI (`settingsOpen`, selections, countdowns)
- Theme cookies (`cambio-theme`, `cambio-appearance`)
- Room session keys in `useGameConnection` (`localStorage`/`sessionStorage` per room)

**Implementation notes:**

- Single zustand store + `persist` middleware
- `skipHydration: true` + client rehydrate to avoid SSR mismatch
- Delete lib/hook pairs listed above after migration
- `playSound` should read from store or shared getter, not raw localStorage

---

## CAM-81: cookies-next theme cookie

Replace client write path in `src/lib/theme-cookie.ts`. Preserve:

- Keys: `cambio-theme`, `cambio-appearance`
- Path `/`, long max-age, `SameSite=Lax`
- SSR read via `next/headers` in `layout.tsx` (lines 110–115)

Wire as persistence backend for next-themes (CAM-83).

---

## CAM-84: lucide-react chrome icons

**Target file:** `src/components/game/GameTable.tsx`

| Spot | Current (verified) | Suggested Lucide |
|------|-------------------|------------------|
| Close settings sheet | `×` (line ~1282) | `X` |
| Overflow / mobile menu | `···` (line ~1357) | `MoreHorizontal` / `Settings` |
| Copy room | text chip (`voice.copy`) | `Copy` / `Check` |
| Leave game | text `EXIT` Link (line ~1370) | `LogOut` |
| Optional toggles | full voice strings | `Volume2`/`VolumeX`, `Lightbulb`, `LayoutGrid` |

**Do NOT lucide:**

- `LobbyPlayers.tsx` empty-seat `···` (line ~101)
- Suit unicode in `cards.ts` / `PixelCard`
- Flash glyphs `↔` / `◎` / `!` in `PixelCard` overlays
- Brand assets in `src/lib/brand-image.tsx`

---

## CAM-85: zod validation

**Unsafe casts (verified):**

| Location | Cast |
|----------|------|
| `src/hooks/useGameConnection.ts:229` | `JSON.parse(...) as ServerMessage` |
| `party/cambio.ts:679` | `JSON.parse(...) as ClientMessage` |
| `src/lib/bot-settings.ts:33` | `JSON.parse(raw) as Partial<BotSettings>` |

**Schema home:** beside unions in `src/game/types.ts` (`ClientMessage` ~166, `ServerMessage` ~260).

**Server:** reject/ignore invalid client messages in `party/cambio.ts`.

**Prefer after CAM-64** if `set_card_points` adds new message variants.

---

## CAM-64: configurable card points

### Current hardcoded scoring

`cardPoints()` in `src/game/cards.ts` (lines 70–87):

| Card | Points |
|------|--------|
| Joker | 0 |
| Ace | 1 |
| J / Q | 10 |
| Black K (♣♠) | −2 |
| Red K (♥♦) | +25 |
| 2–10 | face value |

**Callers:** `src/game/scoring.ts`, `src/game/bot.ts`, `src/game/bot-chat-events.ts`

### Mirror `set_joker_count` pattern

**Existing reference:**

- `GameState.jokerCount` + defaults/clamps in `src/game/types.ts` (`DEFAULT_JOKER_COUNT=2`, `MIN=2`, `MAX=4`)
- Message: `{ type: "set_joker_count"; count: number }`
- Engine handler: `engine.ts` ~1274–1288 (host only, lobby/ended)
- Lobby UI: `LobbyPlayers.tsx` ~118–146 with `voice.jokerCountLabel`
- `PlayerView.jokerCount`, `canSetJokerCount`

**Proposed for CAM-64:**

```ts
type CardPointValues = {
  ace: number;
  face: number;       // J and Q share
  joker: number;
  blackKing: number;
  redKing: number;
};
const DEFAULT_CARD_POINTS = { ace: 1, face: 10, joker: 0, blackKing: -2, redKing: 25 };
// MIN_CARD_POINT_VALUE = -5, MAX_CARD_POINT_VALUE = 25
```

- Add `set_card_points` client message
- Five lobby selects in `LobbyPlayers.tsx`
- Add `ThemeVoice` labels in all 8 themes (`jokerCountLabel` pattern at ~129 in `themes.ts`)
- Migrate persisted rooms in `party/cambio.ts`
- Update README FAQ point-values section (~lines 134–136)

---

## CAM-75: distinct swap VFX/SFX

### Already exists (not greenfield)

| Piece | Location |
|-------|----------|
| WS event | `{ type: "swap_flash"; slots: SwapFlashSlot[] }` in `types.ts` |
| Server broadcast | `party/cambio.ts` `broadcastSwapFlash` |
| Client state | `useGameConnection.ts` `SwapFlash` type + handler |
| Overlay | `SwapFlashOverlay` in `PixelCard.tsx` (↔ glyph, accent shimmer) |
| CSS | `globals.css` `@keyframes swap-flash-*` (~1627+) |
| Sound | dedicated `"swap"` tone in `sounds.ts`; triggered in `useGameSounds.ts` on `swapFlash` |

**Separate draw feedback (already distinct at table level):**

- `deckDrawFlash` — deck pile ring pulse (`GameTable.tsx` ~1453)
- `discardDrawFlash` — toast notice (`GameTable.tsx` ~760)
- `reshuffleFlash` — plays `"draw"` sound (conflated)
- Log lines `"drew from"` / `"discarded"` also trigger `"draw"` in `useGameSounds.ts` (~121–123)

### Gap (what CAM-75 should fix)

- Swap overlay exists per-card but lacks **dual-seat arc** / cross-table motion
- Audio: `"draw"` used for reshuffle + generic log draw/discard — can feel like swap
- Make swap **more visually distinct** (arc between seats, stronger dual highlight) without replacing peek/penalty flashes

**Touch paths:** `PixelCard.tsx`, `GameTable.tsx` (swap flash wiring only — not settings chrome), `useGameSounds.ts`, `globals.css`, optionally `party/cambio.ts` if slot payload needs enrichment.

---

## Quality gate (all implementation workers)

```bash
pnpm lint && pnpm typecheck && pnpm test
```

Branch convention for feature workers: `evanbrierton/<descriptive-name>-9ff0`  
Orchestrate branches: `orch/game-polish/<task>`

Linear: **In Progress** when coding starts; **In Review** when draft PR open; mention `CAM-n` in PR title.

---

## Linear status at discovery

Moved from Backlog → **Todo:** CAM-82, CAM-81, CAM-83, CAM-84, CAM-85, CAM-64, CAM-75.

Parent CAM-80 remains Backlog until children complete.
