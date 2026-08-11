<!-- orchestrate handoff
task: fix-pr-stack-cam-88-cancel
branch: orch/project-priority/fix-pr-stack-cam-88-cancel
agentId: bc-761af6a2-7a26-4106-8ddf-f7b2318e4d10
runId: run-bac636dc-5934-45d1-9a5e-08ed04ab47d9
resultStatus: finished
finishedAt: 2026-08-11T14:40:02.440Z
-->

## Status
success

## Branch
`orch/project-priority/fix-pr-stack-cam-88-cancel`

## What I did
- Edited **PR #186** body via `gh pr edit`: removed “merge CAM-88 / PR #185 first” blockquote; added standardized merge-order section.
- Edited **PR #187** body: replaced “merge #186 first, then this PR” with full stack merge-order line.
- Edited **PR #188** body: replaced numbered merge-order list with standardized stack line.
- Edited **PR #189** body: renamed “Stack order” → “Merge order” and standardized stack line.
- Updated `docs/orchestrate/project-priority-discovery.md`: Phase 1 polish marked complete; CAM-88 marked **Canceled** (direct Groq/`GROQ_API_KEY` stays); explicit note that GameHost extract has no CAM-88 prerequisite on `party/cambio.ts`.

## Measurements
- `pr_186_cam88_refs`: 1 → 0
- `pr_187_cam88_refs`: 0 → 0
- `pr_188_cam88_refs`: 0 → 0
- `pr_189_cam88_refs`: 0 → 0
- `discovery_doc_cam88_sequencing_refs`: 0 → 0

## Verification
not-verified

(PR body edits verified via `gh pr view` grep; no product code or test runs involved.)

## Notes, concerns, deviations, findings, thoughts, feedback
- Stack-mobile-pr discovery doc was already condensed and had no CAM-88→CAM-19 sequencing text; added a new Phase 1 section rather than editing absent content.
- PR body changes are live on GitHub immediately (`gh pr edit`); they are not on any branch diff — only the discovery doc + handoff JSON are committed.
- All four PRs now share identical merge-order line: `#186 (GameHost) → #187 (Matchmaking) → #188 (Tutorial) → #189 (Mobile)`.

## Suggested follow-ups
- Planner may cherry-pick or merge `docs/orchestrate/project-priority-discovery.md` from this branch into stack heads if they want the doc update propagated before stack merge.
- Proceed with stack merge in order: #186 → #187 → #188 → #189.