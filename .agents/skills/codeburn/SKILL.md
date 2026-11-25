---
name: codeburn
description: Analyze local AI coding token usage, costs, sessions, and savings with the bundled CodeBurn CLI. Use when the user asks about token usage, per-question or per-session usage, AI coding costs, CodeBurn reports, or usage optimization.
---

# CodeBurn

Use the bundled local-first CodeBurn runtime in this workspace. It reads session data already stored on the machine and does not require an API key.

## Runtime

- Entry point: `.codeburn/runtime/dist/cli.js`
- PowerShell wrapper: `.codeburn/codeburn.ps1`
- Required Node.js version: 22.13.0 or newer
- Bundled CodeBurn version: 0.9.24

Run commands from the project root:

```powershell
& .\.codeburn\codeburn.ps1 sessions -p today --provider copilot --no-pager
```

## Common Requests

- Today's Copilot sessions:
  `& .\.codeburn\codeburn.ps1 sessions -p today --provider copilot --no-pager`
- Today's overall usage:
  `& .\.codeburn\codeburn.ps1 overview -p today --provider copilot --no-color`
- Optimization report:
  `& .\.codeburn\codeburn.ps1 optimize -p today --provider copilot`
- Interactive dashboard:
  `& .\.codeburn\codeburn.ps1`

For a request about one recent question or conversation, inspect the current session's records and explain that one user turn can trigger multiple model calls. Report input, output, cache, total tokens, and cost when available.

## MCP

If the workspace CodeBurn MCP server is already available, prefer its `get_usage` and `get_savings` tools for structured queries. Otherwise, use the bundled CLI. To register the bundled runtime as a project-scoped MCP server, run:

```powershell
& .\.codeburn\install.ps1
```

The installer merges the `codeburn` server into `.vscode/mcp.json` and backs up an existing file before changing it.

## Safety

- Do not run `optimize --apply`, `guard install`, or other configuration-changing commands unless the user explicitly asks.
- Do not expose raw session content when the user only asks for aggregate usage.
- Mention when token values are estimated because the provider log lacks exact counters.