<!-- orchestrate handoff
task: mobile-phase01
branch: evanbrierton/mobile-phase01-26b2
agentId: bc-76f3941b-5bb5-404f-88cc-6c5b748b26b2
runId: run-90c61b0b-cbc5-4275-8825-cc80b38e6ba5
resultStatus: finished
finishedAt: 2026-08-11T14:25:28.021Z
-->

## Status
success

## Branch
`evanbrierton/mobile-phase01-26b2`

## What my subtree did
- **CAM-35:** pnpm workspace with `packages/game` and `packages/client`; root `transpilePackages`, TS path aliases, README monorepo section.
- **CAM-36:** Game logic moved to `@cambio/game`; `party/cambio.ts` imports package; `src/game/*` kept as thin re-exports for `@/game` compatibility.
- **CAM-37:** `@cambio/client` holds `useGameConnection`, party host config, swap-flash helpers; web app re-exports from `@cambio/client`.
- **CAM-34:** `StorageAdapter` / `ClipboardAdapter` in `@cambio/client/platform`; migrated ui-prefs, PWA dismiss, clipboard, and game reconnect keys; injectable via `setDefaultPlatformAdapters()` / `useGameConnection(..., platform)`.
- **CAM-33:** PWA hardening — manifest (`id`, shortcuts, `prefer_related_applications`), SW v3 with offline shell + update reload, `useAudioUnlock`, audit doc at `docs/mobile/pwa-audit.md`.
- Orchestrate workspace at `.orchestrate/mobile-phase01/`; `docs/orchestrate/project-priority-discovery.md` published.
- **No Capacitor/Expo shell code.**

## Verification
unit-test-verified

(`pnpm lint`, `pnpm typecheck`, `pnpm test` 136 passed, `pnpm party:check`, `pnpm build` all green. No live mobile-device PWA smoke.)

## Notes, concerns, deviations, findings, thoughts, feedback
- Implemented directly on one branch (tutorial-v1 precedent) — orchestrate worker fan-out not run; single subplanner VM carried the full slice.
- **No draft PR opened** per subplanner handoff rule; branch pushed: https://github.com/evanbrierton/cambio/tree/evanbrierton/mobile-phase01-26b2
- Compare URL for parent PR: https://github.com/evanbrierton/cambio/compare/main...evanbrierton/mobile-phase01-26b2
- Theme cookies remain in `src/lib/theme-cookie.ts` for Next.js SSR bootstrap (documented in `docs/mobile/platform-adapters.md`); native shells will swap to storage adapter later.
- `CambioParty` is the server host — no separate `GameHost` symbol exists or was introduced.
- Branch is based on `main`, not tutorial/matchmaking branches — parent may want to stack after those land.

## Suggested follow-ups
- Parent opens draft PR against `main`: https://github.com/evanbrierton/cambio/compare/main...evanbrierton/mobile-phase01-26b2
- Manual regression on real iOS Safari + Android Chrome using checklist in `docs/mobile/pwa-audit.md` (install, reconnect after background, audio unlock, copy link).
- Stack/rebase with `evanbrierton/tutorial-v1-9adb` when tutorial lands.
- CAM-38+ native shells can consume `@cambio/client` with Capacitor/Expo adapter implementations.