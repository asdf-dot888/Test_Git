# Task: T01 Test Fixtures and Art

## Status: done

## Goal
Resolve five failing web tests while keeping their meaningful assertions.

## Decision Summary
- Test the current class-selection and tutorial flow.
- Use existing matching boss illustrations for missing catalog card art.

## Implementation
### I01. Test setup
- `apps/web/src/App.audio.test.tsx` :: `makeReadySync` and combat audio test; select a truly untargeted affordable spell using current targeting rules.
- `apps/web/src/App.timer.test.tsx` :: turn timer test; mark tutorial complete before asserting unrestricted menu operations.
- `apps/web/src/App.roadmap.test.tsx` :: new-run tests; select a class and start the run before asserting roadmap behavior.
- `RunState` from `createRun` and `LocalRunController` signatures remain unchanged. Fail if audio, timer, or roadmap effects regress.
### I02. Art assets
- `apps/web/public/art/cards/matron-thornling.png` :: add matching blood matron art.
- `apps/web/public/art/cards/grave-king-demon.png` :: add matching grave king art.
- `apps/web/public/art/cards/void-titan-whelp.png` :: add matching void titan art.
- PNG files only; catalog schema unchanged.

## Acceptance Criteria
- [x] Full suite passes, including five previously failing tests.
- [x] Three catalog card image paths exist.

## Validation
- `npm.cmd test -- --config apps/web/vite.config.ts --silent`

## Commit Message
```text
fix(test): align fixtures and restore missing boss card art

Plan: 2026-11-12-validation-cleanup
Phase: P01-quality-gates
Task: T01-test-fixtures-and-art
```

## Progress
- [x] implementation complete
- [x] validation passed: 75 files, 694 tests.
- commit: see Git history
