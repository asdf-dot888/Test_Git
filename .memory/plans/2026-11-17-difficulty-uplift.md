# Plan: Overall Difficulty Uplift (Normal and Hard)

- Date: 2026-11-17
- Decisions: [2026-11-17-difficulty-uplift](../decisions/2026-11-17-difficulty-uplift.md)
- Status: done (2026-11-17) Hard class gap measured 5.3pp vs the 5pp target on the independent seed; the user accepted it as within statistical error (`.memory/decisions/2026-11-17-difficulty-uplift-followup.md`, option A).

## Goal
Make enemies clearly stronger on both difficulties. Calibrate with the existing balance simulation so the average bot completion rate lands at Normal 55-65% and Hard 6-10%, with class gap <= 5pp on each difficulty, without touching the first battle.

## Current state (verified in `packages/game-core/src/engine.ts`)
- Normal AI picks one card at a time (`selectEnemyCard` -> `scoreEnemyCard`). Hard, from the second battle (`completedBattles > 0`), plans a whole turn with a beam search (`planHardEnemyTurn`, `hardAiBeamWidth`), and `scoreEnemyCard` has a Hard-only block that peeks at the player's hand and draw pile (`hasBoardClearSpellInHand`, `hasHighCostMinionInNextDraws`, `hasIncomingRemovalFor`).
- Enemy stat bonuses exist only for Hard: `HARD_PHASE_HERO_HEALTH_BONUS` {1:0, 2:8, 3:16} and `HARD_PHASE_MINION_STAT_BONUS` {1:0, 2:1, 3:2}, plus a flat `existingHardBonus` in `beginEncounter` (+3 hero health, +5 on bosses).
- Last balance measurement (docs/balance/2026-11-17-final.md): Normal ~99.7-100% completion, Hard 16.6-18.3%.

## Design
- **Normal planner** (D04): generalize `planHardEnemyTurn` into `planEnemyTurn(run, enemy)` used by both difficulties from the second battle. It scores with the run's own difficulty (so Normal never runs the Hard-only hidden-information block) and, for Normal only, re-seeds the simulation RNG so the plan cannot "see" real random outcomes. Normal beam width ramps separately (`normalAiBeamWidth`).
- **Stat tables** (D03): replace the two Hard-only constants with a per-difficulty table `ENEMY_PHASE_BONUS`. Hard keeps today's values; Normal starts at zeros and is calibrated. Bonuses never apply while `completedBattles === 0` (D05). The flat `existingHardBonus` stays as is.
- **Measurement** (D02): reuse `npm run balance:sim`; add a target-range verdict (average completion across classes) to the report.
- **Calibration order** (least to most invasive): Normal AI on -> Normal bonus table -> Normal beam width -> Hard table values -> `existingHardBonus`. Class parity (<= 5pp) is rechecked every round; only if it breaks, fix it with the previous plan's lever order (hero power numbers, cost changes), <= 6 numeric edits per round.

## Phases
| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `done` | Mechanics: Normal turn planner, per-difficulty stat tables, report target check (no balance change by default) | [P01](../phases/2026-11-17-difficulty-uplift/P01-mechanics/phase.md) |
| P02 | `done` | Calibrate with simulation to the target ranges, then verify on an independent seed | [P02](../phases/2026-11-17-difficulty-uplift/P02-calibration/phase.md) |

## Risks
- Normal planner makes enemy turns slower in the browser. Mitigation: Normal beam width capped at 16 (Hard already runs up to 32); measure simulated seconds per run in P02-T01.
- Raising difficulty may break class parity. Mitigation: parity is part of every acceptance check.
- The bot is weaker than a human; real play will feel easier than the targets. Accepted by the user (D02).
- Existing tests assert current Normal/Hard stats and AI behavior. Mitigation: characterization tests first (P01-T01), update only intentional changes.
- Leaderboard comparability changes (D06): not handled here; recorded in the final report.
