# Task: T02 Iteration and Normal Phase Curve

## Status: todo

## Goal
If the class gap is still above ±5pp after round 1, run another tuning round. Separately, adjust Normal-mode enemy phase difficulty only if measurements show it is clearly too easy or too hard.

## Decision Summary
- D04: class tuning is shared across difficulties; Normal enemy phase scaling changes only on measured need; Hard-mode rules stay.
- D05: numeric values only.

## Implementation
### I01. Decide scope from round 1
- Read `docs/balance/2026-11-17-round1.md`.
- If the class gap is already ≤ 5pp on both difficulties and no Normal-phase problem is visible, mark this task `skipped` in the task file with the report evidence, advance the pointer, and do not change code.
### I02. Further class rounds (if needed)
- Same lever order and budget as T01 (at most 6 numeric edits per round, ±1 each). Maximum 2 additional rounds in this task; record each as `docs/balance/2026-11-17-round2.md` / `round3.md`.
### I03. Normal-mode phase curve (only on measured need)
- Evidence required: the per-encounter win-rate table shows Normal-mode Phase 3 encounters winning clearly more than Phase 1 for every class (a flat or rising curve), or Phase 1 encounters failing early.
- Levers, numbers only:
  - `NORMAL_ENEMIES_BY_PHASE` `maxHealth` values in `packages/game-core/src/catalog.ts`.
  - `BOSSES` `maxHealth` values.
  - Optional Normal-mode phase bonuses by mirroring the existing Hard constants in `packages/game-core/src/engine.ts` (`HARD_PHASE_HERO_HEALTH_BONUS`, `HARD_PHASE_MINION_STAT_BONUS`) with smaller Normal values; apply them in `createMinion` (enemy stat bonus) and `beginEncounter` (`phaseHealthBonus`) via a difficulty-aware lookup. Hard values and Phase 1 values stay unchanged.
- Add tests in `packages/game-core/src/engine.test.ts` covering any new Normal bonus (Normal Phase 2/3 enemy minion stats and hero health) and confirming Hard values are unchanged.
### I04. Re-measure
- `npm run balance:sim -- --runs <n> --label <round> --out docs/balance/<file>.md`.

## Acceptance Criteria
- [ ] Either the task is marked `skipped` with evidence, or class gap is ≤ 5pp on both difficulties.
- [ ] Hard-mode rules and values unchanged.
- [ ] Any new Normal-mode constant has tests.
- [ ] All tests, lint, and build pass.

## Validation
- `npm test`
- `npm run lint`
- `npm run build`
- `npm run balance:sim -- --runs <n> --label <round> --out docs/balance/<file>.md`

## Commit Message
```text
balance: iterate class tuning and Normal phase curve

Plan: 2026-11-17-class-balance-simulation
Phase: P02-balance-tuning
Task: T02-iteration-and-normal-phase-curve
```

## Progress
- [ ] implementation complete (or skipped with evidence)
- [ ] validation passed
- commit: pending
