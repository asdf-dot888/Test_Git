# Current Context

## Active Plan
[Entra Login, Browser-Local Runs, and Informal Progress Leaderboard](./plans/2026-10-23-entra-local-storage-and-leaderboard.md)

## Active Phase
[P01 Entra Login and Browser-Local Run](./phases/2026-10-23-entra-local-storage-and-leaderboard/P01-entra-local-run/phase.md)

## Active Task
[T02 Entra-Only Authentication and Local Run Lifecycle](./phases/2026-10-23-entra-local-storage-and-leaderboard/P01-entra-local-run/T02-entra-only-auth-and-local-run.md)

## Status
- New plan created from `.memory/decisions/2026-10-23-entra-local-storage-and-leaderboard.md`.
- P01 covers Entra-only sign-in and browser-local active runs without requiring Cosmos/API.
- P02 records the later, informal top-10 leaderboard backed by Cosmos; it is intentionally sequenced after P01 and Azure resource provisioning.
- P01-T01 account-scoped local run storage is implemented and committed after its tests and build passed.

## Next Step (IMPORTANT)
Continue with P01-T02: replace API-synchronized run lifecycle with Entra-account-scoped local run persistence.
