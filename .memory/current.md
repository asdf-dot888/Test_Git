# Current Context

## Active Plan
[Overall Difficulty Uplift (Normal and Hard)](./plans/2026-11-17-difficulty-uplift.md)

## Active Phase
[P02 Calibration](./phases/2026-11-17-difficulty-uplift/P02-calibration/phase.md)

## Active Task
[P02-T01 Measure and First Tables](./phases/2026-11-17-difficulty-uplift/P02-calibration/T01-measure-and-first-tables.md)

## Status
- Decision: [2026-11-17-difficulty-uplift](./decisions/2026-11-17-difficulty-uplift.md) confirmed.
- P01-T01 complete: Normal AI plans full turns from the second battle without hidden information.
- P01-T02 complete: `ENEMY_PHASE_BONUS` per difficulty (Hard = old values, Normal = zeros).
- P01-T03 complete: reports now include the difficulty target verdict. P01 done; 786 tests pass.
- Previous plan (class balance simulation) is complete; its tooling (`npm run balance:sim`) is reused for calibration.
- Targets: Normal average bot completion 55-65%, Hard 6-10%, class gap <= 5pp, first battle unchanged.

## Next Step (IMPORTANT)
Implement P02-T01: run the AI-only measurement (`npm run balance:sim -- --runs 500 --label uplift-ai-only --out docs/balance/2026-11-17-uplift-ai-only.md`), then choose the first `ENEMY_PHASE_BONUS` values using 300-run experiments (`--difficulty normal`/`hard`, one class at a time), confirm with 500 runs, save `docs/balance/2026-11-17-uplift-round1.md`, update tests, commit.
