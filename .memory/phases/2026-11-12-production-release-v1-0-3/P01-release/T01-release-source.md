# Task: T01 Release Source

## Status: done

## Goal
Commit the remaining validated runtime presentation edits and release planning records so the production source commit is complete and reviewable.

## Decision Summary
- Preserve the 2200 ms enemy defeat presentation and the current victory animation preference behavior.
- Stage only the two runtime files and this release plan; leave unrelated dirty files untouched.

## Implementation

### I01. Runtime presentation edits
- Related Files:
  - `apps/web/src/components/EnemyHeroDefeatEffect.tsx` :: `EnemyHeroDefeatEffect`; keep the 2200 ms completion timer for all motion preferences.
  - `apps/web/src/styles/board.css` :: reduced-motion rules; keep victory heading/light animation enabled while retaining the timer animation override.
- Types and schemas: none.
- Execution flow: defeat effect completes after 2200 ms; cleanup still clears the timer and board class.

### I02. Release validation
- Run the full test, lint, and build gates against the exact working tree.
- A failure blocks T02 until repaired.

## Acceptance Criteria
- [x] Runtime presentation edits are committed with the release plan.
- [x] Tests, lint, and build pass.
- [x] Unrelated user changes remain unstaged.

## Validation
- `npm.cmd test -- --silent`
- `npm.cmd run lint`
- `npm.cmd run build`

## Commit Message
```text
fix(web): finalize victory presentation timing

Plan: 2026-11-12-production-release-v1-0-3
Phase: P01-release
Task: T01-release-source
```

## Progress
- [x] implementation complete
- [x] validation passed: 694 tests, lint zero errors, production build successful.
- commit: see Git history
