# Task: T02 Lint Cleanup

## Status: done

## Goal
Clear twelve ESLint errors while preserving current behavior and user edits.

## Decision Summary
- Keep 2200 ms defeat animation and user's board styles.
- Fix hook rules by safe deferred updates and import naming; do not suppress lint.

## Implementation
### I01. Hook behavior
- `apps/web/src/App.tsx` :: tutorial startup effect; defer `setTutorialStep` and `setTutorialMode`, preserve idempotence.
- `apps/web/src/components/EnemyHeroDefeatEffect.tsx` :: update callback ref in effect, defer `setBounds`, preserve animation timing and cleanup.
- `apps/web/src/game/useLocalRun.ts` :: remove unused `useRef`, defer initial load, retain `replaceRun` signature without unused parameter variable.
- `apps/web/src/game/gameActions.ts` :: alias game-core `useHeroPower` to a non-Hook name in reducer.
- Hook state and public controller types unchanged.
### I02. Source/test cleanup
- `apps/leaderboard-api/src/leaderboard/cosmosLeaderboardRepository.test.ts` :: `legacyRecord`; avoid unused destructured names.
- `apps/web/scripts/generate-menu-bgm.mjs` :: import Node `Buffer` and `process`.
- `apps/web/src/components/CardView.test.tsx` :: remove unused `button` local.
- `apps/web/src/components/EnemyHeroDefeatEffect.test.tsx` :: wait for the deferred portrait bounds render before asserting the portal.

## Acceptance Criteria
- [x] ESLint exits zero.
- [x] Full tests and build pass.

## Validation
- `npm.cmd run lint`
- `npm.cmd test -- --config apps/web/vite.config.ts --silent`
- `npm.cmd run build`

## Commit Message
```text
fix: clear repository lint errors

Plan: 2026-11-12-validation-cleanup
Phase: P01-quality-gates
Task: T02-lint-cleanup
```

## Progress
- [x] implementation complete
- [x] validation passed: lint 0 errors, 694 tests, build successful.
- commit: see Git history
