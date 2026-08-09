# CAM-64 verifier run (2026-08-09)

## Commands

```bash
pnpm install
pnpm lint && pnpm typecheck && pnpm test          # 50/50 pass
pnpm run ci                                       # lint + typecheck + test + party:check + build — all pass
pnpm vitest run src/game/cards.test.ts            # 5/5 pass
pnpm vitest run src/game/engine.test.ts -t "set_card_points"  # 6/6 pass
pnpm vitest run --config verifier/vitest.verify.config.mts    # 9/9 pass (incl. ended-phase, migration, bot)
```

## Live UI (localhost:3000 + party :8787)

- Host lobby: five card-point dropdowns editable; changed RED K PTS 25 → 15; log shows "Card point values updated"
- Guest lobby: same five values visible as read-only text (no selects); guest saw host's updated red king = 15
- Screenshots: `verifier/artifacts/e2dc6.webp` (host), `b62dc.webp` (host edit), `948f1.webp` (guest read-only)
- In-round scoring with custom values: **not exercised live**; covered by `engine.test.ts` "uses configured values for end-of-round scoring"

## PR

- Draft PR #168 against `main`, title/body mention CAM-64
