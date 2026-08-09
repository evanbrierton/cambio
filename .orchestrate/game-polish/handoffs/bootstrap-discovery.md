<!-- orchestrate handoff
task: bootstrap-discovery
branch: orch/game-polish/bootstrap-discovery
agentId: bc-fb83974a-c42b-48d4-acc8-95443e159ff0
runId: run-e4823137-dba6-4a85-8108-bacf0dfdb512
resultStatus: finished
finishedAt: 2026-08-09T10:19:04.313Z
-->

## Status
success

## Branch
`orch/game-polish/bootstrap-discovery`

## What I did
- Verified all planner-cited paths against `main`; corrected stale assumptions (deps, notification keys, leave chrome, package state).
- Wrote durable discovery brief at `docs/orchestrate/game-polish-discovery.md` (295 lines).
- Moved Linear issues CAM-82, CAM-81, CAM-83, CAM-84, CAM-85, CAM-64, CAM-75 from **Backlog → Todo**.
- Pushed branch; no product code, no PR (per scope).

### Discovery brief (for dependsOn consumers)

**Project:** Game polish — ship CAM-80 children (CAM-82 → CAM-81 → CAM-83 → CAM-84 → CAM-85), CAM-64, CAM-75. Defer CAM-55/57/17/56.

**Execution order:**
1. **CAM-82** (High) — zustand persist for UI prefs; delete duplicate lib/hook pairs
2. **CAM-81** (Medium) — cookies-next for theme cookies (blocks 83)
3. **CAM-83** (High) — next-themes for 8 style themes; keep appearance axis separate
4. **CAM-84** (Medium) — lucide-react GameTable chrome (after 82)
5. **CAM-85** (Medium) — zod WS + bot-settings (after 82; prefer after 64)
6. **CAM-64** (L, parallel) — configurable card points via `set_card_points` mirroring `set_joker_count`
7. **CAM-75** (S, parallel) — distinct swap VFX/SFX; not greenfield

**Verified corrections vs planner brief:**
- `zustand` + `zod` in `package.json` but **zero imports** in src/party
- `cookies-next`, `next-themes`, `lucide-react` **not yet** in package.json — workers add them
- Notification keys are two: `cambio-chat-notifications-enabled`, `cambio-event-notifications-enabled`
- Leave chrome is text `EXIT` (not icon); copy is voice text chip
- `PLAYER_NAME_KEY` at `src/lib/party.ts:45`

**Path contention:**
- `GameTable.tsx`: CAM-82 → CAM-84; CAM-75 avoids settings chrome
- `themes.ts`: CAM-64 labels hottest merge; CAM-83 avoids large THEME_VOICES edits
- `theme-cookie` + `ThemeProvider` + `layout`: CAM-81→83 only
- `types.ts` + `party/cambio.ts` + `engine`: CAM-64 then CAM-85
- `sounds.ts` + `PixelCard` + `globals.css`: CAM-75

**CAM-82 prefs map:**

| Pref | Key | Lib | Hook |
|------|-----|-----|------|
| Hints | `cambio-hints-enabled` | `hints.ts` | `useHintsEnabled` |
| Chat/event notifs | `cambio-chat-*` / `cambio-event-*` | `notifications.ts` | `useNotificationPrefs` |
| Grid/seat | `cambio-player-grid-enabled`, `cambio-own-seat-display` | `player-layout.ts` | `usePlayerGridEnabled`, `useOwnSeatDisplay` |
| Sound | `cambio-sound-enabled` | `sounds.ts` | `useSoundEnabled` |
| Bots | `cambio-bot-settings` | `bot-settings.ts` | hydrate in `page.tsx` |
| Nickname | `cambio-player-name` | `party.ts` | inline in `page.tsx` |

Use `skipHydration` + client rehydrate. Keep out: `useGameConnection`, ephemeral GameTable UI, theme cookies.

**CAM-85 unsafe casts:** `useGameConnection.ts:229` (ServerMessage), `party/cambio.ts:679` (ClientMessage), `bot-settings.ts:33` (Partial<BotSettings>).

**CAM-64:** Hardcoded `cardPoints()` in `cards.ts:70-87`; callers scoring/bot/bot-chat-events. Mirror joker pattern (`LobbyPlayers.tsx:118-146`, `engine.ts:1274-1288`).

**CAM-75:** `swap_flash` → `SwapFlashOverlay` exists; gap is dual-seat arc + stop conflating draw/discard/swap audio (`useGameSounds.ts` uses `"draw"` for reshuffle + log lines).

**Quality:** `pnpm lint && pnpm typecheck && pnpm test` before handoff.

Full doc: `docs/orchestrate/game-polish-discovery.md` on branch.

## Measurements
- `docs/orchestrate/game-polish-discovery.md`: absent → 295 LOC
- Linear open-wave issues in Todo: 0 → 7
- Product files modified: 0 → 0

## Verification
type-check-only

(Path verification and doc authoring only; no product changes to test.)

## Notes, concerns, deviations, findings, thoughts, feedback
- All 62 cited source paths exist; `docs/orchestrate/` did not exist before this branch.
- CAM-49 (appearance) is Done; two-axis theme model confirmed in `ThemeProvider` + `layout.tsx` FOUC script.
- CAM-80 parent left Backlog intentionally until children land.
- CAM-64 and CAM-75 can start in parallel with CAM-81/83 once CAM-82 merges (or earlier if touching disjoint files).
- `play/[roomId]/page.tsx` wires flash props to GameTable — relevant for CAM-75 but omitted from original brief.

## Suggested follow-ups
- Worker: CAM-82 zustand persist (unblocks CAM-84, CAM-85, simplifies GameTable)
- Worker: CAM-64 card points (unblocks CAM-85 message schemas)
- Worker: CAM-81 cookies-next (unblocks CAM-83)
- Worker: CAM-75 swap VFX after CAM-82 if touching `sounds.ts`
- Planner: integrate `orch/game-polish/bootstrap-discovery` before fanning implementation workers