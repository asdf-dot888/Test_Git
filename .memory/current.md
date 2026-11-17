# Current Context

## Active Plan
[Overall Difficulty Uplift (Normal and Hard)](./plans/2026-11-17-difficulty-uplift.md)

## Active Phase
[P01 Mechanics](./phases/2026-11-17-difficulty-uplift/P01-mechanics/phase.md)

## Active Task
[P01-T03 Report Target Check](./phases/2026-11-17-difficulty-uplift/P01-mechanics/T03-report-target-check.md)

## Status
- Decision: [2026-11-17-difficulty-uplift](./decisions/2026-11-17-difficulty-uplift.md) confirmed.
- P01-T01 complete: Normal AI plans full turns from the second battle without hidden information.
- P01-T02 complete: `ENEMY_PHASE_BONUS` per difficulty (Hard = old values, Normal = zeros); 778 tests pass.
- Previous plan (class balance simulation) is complete; its tooling (`npm run balance:sim`) is reused for calibration.
- Targets: Normal average bot completion 55-65%, Hard 6-10%, class gap <= 5pp, first battle unchanged.

## Next Step (IMPORTANT)
Implement P01-T03: add `averageCompletion` to `simulate.ts`, `COMPLETION_TARGETS` and a "난이도 목표 판정" section to `report.ts`, with tests. Run `npm run build` BEFORE `npm test`, commit, then start P02-T01 (measure with the Normal planner on).
