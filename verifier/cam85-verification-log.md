# CAM-85 verifier execution log

**Target:** `cam-85-zod` on branch `orch/game-polish/cam-85-zod`  
**Verified:** 2026-08-09 UTC  
**Verdict:** unit-test-verified

## Automated checks

```text
pnpm install → Done (lockfile up to date, 4.6s)
pnpm lint → pass (biome 78 files, tailwind-lint ok)
pnpm typecheck → pass (tsc --noEmit)
pnpm test → 8 files, 63 tests passed
```

```text
rg "JSON\.parse\(.*\) as " src party
→ no matches (exit 1); 0 unsafe casts at WS/bot-settings boundaries
```

Schema parse tests (targeted):

```text
pnpm exec vitest run src/game/wire-schema.test.ts src/lib/bot-settings.test.ts src/store/ui-prefs-schema.test.ts --reporter=verbose
→ 3 files, 13 tests passed
```

Highlights from schema tests:
- `set_card_points` client message accepted with partial `values`
- Invalid client messages (null, {}, unknown type, wrong field types) → null
- Malformed JSON → null via parseClientMessageJson / parseServerMessageJson
- State server messages include `cardPoints` field validation
- Legacy bot settings and ui-prefs persist blobs validated with safe fallbacks

## Boundary implementation spot-check (code read + tests)

| Boundary | File | Behavior |
|----------|------|----------|
| Server WS in | `party/cambio.ts:681-686` | `parseClientMessageJson` → sends `{ type: "error", message: "Invalid message." }` on null |
| Client WS in | `src/hooks/useGameConnection.ts:229-230` | `parseServerMessageJson` → silently ignores invalid messages |
| Bot settings | `src/lib/bot-settings.ts` | `legacyBotSettingsSchema.safeParse` replaces `Partial<BotSettings>` cast |
| UI prefs persist | `src/store/ui-prefs-schema.ts` | Zod validation on zustand rehydrate/migration paths |

## PR / Linear / CI

- Draft PR #170: https://github.com/evanbrierton/cambio/pull/170 (OPEN, draft, base `main`, head `orch/game-polish/cam-85-zod`, title mentions CAM-85)
- Linear CAM-85 status: In Review
- GitHub Actions on PR #170 (run 31310973384): CI, build, lint, test, typecheck, worker — all pass

## Not verified live

- No live WebSocket session or lobby `set_card_points` host flow exercised in browser (worker noted same gap)
