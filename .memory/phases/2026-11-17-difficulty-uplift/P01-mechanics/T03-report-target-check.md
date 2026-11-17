# Task: T03 Report Target Check

## Status: done

## Goal
Make the balance report state whether the average completion rate hits the difficulty targets, alongside the existing class-gap verdict.

## Decision Summary
- D02: Normal average completion 55-65%, Hard average 6-10% (average of the three classes); class gap <= 5pp stays.

## Implementation
### I01. Helper
- `packages/game-core/src/balance/simulate.ts`
  - `export function averageCompletion(cells: readonly CellSummary[], difficulty: RunDifficulty): number | null` — mean of `completionRate` over the cells for that difficulty, `null` if none.
### I02. Report
- `packages/game-core/src/balance/report.ts`
  - `export const COMPLETION_TARGETS: Record<RunDifficulty, readonly [number, number]> = { normal: [0.55, 0.65], hard: [0.06, 0.10] }`.
  - In `renderReport`, extend the "직업 격차 판정" area with a new section "## 난이도 목표 판정" listing, per difficulty present: average completion, target range, and `범위 안 / 범위보다 쉬움 / 범위보다 어려움`. Keep existing sections and wording unchanged so older reports remain comparable.
  - Per-battle fallback is NOT used for this check (completion average only).
### I03. Tests
- `packages/game-core/src/balance/simulate.test.ts`: `averageCompletion` returns the mean, ignores other difficulties, and is `null` when empty.
- `packages/game-core/src/balance/report.test.ts`: the report contains the new section; a Normal average of 100% is reported as easier than the range; 60% is inside; a Hard average of 3% is harder than the range.

## Acceptance Criteria
- [ ] Reports include the target-range verdict for each present difficulty.
- [ ] Existing report content unchanged.
- [ ] All tests, lint, build pass.

## Validation
- `npm test -- packages/game-core/src/balance`
- `npm test`
- `npm run lint`
- `npm run build`

## Commit Message
```text
feat(balance): report difficulty target ranges

Plan: 2026-11-17-difficulty-uplift
Phase: P01-mechanics
Task: T03-report-target-check
```

## Progress
- [x] implementation complete: `averageCompletion`, `COMPLETION_TARGETS`, "난이도 목표 판정" report section.
- [x] validation passed: 786 tests, lint clean, build clean.
- commit: see Git history
