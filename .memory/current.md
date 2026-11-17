# Current Context

## Active Plan
[Overall Difficulty Uplift (Normal and Hard)](./plans/2026-11-17-difficulty-uplift.md)

## Active Phase
[P02 Calibration](./phases/2026-11-17-difficulty-uplift/P02-calibration/phase.md)

## Active Task
[P02-T03 Final Verification](./phases/2026-11-17-difficulty-uplift/P02-calibration/T03-final-verification.md)

## Status
- Decision: [2026-11-17-difficulty-uplift](./decisions/2026-11-17-difficulty-uplift.md) confirmed.
- P01-T01 complete: Normal AI plans full turns from the second battle without hidden information.
- P01-T02 complete: `ENEMY_PHASE_BONUS` per difficulty (Hard = old values, Normal = zeros).
- P01 done. P02-T01 and T02 done: round 4 meets both targets (Normal 63.5% avg / 4.6pp gap, Hard 7.1% avg / 4.2pp gap; 500 runs, seed 20261117). 788 tests pass.
- Previous plan (class balance simulation) is complete; its tooling (`npm run balance:sim`) is reused for calibration.
- Targets: Normal average bot completion 55-65%, Hard 6-10%, class gap <= 5pp, first battle unchanged.

## Next Step (IMPORTANT)
Implement P02-T03: independent-seed final measurement (`npm run balance:sim -- --runs 1000 --seed 20281117 --label uplift-final --out docs/balance/2026-11-17-uplift-final.md`, ~20 min, background), append the summary (before/after, full change list, limitations, leaderboard note), README paragraph on difficulty targets, quality gates, bot-absent check, close the plan.
