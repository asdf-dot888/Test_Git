# Current Context

## Active Plan
[Overall Difficulty Uplift (Normal and Hard)](./plans/2026-11-17-difficulty-uplift.md)

## Active Phase
[P01 Mechanics](./phases/2026-11-17-difficulty-uplift/P01-mechanics/phase.md)

## Active Task
[P01-T02 Enemy Phase Bonus Tables](./phases/2026-11-17-difficulty-uplift/P01-mechanics/T02-enemy-phase-bonus-tables.md)

## Status
- Decision: [2026-11-17-difficulty-uplift](./decisions/2026-11-17-difficulty-uplift.md) confirmed.
- P01-T01 complete: Normal AI now plans full turns from the second battle without hidden information (770 tests pass).
- Previous plan (class balance simulation) is complete; its tooling (`npm run balance:sim`) is reused for calibration.
- Targets: Normal average bot completion 55-65%, Hard 6-10%, class gap <= 5pp, first battle unchanged.

## Next Step (IMPORTANT)
Implement P01-T02: replace the Hard-only phase bonus constants with `ENEMY_PHASE_BONUS` (Hard = current values, Normal = zeros, no bonus while `completedBattles === 0`), add tests, run validation (`npm run build` BEFORE `npm test`), commit, advance to P01-T03.
