---
description: Code style — prefer self-explanatory code over comments
alwaysApply: true
---

# Code style — avoid comments

Do not add comments to code you write or edit unless the user explicitly asks for them.

- Prefer clear names, small functions, and straightforward structure over explanatory comments.
- Do not add comments that restate what the code already says (e.g. `// increment counter`, `// handle error`).
- Do not add section banners, TODO notes, or change-log comments unless requested.
- Do not leave commented-out code.

The rare exception: a one-line note only when the **why** is non-obvious and cannot be expressed through naming alone (business rules, protocol quirks, intentional workarounds). When in doubt, omit the comment.
