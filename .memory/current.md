# Current Context

## Active Plan
[Class/Card/Enemy Balance via Simulation Bot](./plans/2026-11-17-class-balance-simulation.md) — complete.

## Active Phase
None — P01 and P02 are complete.

## Active Task
None — class balance simulation plan is complete.

## Status
- P01 complete (bot, simulator, CLI, baseline); P02 complete (2 tuning rounds, final verification).
- Final (independent seed 20271117, 1000 runs per cell): Hard completion warrior 16.9% / assassin 16.6% / demonist 18.3%, gap 1.7pp (target 5pp). Baseline gap was 24.0pp.
- 736 tests, lint, and build pass; the bot is not in any bundle.
- Open items (see `docs/balance/2026-11-17-final.md`): Normal difficulty is saturated for the bot and was deliberately not changed (no agreed target); assassin has a lower final-boss win rate than the other classes.

## Next Step (IMPORTANT)
No active task. Start a new feature with `/grill-me <feature>`. Candidate follow-up: decide a target difficulty for Normal mode.
