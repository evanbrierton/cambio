<!-- orchestrate handoff
task: cam-88-ai-gateway
branch: orch/project-priority/cam-88-ai-gateway
agentId: bc-5c7ce6dc-3af9-44db-be10-91f81da702b1
runId: run-faaf3991-fdcf-4601-9a57-ce2a5ad85cf8
resultStatus: finished
finishedAt: 2026-08-11T14:06:15.743Z
-->

## Status
success

## Branch
`orch/project-priority/cam-88-ai-gateway`

## What I did
- **`src/game/bot-chat-llm.ts`**: Replaced direct Groq `fetch` with Vercel AI Gateway OpenAI-compatible endpoint (`https://ai-gateway.vercel.sh/v1/chat/completions`, model `groq/llama-3.1-8b-instant`). Renamed internals to `callGatewayChat`; result source is now `"gateway" | "template"`. All fallback paths unchanged.
- **`party/env.d.ts` / `party/cambio.ts`**: Swapped `GROQ_API_KEY` → `AI_GATEWAY_API_KEY` (Workers Bearer auth, not OIDC). Only the env reference in `maybeBotChat` was touched — no GameHost changes.
- **`wrangler.toml` / `README.md`**: Documented `AI_GATEWAY_API_KEY` setup via `.dev.vars` and `wrangler secret put`; noted `GROQ_API_KEY` deprecation.
- **`src/game/bot-chat-llm.test.ts`**: Added unit tests for gateway routing, model slug, auth header, and all fallback reasons.
- **Linear CAM-88**: Marked In Progress → In Review.
- **Draft PR #185** opened against `main`.

## Measurements
- `api.groq.com` hits (`src` + `party`): 2 → 0
- `GROQ_API_KEY` references: 3 → 0
- `AI_GATEWAY` wiring files (`bot-chat-llm.ts`, `env.d.ts`, `cambio.ts`): 0 → 3
- `pnpm test` passing: 80 → 85
- `src/game/bot-chat-llm.test.ts` LOC: 0 → 89

## Verification
unit-test-verified

## Notes, concerns, deviations, findings, thoughts, feedback
- Used OpenAI-compatible HTTP `fetch` rather than AI SDK — no new dependencies, clean in Cloudflare DO runtime.
- `GROQ_API_KEY` removed from `env.d.ts` (not kept as alias). Production needs `wrangler secret put AI_GATEWAY_API_KEY`; old `GROQ_API_KEY` secret should be deleted after migration.
- CAM-87 private-card rules untouched — existing `bot-chat-events.test.ts` prompt/visibility tests still pass; no changes to `bot-chat-events.ts`.
- Live LLM smoke test with a real gateway key was not run (no key in env); unit tests mock fetch for gateway path and missing-key fallback.

## Suggested follow-ups
- After merge: migrate production secret (`wrangler secret put AI_GATEWAY_API_KEY`, remove `GROQ_API_KEY`).
- Publish **CAM-19** GameHost extract as Phase 2 entry (sequenced after CAM-88 per discovery brief).