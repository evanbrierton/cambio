<!-- orchestrate handoff
task: bootstrap-discovery
branch: orch/project-priority/bootstrap-discovery
agentId: bc-be4486d0-2cee-4303-a9dc-278fcc59bccd
runId: run-5ca88d60-58e2-44cd-aa34-bcfc2efacadc
resultStatus: finished
finishedAt: 2026-08-11T14:04:10.274Z
-->

## Status
success

## Branch
`orch/project-priority/bootstrap-discovery`

## What I did
- Verified repo paths and Linear issue states against `main` (2026-08-11).
- Confirmed **CAM-88** is **Todo** / unstarted — still calls `api.groq.com` via `GROQ_API_KEY`; no Linear status change needed.
- Confirmed CAM-80 children (CAM-82, 81, 83, 84, 85, 64, 75, 87, 76, 77) are **Done** on Linear and present on main — marked do-not-reopen.
- Confirmed extraction targets absent: `src/game/host.ts`, `src/hooks/useServerMessages.ts`, `party/matchmaking.ts`, tutorial modules.
- Measured hot paths: `party/cambio.ts` 722 LOC, `useGameConnection.ts` 450 LOC, `engine.ts` 1618 LOC.
- Authored durable discovery brief at `docs/orchestrate/project-priority-discovery.md` (382 lines) covering all 5 phases, issue IDs, path contention, defer list, library lock-in, and verification notes.
- Committed and pushed; no product code changes, no PR (per task scope).

## Measurements
- `docs/orchestrate/project-priority-discovery.md`: 0 → 382 LOC
- `party/cambio.ts`: 722 LOC (unchanged)
- Extraction targets on main (`host.ts`, `useServerMessages.ts`): 0 files → 0 files

## Verification
type-check-only

## Notes, concerns, deviations, findings, thoughts, feedback
- **CAM-88 is the sole remaining Phase 1 item.** Everything else in the game-polish wave is Done.
- **Strict sequencing on `party/cambio.ts`:** CAM-88 (gateway env) → CAM-19 (GameHost extract) → CAM-52 (matchmaking auto-start). Do not start CAM-19 until CAM-88 lands.
- **Matchmaking v1 P0 issues:** CAM-51, CAM-52, CAM-53, CAM-54 (design doc also references CAM-58–62 as P2+ defer).
- **Tutorial sub-issues include CAM-70** (GameTable integration) — brief listed CAM-66/67/68/69/70/71.
- **Mobile Phase 0–1 slice:** CAM-33 → CAM-34 → CAM-35 → CAM-36 → CAM-37; defer CAM-38+ shells.
- **CAM-80 parent epic** still Backlog in Linear though children are merged — tracking-only, not blocking.
- **CAM-85 landed zod in `wire-schema.ts`** (not inline in `types.ts`) — noted in brief.
- **No PR opened** — planner owns integration per task instructions.

## Suggested follow-ups
- Publish **CAM-88** worker (`evanbrierton/cam-88-route-bot-chat-llm-through-vercel-ai-gateway-groq`) as next coding task — only remaining Phase 1 work.
- After CAM-88 merges, publish **CAM-19** GameHost extract as Phase 2 entry (XL; highest structural risk).
- Planner: merge `orch/project-priority/bootstrap-discovery` and fan out phase workers using the brief below.

---

### Discovery brief (for dependsOn consumers)

**Full file:** `docs/orchestrate/project-priority-discovery.md` on branch `orch/project-priority/bootstrap-discovery`

**Order:** polish → GameHost extract → Matchmaking v1 → Tutorial → Mobile Phase 0–1 → defer LAN/WebRTC + native shells

| Phase | Scope | Key issues |
| --- | --- | --- |
| **1 Game polish** | Finish safe adoption + bugs | **Remaining:** [CAM-88](https://linear.app/ebrierton-cambio/issue/CAM-88). **Done (don't reopen):** CAM-82, 81, 83, 84, 85, 64, 75, 87, 76, 77. **Defer:** CAM-17, 55, 57, 56, 86 |
| **2 Offline P2P Phase 0** | GameHost + useServerMessages + tests; NO LAN/WebRTC | CAM-19 → CAM-20 → CAM-21. **Not:** CAM-22, 23, 26 |
| **3 Matchmaking v1** | Thin CambioParty + MatchmakingParty DO | CAM-51 → CAM-52 → CAM-53 → CAM-54. **Defer P2:** CAM-61, 59, 62 |
| **4 Tutorial** | After home/lobby stable | CAM-65 epic: CAM-66, 68, 69, 67, 70, 71 |
| **5 Mobile Phase 0–1** | PWA + adapters + packages | CAM-33 → 34 → 35 → 36 → 37. **Defer:** CAM-38+ |

**Path contention:**
- `party/cambio.ts`: CAM-88 then CAM-19 then CAM-52
- `src/hooks/useGameConnection.ts`: CAM-20 after CAM-19; CAM-53 match params later
- `src/game/bot-chat-llm.ts`: CAM-88 only in Phase 1
- Home/lobby: matchmaking (CAM-53/54) before tutorial (CAM-68/70)

**CAM-88 constraints:** Workers-compatible `AI_GATEWAY_API_KEY` (not OIDC); OpenAI-compatible gateway HTTP; keep template fallback; preserve CAM-87 private-card rules. Files: `src/game/bot-chat-llm.ts`, `party/cambio.ts`, `party/env.d.ts`.

**Quality gate:** `pnpm lint && pnpm typecheck && pnpm test`

**Source docs:** [Project priority order](https://linear.app/ebrierton-cambio/document/project-priority-order-67a9122bb396) · [Matchmaking v1 design](https://linear.app/ebrierton-cambio/document/matchmaking-v1-design-43b3ec2d1df6)