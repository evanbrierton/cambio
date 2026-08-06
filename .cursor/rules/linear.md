---
description: Linear issue workflow for Cambio team (estimates, priorities, IDs)
alwaysApply: true
---

# Linear (Cambio team)

Linear is the planning source of truth. GitHub Issues stay synced for repo visibility.

## Estimates — T-shirt scale

Team **Cambio** uses Linear's native **T-shirt** estimate scale (not Fibonacci labels in the UI).

| T-shirt | API `estimate` value | Typical scope |
|---------|-------------------|---------------|
| XS | 1 | Trivial fix, copy tweak, single-file change |
| S | 2 | Small bug or UI polish, well-understood |
| M | 3 | Standard feature slice or bug with a few touchpoints |
| L | 5 | Multi-file feature, new hook/component, moderate unknowns |
| XL | 8 | Epic or large vertical slice; consider splitting |

Linear maps T-shirt sizes to Fibonacci numbers internally for effort graphs. When creating or updating issues via API/MCP, pass the **numeric value** column above — Linear displays the matching T-shirt label.

Do not use raw Fibonacci point labels (e.g. "5 points") in descriptions; refer to sizes as XS/S/M/L/XL.

Extended scale (only if enabled in team settings): XXL = 13, XXXL = 21.

## Priorities

| Linear | Use for |
|--------|---------|
| Urgent (1) | Production breakage, data loss, blocked critical path |
| High (2) | Important bugs, v1 backbone features |
| Medium (3) | Normal backlog |
| Low (4) | Nice-to-have, post-v1 |

## Issue IDs and branches

- Linear IDs: `CAM-<n>` (e.g. `CAM-52`)
- Branch pattern: `evanbrierton/cam-<n>-<slug>`
- Link GitHub issues via attachment when creating from an existing GH issue

## Workflow

- No cycles or due dates — hobby backlog
- Statuses: Backlog → Todo → In Progress → In Review → Done
- Estimate epics and leaf issues; skip onboarding/meta issues

## Untracked work — create before implementing

When the user asks for **implementation work** (code changes, features, bug fixes, refactors) and no Linear issue is in scope, **do not start coding until the work is tracked**.

### What counts as "tracked"

- User cites `CAM-<n>` or a Linear issue URL
- You already linked the task to an issue earlier in the same conversation

### Gate workflow

1. **Search** — `list_issues` on team **Cambio** with keywords from the request to avoid duplicates.
2. **Reuse or create**
   - **Match found** — use that issue; confirm with the user if ambiguous.
   - **No match** — `save_issue` with:
     - `team`: `"Cambio"`
     - `title`: concise summary of the work
     - `description`: user request, acceptance criteria, and relevant context
     - `estimate`: T-shirt value from the table above
     - `priority`: infer from urgency (default Medium)
     - `state`: `"Todo"` (or `"In Progress"` if implementing immediately)
     - `assignee`: `"me"` when you are doing the work
3. **Announce** — tell the user the issue ID (`CAM-<n>`) before editing code.
4. **Track through delivery** — update the issue as work progresses:
   - **In Progress** — when implementation starts
   - **In Review** — when a PR is ready
   - **Done** — when merged or explicitly shipped

Use branch pattern `evanbrierton/cam-<n>-<slug>` once the issue exists.

### Skip the gate

- Questions, explanations, or reviews with **no code changes**
- User explicitly says to skip Linear for this task
- Trivial one-line fixes the user clearly treats as drive-by (still prefer tracking if unsure)
