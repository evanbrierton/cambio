<!-- orchestrate handoff
task: stack-mobile-pr
branch: orch/project-priority/stack-mobile-pr
agentId: bc-f0c9b2ea-5d42-4616-9e1d-ed587c8cf670
runId: run-5fa518e3-e31a-465b-96b9-895f86671db0
resultStatus: finished
finishedAt: 2026-08-11T14:34:07.186Z
-->

## Status
success

## Branch
`orch/project-priority/stack-mobile-pr`

## What I did
- Cherry-picked `evanbrierton/mobile-phase01-26b2` onto `orch/project-priority/stack-tutorial-pr` (tutorial stack after matchmaking + GameHost)
- Resolved conflicts:
  - `docs/orchestrate/project-priority-discovery.md` — merged matchmaking, tutorial, and mobile scope sections
  - `party/cambio.ts` — kept GameHost thin adapter (not mobile inline party)
  - `src/game/types.ts`, `engine.ts`, `wire-schema.ts`, `wire-schema.test.ts` — thin re-exports to `@cambio/game`
  - `src/hooks/useGameConnection.ts` — kept tutorial-stack `useServerMessages` + `MatchOptions`; added platform adapters from `@cambio/client/platform`
- Ported matchmaking types/engine/wire-schema fields into `@cambio/game` (mobile package was based on main pre-matchmaking)
- Opened **draft PR #189** stacked on `orch/project-priority/stack-tutorial-pr`: [CAM-35/CAM-36: Mobile Phase 0–1 monorepo extract stacked on tutorial](https://github.com/evanbrierton/cambio/pull/189)
- Marked Linear **CAM-33, CAM-34, CAM-35, CAM-36, CAM-37** → **In Review** with PR #189 attached
- Pushed orchestration handoff at `.orchestrate/stack-mobile-pr/handoff.json`

## Measurements
- `draft_prs_mobile`: 0 → 1
- `linear_CAM-33_status`: Backlog → In Review
- `linear_CAM-34_status`: Backlog → In Review
- `linear_CAM-35_status`: Backlog → In Review
- `linear_CAM-36_status`: Backlog → In Review
- `linear_CAM-37_status`: Backlog → In Review
- `pnpm_test`: 101 passing → 152 passing

## Verification
unit-test-verified

(`pnpm lint`, `pnpm typecheck`, `pnpm test` 152 passed, `pnpm party:check`, `pnpm build` all green. No live mobile-device PWA or tutorial regression smoke.)

## Notes, concerns, deviations, findings, thoughts, feedback
- **Integration strategy:** Mobile branch had inline `party/cambio.ts` (723 LOC) without GameHost; tutorial stack has GameHost adapter (227 LOC). Kept GameHost + `@cambio/game` monorepo — best of both slices.
- **Matchmaking gap:** `@cambio/game` extracted from main lacked matchmaking fields; added `isMatchmade`, `matchTargetSize`, etc. to types/engine/wire-schema in a follow-up commit.
- **useGameConnection split:** Web app keeps `useServerMessages` hook (CAM-20) rather than full re-export from `@cambio/client`; platform adapters wired for reconnect keys. `@cambio/client` package exists for native shells (CAM-37) with its own hook implementation.
- **ManagePullRequest** would reject `orch/` prefix (same as upstream `stack-tutorial-pr`); used `gh pr create --draft` instead.
- Source branch `evanbrierton/mobile-phase01-26b2` unchanged on remote; rebased work lives on `orch/project-priority/stack-mobile-pr`.

## Suggested follow-ups
- Merge stack in order: GameHost #186 → matchmaking #187 → tutorial #188 → mobile #189.
- Manual regression on real iOS Safari + Android Chrome per `docs/mobile/pwa-audit.md` (install, reconnect, audio unlock, copy link).
- Manual regression: tutorial modal/coach coexistence with monorepo imports on mobile viewport.
- Consider porting `MatchOptions` into `@cambio/client/useGameConnection` so web can thin-re-export fully when useServerMessages moves to package.