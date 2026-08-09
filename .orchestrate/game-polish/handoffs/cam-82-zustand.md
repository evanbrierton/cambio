<!-- orchestrate handoff
task: cam-82-zustand
branch: orch/game-polish/cam-82-zustand
agentId: bc-6d1e24be-5c43-4736-82a9-25aedef2504e
runId: run-a723aa5e-f77d-400a-b302-1acf6b74f1fb
resultStatus: finished
finishedAt: 2026-08-09T10:22:44.910Z
-->

## Status
success

## Branch
`orch/game-polish/cam-82-zustand`

## What I did
- Added `src/store/ui-prefs.ts` — single zustand `persist` store with `skipHydration: true`, client rehydrate via `useRehydrateUiPrefs()`, legacy localStorage migration, and thin selector hooks (`useSoundEnabled`, `useHintsEnabled`, etc.)
- Updated `src/lib/sounds.ts` — removed pref accessors; `playSound` reads `soundEnabled` from store (Web Audio synthesis unchanged)
- Updated `src/lib/bot-settings.ts` — kept types/helpers (`BotSettings`, `clampBotCount`); removed `loadBotSettings`/`saveBotSettings`
- Updated `src/app/page.tsx` — nickname and bot defaults read/write store directly (no hydrate effects)
- Updated `src/components/game/GameTable.tsx` — imports prefs hooks from store; calls `useRehydrateUiPrefs()`
- Deleted duplicate lib/hook pairs: `hints.ts`, `notifications.ts`, `player-layout.ts`, and five standalone hook files
- Marked CAM-82 **In Review** in Linear
- Opened draft PR: https://github.com/evanbrierton/cambio/pull/167

## Measurements
- Duplicate pref lib/hook files: 8 → 0
- `LOC(src/store/ui-prefs.ts)`: 0 → 315
- `pnpm test`: 39 passing → 39 passing
- `pnpm lint`: pass → pass
- `pnpm typecheck`: pass → pass

## Verification
type-check-only

## Notes, concerns, deviations, findings, thoughts, feedback
- Custom storage migrates legacy keys (`cambio-sound-enabled`, `cambio-hints-enabled`, etc.) on first rehydrate when no `cambio-ui-prefs` blob exists; existing users keep their settings
- New persist key is `cambio-ui-prefs` (single JSON blob); legacy keys are read once at migration, not deleted
- `useGameConnection`, ephemeral GameTable UI, and theme cookies were left untouched per scope
- No package.json changes needed — `zustand` was already declared
- PR created with `skip_branch_prefix_check` because orchestrator branch name `orch/game-polish/cam-82-zustand` differs from default `evanbrierton/` prefix

## Suggested follow-ups
- CAM-84 (lucide-react GameTable chrome) — unblocked, can import prefs from store
- CAM-85 (zod WS + bot-settings) — unblocked; `BotSettings` type still in `bot-settings.ts`
- CAM-81/83 (cookies-next + next-themes) — parallel; theme stays out of zustand
- Verifier: manual spot-check of GameTable toggles and home nickname/bot hydration with existing localStorage data