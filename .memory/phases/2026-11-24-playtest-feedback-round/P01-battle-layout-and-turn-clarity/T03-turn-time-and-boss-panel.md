# Task: T03 30-Second Turn Timer and Boss Panel Text

## Status: done

## Goal
The turn lasts 30 seconds on both difficulties, and the boss pattern panel names the correct turns for the difficulty (3·6·9 on normal, 2·4·6 on hard).

## Decision Summary
D05 (30 seconds, pause and 5-second warning unchanged). D08 (fix the panel text; the area attack itself, 1 damage to every player minion and the hero, does not change).

## Implementation
### I01. Timer
- `apps/web/src/game/useTurnTimer.ts`: `const TURN_DURATION_MS = 30_000;`. Nothing else changes: the `clamp` logic uses the constant, the display is `00:SS` (`App.tsx`), and the warning plays for the last 5 seconds. A saved timer from the old duration is clamped by the existing `Math.min(TURN_DURATION_MS, ...)` code, so no migration is needed.
### I02. Boss cadence constant
- `packages/game-core/src/engine.ts`: add `export const BOSS_AREA_ATTACK_EVERY_N_TURNS: Record<RunDifficulty, number> = { normal: 3, hard: 2 };` next to the other constants; use it in `resolveEnemyTurnWithPlayback` instead of the two inline `% 3` / `% 2` checks (`const cadence = BOSS_AREA_ATTACK_EVERY_N_TURNS[next.difficulty]; const areaTurn = battle.turnNumber % cadence === 0;`). Add it to the `gameConstants` object (`bossAreaCadence`). Behavior is identical to today.
### I03. Panel text
- `apps/web/src/components/GameBoard.tsx` boss panel: replace the fixed text with `보스의 ${turns}번째 턴 행동은 카드 행동 후 이어집니다.` where `turns` is `[1, 2, 3].map((n) => n * cadence).join("·")` and `cadence = gameConstants.bossAreaCadence[run.difficulty]` (normal `3·6·9`, hard `2·4·6`). Keep `data-testid="boss-pattern-panel"` and the second line.

## Acceptance Criteria
- [ ] A new player turn starts at `00:30`; with fake timers `00:05` triggers the warning and `00:00` ends the turn (existing timer tests updated from 20 to 30).
- [ ] Engine tests prove the boss area attack still triggers on turns 3, 6, 9 (normal) and 2, 4, 6 (hard).
- [ ] The boss panel text shows `3·6·9` on a normal run and `2·4·6` on a hard run.
- [ ] Build, lint and tests pass.

## Validation
- `npm run build`
- `npm test -- apps/web/src/game/useTurnTimer.test.ts apps/web/src/App.timer.test.tsx apps/web/src/components/GameBoard.test.tsx packages/game-core/src/engine.test.ts`
- Tests to update or add: every `20`-second expectation in the two timer test files; `GameBoard.test.tsx` for the panel text per difficulty; `engine.test.ts` for the constant (reuse the existing boss-area tests around lines 1286-1490).
- `npm test`, `npm run lint`

## Commit Message
```text
feat: lengthen the turn timer to 30s and fix the boss pattern text

Plan: 2026-11-24-playtest-feedback-round
Phase: P01-battle-layout-and-turn-clarity
Task: T03-turn-time-and-boss-panel
```

## Progress
- [x] implementation complete. `TURN_DURATION_MS = 30_000`; found a second hard-coded cap `Math.min(20, ...)` in `useTurnTimer.ts` (remainingSeconds) and tied it to the constant. `BOSS_AREA_ATTACK_EVERY_N_TURNS` exported from `engine.ts` (also `gameConstants.bossAreaCadence`); any non-hard difficulty counts as normal, like before. Boss panel text is computed from it.
- [x] validation passed: build clean, lint clean, 1154 tests (100 files).
- commit: see Git history
