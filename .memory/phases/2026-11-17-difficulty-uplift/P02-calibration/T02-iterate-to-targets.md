# Task: T02 Iterate to Targets

## Status: todo

## Goal
Adjust numbers until both difficulties are inside the target ranges and class parity holds on both.

## Decision Summary
- D02: Normal 55-65%, Hard 6-10% (average of the three classes), class gap <= 5pp on each difficulty, at least 500 runs per cell.
- D03: only stat bonuses, Normal beam width, and (last resort) class parity numbers.

## Implementation
### I01. Read the latest report
- Read the newest `docs/balance/2026-11-17-uplift-round*.md`. For each difficulty, compare the average completion with the target range and the class gap with 5pp.
### I02. Levers, in order
1. `ENEMY_PHASE_BONUS.normal` / `.hard` entries in `packages/game-core/src/engine.ts` (steps of 1 for minion stats, 2-4 for hero health). Prefer raising the later phases first so early battles stay approachable.
2. `normalAiBeamWidth` constants (cap 16, base 4) if Normal is below its range even with larger bonuses, or lower them if Normal planning is too strong.
3. Hard's flat `existingHardBonus` (+3 / +5) in `beginEncounter` only if the tables alone cannot reach the Hard range.
4. Class parity (only if a class gap exceeds 5pp): at most 6 numeric edits per round using the previous plan's lever order (hero power numbers, card cost changes); hero power damage steps of 1 are too large for assassin, so prefer cost changes on other classes.
- Maximum 3 rounds in this task. Each round: change <= 6 numbers, run `npm run balance:sim -- --runs 500 --label uplift-round-N --out docs/balance/2026-11-17-uplift-roundN.md`, then append the change list and result to that report.
### I03. Tests
- Update only the tests whose asserted numbers intentionally changed.
### I04. Stop conditions
- Stop as soon as both difficulties are inside the ranges and gaps are <= 5pp.
- If 3 rounds do not get there, stop, record the closest result and the remaining gap in the report and the progress log, and write a follow-up decision in `.memory/decisions/` instead of widening the target silently.

## Acceptance Criteria
- [ ] Normal average completion 55-65% and Hard 6-10% on a 500-run report, or an explicit follow-up decision recorded.
- [ ] Class gap <= 5pp on each difficulty.
- [ ] Each round documented with changes and before/after.
- [ ] All tests, lint, build pass.

## Validation
- `npm test`
- `npm run lint`
- `npm run build`
- `npm run balance:sim -- --runs 500 --label uplift-round-N --out docs/balance/2026-11-17-uplift-roundN.md`

## Commit Message
```text
balance: tune enemy bonuses to difficulty targets

Plan: 2026-11-17-difficulty-uplift
Phase: P02-calibration
Task: T02-iterate-to-targets
```

## Progress
- [ ] implementation complete (or skipped because T01 already met the targets, with evidence)
- [ ] validation passed
- commit: pending
