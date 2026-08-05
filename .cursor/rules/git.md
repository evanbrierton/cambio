---
alwaysApply: true
---

CRITICAL WORKFLOW RULE:
Do not use local bash execution for Git actions (do not run `git commit` or `git push` via CLI). 
When code changes are ready, use the connected GitHub MCP Server tool to write the changes directly via the GitHub API. This ensures the commits are implicitly signed via GitHub Web-Flow.
