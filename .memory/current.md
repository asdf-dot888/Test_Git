# Current Context

## Active Plan
[Local Leaderboard API Test](./plans/2026-10-26-local-leaderboard-api-test.md)

## Active Phase
Complete — [P01 Local Integration](./phases/2026-10-26-local-leaderboard-api-test/P01-local-integration/phase.md)

## Active Task
None — all tasks in the active plan are complete.

## Status
- T01 is done and committed as `c9a15f6` (`feat(dev): add integrated local leaderboard runner`).
- T02 is done and committed as `8b03ba4` (`fix(leaderboard): align local Cosmos configuration`).
- T03 is complete. The API now accepts the tenant's Entra v1/v2 issuer formats and the local runner overrides the root game API's Cosmos DB names for the leaderboard Functions host.
- Authenticated leaderboard GET and progress POST both returned HTTP 200 from `mango-stone/leaderboard-progress`; 10 API test files (68 tests) and the full build passed.
- Cosmos account `maze-rescue-ms-b7af62a9` now uses leaderboard database `mango-stone` with 400 RU/s shared throughput and `leaderboard-progress` partitioned by `/userId`; ignored local settings point to it.
- The integrated local runner is available at `http://localhost:4280`; frontend-only Vite remains at `http://localhost:5173`.
- In Windows PowerShell, use `npm.cmd`/`npx.cmd` because `npm.ps1` is blocked by the current execution policy.

## Next Step
Create a new decision and plan for the next requested feature or change.
