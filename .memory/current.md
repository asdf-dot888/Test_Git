# Current Context

## Active Plan
[Class/Card/Enemy Balance via Simulation Bot](./plans/2026-11-17-class-balance-simulation.md)

## Active Phase
[P01 Simulation Harness](./phases/2026-11-17-class-balance-simulation/P01-simulation-harness/phase.md)

## Active Task
[P01-T03 CLI, Report, and Baseline](./phases/2026-11-17-class-balance-simulation/P01-simulation-harness/T03-cli-and-baseline.md)

## Status
- Decision: [2026-11-17-class-balance-simulation](./decisions/2026-11-17-class-balance-simulation.md) confirmed.
- P01-T01 complete (battle bot).
- P01-T02 complete (run simulator); balance tests 16/16, lint, and build passed. Speed ~0.14 s per run.
- User instruction: continue executing tasks in order without asking for confirmation.

## Next Step (IMPORTANT)
Implement P01-T03: `report.ts`, `cli.ts`, root `balance:sim` script, `report.test.ts`, then generate `docs/balance/2026-11-17-baseline.md`. Check the web bundle excludes the bot, commit, mark done, and advance this pointer to P02-T01.
