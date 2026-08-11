---
description: Active development — skip legacy compatibility unless explicitly requested
alwaysApply: true
---

# Active development — no legacy compatibility by default

This project is in active development. Do not add backward-compatibility shims, persisted-state migrations, defensive fallbacks for old schema fields, or `@ts-expect-error` tests that simulate missing data unless the user or issue explicitly asks for them.

- Prefer required fields on types and assume all callers and persisted state match the current schema.
- If a shape changes, update `createRoom`, handlers, and views together — do not layer defaults on read to paper over stale data.
- Defer migration helpers, `{ ...DEFAULT, ...partial }` merge-on-load, and client fallbacks for fields the server should always send.
- When pre-release persistence breaks, reset local/dev rooms instead of carrying migration code.

Add migrations and legacy support only when shipping to users with existing persisted data, or when a task’s acceptance criteria require it.
