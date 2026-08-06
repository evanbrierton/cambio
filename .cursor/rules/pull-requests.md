---
description: PR test-plan checkboxes — address and check off before merge-ready
alwaysApply: true
---

# Pull requests — test plan checkboxes

PR descriptions must include a **## Test plan** section with markdown checkboxes (`- [ ]`). Add a **## Checks** section for automated commands when useful.

## When creating a PR

- Include actionable, verifiable checkbox items (not vague "works fine").
- Put command-based checks first (e.g. `pnpm lint && pnpm typecheck && pnpm test`).
- Add manual/UI steps for behavior the diff touches (browser flows, theme toggles, reconnect paths, etc.).
- Link the Linear issue (`CAM-<n>`) when one exists.

## Before calling a PR merge-ready

Do not report a PR as ready until **every checkbox you can verify is checked**.

1. **Read the PR body** — `pull_request_read` (or `gh pr view`) and list all unchecked `- [ ]` items under Test plan / Checks.
2. **Work the list** — for each item:
   - **Commands** — run locally; fix failures in scope before checking off.
   - **UI / behavior** — verify with the dev server and browser MCP when available; reproduce the scenario described.
   - **User-only** — leave unchecked and tell the user what to confirm (device, production, account, etc.).
3. **Check off completed items** — update the PR body via GitHub MCP (`update_pull_request`), changing `- [ ]` → `- [x]` only for steps you actually performed.
4. **Preserve agent markers** — if the body has `<!-- CURSOR_AGENT_PR_BODY_BEGIN -->` / `END`, edit only inside that block.
5. **Report gaps** — if any boxes remain unchecked, say which ones and why before claiming readiness.

Never check a box without doing the work. Never merge, enable auto-merge, or mark draft-ready unless the user asks.

## Merge-ready checklist

A PR is merge-ready only when all of the following are true:

- [ ] CI green (`lint`, `typecheck`, `test`, `worker`, `build`)
- [ ] All verifiable Test plan / Checks boxes checked
- [ ] No unresolved review threads in scope
- [ ] Linear issue moved to **In Review** (or **Done** after merge), per Linear rule
