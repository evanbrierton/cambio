# CAM-75 Verifier Notes (2026-08-09)

## Automated
- `pnpm lint` — pass
- `pnpm typecheck` — pass
- `pnpm test` — 39/39 pass
- `pnpm vitest run --config verifier/vitest.verify.config.mts` — 11/11 pass (incl. CAM-75 sound/VFX wiring tests)

## Live UI (solo vs 1 bot, localhost:3000 + party:8787)
- Party WebSocket connected successfully (no timeout on verifier run)
- **Deck draw flash**: cyan `accent-alt` ring pulse on deck pile (~1.5s)
- **Swap flash**: gold/violet dual-tone overlay, crossing SVG arcs, ⇄ icon, "SWAP #N" label (~3s)
- **Audio**: `deckDraw` = ascending triangle 620→740 Hz; `swap` = crossing square+sine multi-tone (880+220, 660+330, 523, 784 Hz)

## Artifacts
- Screen recording: `/opt/cursor/artifacts/cam-75-swap-vs-draw-live-verification.mp4`
- Screenshots: `/opt/cursor/artifacts/screenshots/cam-75-swap-flash-{1,2}.webp`

## PR
- Draft PR #165 open against `main`: https://github.com/evanbrierton/cambio/pull/165
