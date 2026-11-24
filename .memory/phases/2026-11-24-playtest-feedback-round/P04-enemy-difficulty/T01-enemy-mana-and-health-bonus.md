# Task: T01 Enemy Mana +2 and No Minion Health Bonus

## Status: todo

## Goal
Enemy minions get the same health as the same card for the player; the enemy instead recovers `+2` mana per turn (was `+1`). Everything else about the enemy bonuses stays as the starting values for tuning.

## Decision Summary
D09 parts 1-3. Keep the minion attack bonus and the hero health bonus (including the extra hero health on hard: +3 normal enemies, +5 bosses). Applies to both difficulties.

## Implementation
### I01. Health bonus (`packages/game-core/src/engine.ts`)
- `ENEMY_PHASE_BONUS`: set `minionHealth` to `{ 1: 0, 2: 0, 3: 0 }` for `normal` and for `hard` (keep the field and the type so it stays a tuning knob). Leave `heroHealth` and `minionAttack` as they are. `enemyPhaseBonus(..., "minionHealth")` then returns 0 everywhere; make sure the code that applies it (where enemy minions are created, search `"minionHealth"`) still works with 0.
### I02. Enemy mana
- Add and export `const ENEMY_MANA_RECOVERY = 2;` (comment: the player recovers 2-4, the enemy a flat 2 so it can cast its hand) and use it in `resolveEnemyTurnWithPlayback`: `if (battle.turnNumber > 1) gainRegularMana(battle.enemyMana, ENEMY_MANA_RECOVERY);`. Add `enemyManaRecovery` to `gameConstants`. The enemy still starts with `INITIAL_MANA` (5), caps at `MAX_MANA` (10) and keeps unspent mana.
### I03. Tests and text
- Update tests that pin the enemy minion health bonus or `enemyPhaseBonus.*.minionHealth` (search `minionHealth`, `enemyPhaseBonus` in `packages/game-core/src/**/*.test.ts` and `apps/web/src`); add tests: an enemy minion created in phase 2 and phase 3 on both difficulties has exactly its catalog health; the enemy gains 2 mana per turn from turn 2 and never exceeds 10 (including carry-over and boss turns).
- README "적 강화" paragraph: mention the enemy mana recovery of 2 and that only attack and hero health are boosted. (Final wording is settled in P05-T01; here only keep the README from becoming wrong.)

## Acceptance Criteria
- [ ] No enemy minion has more health than its card definition in any phase, on either difficulty (test over all enemies and phases).
- [ ] The enemy's mana grows by 2 per turn after turn 1, capped at 10.
- [ ] The first battle rule is unchanged (no bonuses in the first battle) and its tests pass.
- [ ] Build, lint and tests pass. (Balance numbers will drift; P04-T04 retunes them.)

## Validation
- `npm run build`
- `npm test -- packages/game-core/src/engine.test.ts packages/game-core/src/balance`
- `npm test`, `npm run lint`

## Commit Message
```text
feat(core): remove the enemy minion health bonus and give the enemy 2 mana per turn

Plan: 2026-11-24-playtest-feedback-round
Phase: P04-enemy-difficulty
Task: T01-enemy-mana-and-health-bonus
```

## Progress
- [ ] implementation complete
- [ ] validation passed
- commit: pending
