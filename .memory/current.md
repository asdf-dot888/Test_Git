# Current Context

## Active Plan
[Entra Login, Browser-Local Runs, and Informal Progress Leaderboard](./plans/2026-10-23-entra-local-storage-and-leaderboard.md)

## Active Phase
[P02 Informal Progress Leaderboard](./phases/2026-10-23-entra-local-storage-and-leaderboard/P02-informal-leaderboard/phase.md)

## Active Task
[T01 Cosmos-Backed Best-Progress API](./phases/2026-10-23-entra-local-storage-and-leaderboard/P02-informal-leaderboard/T01-cosmos-best-progress-api.md)

## Status
- New plan created from `.memory/decisions/2026-10-23-entra-local-storage-and-leaderboard.md`.
- P01 covers Entra-only sign-in and browser-local active runs without requiring Cosmos/API.
- P02 records the later, informal top-10 leaderboard backed by Cosmos; it is intentionally sequenced after P01 and Azure resource provisioning.
- P01-T01 account-scoped local run storage is implemented and committed after its tests and build passed.
- P01-T02 Entra-only authentication and browser-local run lifecycle is implemented and committed after tests and build passed.
- P01-T03 local development and Azure static hosting no longer require the game API or Cosmos; API hosting and dev smoke checks passed.
- P01-T04 environment examples and setup/troubleshooting guides now describe Entra-only login and browser-local saves.
- P01 is complete. P02 is pending the planned Azure API app registration/scope and Cosmos resources.

## Next Step (IMPORTANT)
Before P02-T01, provision the game API app registration/scope and Cosmos resources. Then implement the separate, informal best-progress API; keep active run state browser-local.
