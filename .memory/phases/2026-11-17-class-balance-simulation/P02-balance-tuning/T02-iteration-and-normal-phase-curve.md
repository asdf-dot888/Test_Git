# Task: T02 Iteration and Normal Phase Curve

## Status: done

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
- [x] implementation complete: round 2 applied 3 numeric edits (imp-caller cost 2->3, pit-ritualist cost 3->4, summoner cost 5->6). Report: `docs/balance/2026-11-17-round2.md`.
- [x] validation passed: 736 tests, lint clean, build clean.
- Result: Hard completion warrior 15.8% / assassin 14.0% / demonist 16.2% (gap 2.2pp, target met). Normal saturated (>= 98.8% for all classes).
- Normal phase curve (I03): NOT changed. The bot clears ~100% of every Normal encounter, but no target difficulty for Normal was ever agreed and the bot is not a human proxy for casual play. Recorded as an open item for the user in the round-2 report and in the final report (T03).
- Stopped after one extra round (not two): the goal was already met.
- commit: see Git history
