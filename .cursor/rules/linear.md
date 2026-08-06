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
