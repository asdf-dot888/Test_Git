# Task: T02 Enemy Phase Bonus Tables

## Status: todo

## Goal
Replace the two Hard-only phase bonus constants with a per-difficulty table so Normal can get bonuses too, with no balance change yet (Hard keeps today's numbers, Normal starts at zero).

## Decision Summary
- D03: Normal gains phase-based stat bonuses shaped like Hard's; Hard values may be raised later.
- D05: no phase bonus while `completedBattles === 0`. The flat `existingHardBonus` (+3 hero health, +5 on bosses, Hard only) stays untouched.

## Implementation
### I01. Table and helper
- `packages/game-core/src/engine.ts`
  - Remove `HARD_PHASE_HERO_HEALTH_BONUS` and `HARD_PHASE_MINION_STAT_BONUS`; add:
    ```ts
    type PhaseTable = Record<RunState["phase"], number>;
    interface EnemyPhaseBonus { heroHealth: PhaseTable; minionStat: PhaseTable }
    const ENEMY_PHASE_BONUS: Record<RunDifficulty, EnemyPhaseBonus> = {
      normal: { heroHealth: { 1: 0, 2: 0, 3: 0 }, minionStat: { 1: 0, 2: 0, 3: 0 } },
      hard:   { heroHealth: { 1: 0, 2: 8, 3: 16 }, minionStat: { 1: 0, 2: 1, 3: 2 } },
    };
    function enemyPhaseBonus(difficulty: RunDifficulty, phase: RunState["phase"], completedBattles: number, kind: keyof EnemyPhaseBonus): number {
      return completedBattles === 0 ? 0 : ENEMY_PHASE_BONUS[difficulty][kind][phase];
    }
    ```
  - `createMinion` (enemy stat lines for `attack`, `health`, `maxHealth`): replace `run.difficulty === "hard" ? HARD_PHASE_MINION_STAT_BONUS[run.phase] : 0` with `enemyPhaseBonus(run.difficulty, run.phase, run.completedBattles, "minionStat")` (still only when `owner === "enemy"`).
  - `beginEncounter`: replace `phaseHealthBonus` with `enemyPhaseBonus(run.difficulty, encounter.phase, run.completedBattles, "heroHealth")`. Keep `existingHardBonus` and the sum `enemy.maxHealth + existingHardBonus + phaseHealthBonus` as is.
  - Export `ENEMY_PHASE_BONUS` through `gameConstants.enemyPhaseBonus` (read-only use in tests/reports).
### I02. Tests
- `packages/game-core/src/engine.test.ts`
  - Regression: Normal enemy hero health and minion stats in phases 1-3 are unchanged (read the exact numbers from the existing behavior: base `maxHealth` for heroes, catalog stats for minions).
  - Hard regression: phase 2 enemy hero gets +8 and minions +1/+1; phase 3 +16 and +2/+2 (existing tests should already cover it; keep them).
  - First-battle exemption: a battle with `completedBattles === 0` gets 0 bonus even if the table is non-zero (test the pure `gameConstants.enemyPhaseBonus` plus the helper via a run whose phase is 1; assert exemption by checking Hard phase-1 stays at +0 and the flat `existingHardBonus` still applies).
  - `gameConstants.enemyPhaseBonus.hard.heroHealth[3] === 16`, `.normal.minionStat[2] === 0`.

## Acceptance Criteria
- [ ] No gameplay change for either difficulty with the default tables.
- [ ] Bonus helper ignores the first battle.
- [ ] Tables exposed read-only via `gameConstants`.
- [ ] All tests, lint, build pass.

## Validation
- `npm test -- packages/game-core/src/engine.test.ts`
- `npm test`
- `npm run lint`
- `npm run build`

## Commit Message
```text
refactor(engine): add per-difficulty enemy phase bonus tables

Plan: 2026-11-17-difficulty-uplift
Phase: P01-mechanics
Task: T02-enemy-phase-bonus-tables
```

## Progress
- [ ] implementation complete
- [ ] validation passed
- commit: pending
