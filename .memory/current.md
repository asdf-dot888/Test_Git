# Current Context

## Active Plan
[Class/Card/Enemy Balance via Simulation Bot](./plans/2026-11-17-class-balance-simulation.md)

## Active Phase
[P01 Simulation Harness](./phases/2026-11-17-class-balance-simulation/P01-simulation-harness/phase.md)

## Active Task
[P01-T02 Run Simulator](./phases/2026-11-17-class-balance-simulation/P01-simulation-harness/T02-run-simulator.md)

## Status
- Decision: [2026-11-17-class-balance-simulation](./decisions/2026-11-17-class-balance-simulation.md) confirmed.
- P01-T01 complete: `packages/game-core/src/balance/bot.ts` + tests; 5 bot tests, lint, and build passed.
- User instruction: continue executing tasks in order without asking for confirmation.

## Next Step (IMPORTANT)
Implement P01-T02: create `packages/game-core/src/balance/simulate.ts` and `simulate.test.ts` per the blueprint, run validation, commit, mark done, update `phase.md`, and advance this pointer to P01-T03.
