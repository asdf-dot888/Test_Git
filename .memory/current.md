# Current Context

## Active Plan
[Class/Card/Enemy Balance via Simulation Bot](./plans/2026-11-17-class-balance-simulation.md)

## Active Phase
[P02 Balance Tuning](./phases/2026-11-17-class-balance-simulation/P02-balance-tuning/phase.md)

## Active Task
[P02-T02 Iteration and Normal Phase Curve](./phases/2026-11-17-class-balance-simulation/P02-balance-tuning/T02-iteration-and-normal-phase-curve.md)

## Status
- P01 complete. P02-T01 complete: Hard completion gap 24.0pp -> 11.8pp (warrior 15.8 / assassin 14.0 / demonist 25.8). Report: `docs/balance/2026-11-17-round1.md`.
- Normal difficulty is saturated for the bot (~99-100% for every class); classes are indistinguishable there.
- Experiment method that works: `npm run balance:sim -- --runs 300 --difficulty hard --class <id> --out <scratch>` (~45 s per class) to test a change before committing to a full report.
- User instruction: run the whole plan to the end without asking; no push notifications.

## Next Step (IMPORTANT)
P02-T02: demonist is still ~10pp above warrior/assassin on Hard. Run up to 2 more tuning rounds (max 6 numeric edits each, +/-1), then decide whether Normal needs a phase curve (bot clears ~100%; no agreed target, so only change with clear evidence; otherwise record as an open finding). Re-measure, update tests, commit, advance to P02-T03.
