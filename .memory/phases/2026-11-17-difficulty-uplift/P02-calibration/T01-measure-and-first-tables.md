# Task: T01 Measure and First Tables

## Status: todo

## Goal
Measure how much the Normal planner alone raises difficulty, then set a first guess for the Normal and Hard bonus tables.

## Decision Summary
- D02 targets: Normal average completion 55-65%, Hard 6-10%.
- D03: stat bonuses plus Normal AI; no deck, boss-only, or rule changes.
- Calibration order: Normal AI (already on) -> Normal bonus table -> Normal beam width -> Hard table -> `existingHardBonus`.

## Implementation
### I01. AI-only measurement
- `npm run balance:sim -- --runs 500 --label uplift-ai-only --out docs/balance/2026-11-17-uplift-ai-only.md` (Normal planner on, Normal bonus table all zero, Hard unchanged from the last plan).
- Record seconds per run for Normal in the progress log; if Normal becomes much slower than before (about 0.15 s/run), note it (browser latency risk from the planner).
### I02. First tables
- Choose `ENEMY_PHASE_BONUS.normal` and, if Hard is above 10%, `ENEMY_PHASE_BONUS.hard` in `packages/game-core/src/engine.ts` (numbers only).
- Quick experiments before a full report: `npm run balance:sim -- --runs 300 --difficulty normal --out <scratch>` (about 45-60 s per class); 300 runs has about +/-5pp noise, so use it only to pick a direction, then confirm with 500 runs.
- Starting guesses (adjust from measurements): Normal heroHealth `{1: 0, 2: 4, 3: 8}`, minionStat `{1: 0, 2: 0, 3: 1}`; Hard heroHealth `{1: 0, 2: 10, 3: 20}`, minionStat `{1: 0, 2: 1, 3: 3}` only if Hard measures above 10%.
- Phase-1 values may be non-zero (they apply from the second battle); keep them small.
### I03. Tests
- Update engine tests that assert the changed Normal/Hard enemy stats; do not weaken unrelated assertions. Keep the first-battle exemption test.
### I04. Report
- `npm run balance:sim -- --runs 500 --label uplift-round-1 --out docs/balance/2026-11-17-uplift-round1.md`, then append to that file the change list (old -> new) and a before/after table against `docs/balance/2026-11-17-final.md`.

## Acceptance Criteria
- [ ] AI-only report saved with the measured effect of the Normal planner.
- [ ] Round-1 report saved with the table values and verdicts.
- [ ] No change outside the allowed numbers (tables).
- [ ] All tests, lint, build pass.

## Validation
- `npm test`
- `npm run lint`
- `npm run build`
- the two `balance:sim` commands above

## Commit Message
```text
balance: first Normal/Hard enemy bonus tables after Normal planner

Plan: 2026-11-17-difficulty-uplift
Phase: P02-calibration
Task: T01-measure-and-first-tables
```

## Progress
- [ ] implementation complete
- [ ] validation passed
- commit: pending
