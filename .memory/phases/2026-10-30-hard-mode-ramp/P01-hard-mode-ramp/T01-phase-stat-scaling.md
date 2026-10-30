# Task: T01 Phase-Based Hard Enemy Stat Scaling

## Status: done

## Goal

Add the confirmed Phase 2 and Phase 3 stat bonuses to Hard-mode encounters while preserving Normal mode and existing Phase 1 values.

## Decision Summary

- Hard Phase 2: add 8 enemy hero health and +1/+1 to every enemy minion.
- Hard Phase 3: add 16 enemy hero health and +2/+2 to every enemy minion.
- Apply minion scaling to all enemy summons and tokens. Never scale player minions.
- Add these phase bonuses on top of the current Hard encounter health bonus (+3 ordinary, +5 boss).

## Implementation

### I01. Apply phase bonus to enemy heroes and minion creation

- Related Files:
  - `packages/game-core/src/engine.ts` :: `beginEncounter`; derive the enemy hero's phase bonus from `encounter.phase` and `run.difficulty`.
  - `packages/game-core/src/engine.ts` :: `createMinion`; apply the enemy minion phase bonus to the created `MinionState`.
  - `packages/game-core/src/engine.ts` :: `summonOnBoard`; verify every enemy creation path funnels through `createMinion` (ordinary cards, spell summons, battlecry summons, death summons, and boss-only card summons).

#### Details

- Do not add fields to `RunState`, `BattleState`, or serialized save schemas; `run.phase` and the active encounter already identify the phase.
- In `beginEncounter`, calculate `phaseHealthBonus` as `0` unless difficulty is `hard`; for Hard use `0` in Phase 1, `8` in Phase 2, and `16` in Phase 3. Set `enemyHero.maxHealth = enemy.maxHealth + currentHardBonus + phaseHealthBonus`, where `currentHardBonus` remains 3 for ordinary enemies and 5 for bosses. Initialize `health` to that same maximum.
- In `createMinion`, calculate `phaseMinionBonus` as `0/1/2` for Hard phases 1/2/3 and `0` for Normal. When `owner === "enemy"`, set `attack = definition.minion.attack + phaseMinionBonus`, `maxHealth = definition.minion.maxHealth + phaseMinionBonus`, and `health = maxHealth`. For `owner === "player"`, preserve catalog attack and health exactly.
- Keep instance IDs, `summonedTurn`, `hasAttacked`, effects, board capacity, and RNG behavior unchanged.

### I02. Add game-core regression tests

- Related Files:
  - `packages/game-core/src/engine.test.ts` :: existing Hard expedition enemy-health tests; add phase and summon scaling cases.

#### Details

- Cover Normal Phase 1/2/3 hero health and enemy minion stats remaining unchanged.
- Cover Hard Phase 1 retaining only the current +3 ordinary/+5 boss health bonus and no minion stat bonus.
- Cover Hard Phase 2 ordinary and boss hero health receiving the existing Hard bonus plus 8, and enemy minions receiving +1/+1.
- Cover Hard Phase 3 ordinary and boss hero health receiving the existing Hard bonus plus 16, and enemy minions receiving +2/+2.
- Create enemy minions through a direct card play and at least one summon effect; assert summoned enemy tokens receive the same phase bonus. Assert an equivalent player summon remains unscaled.

## Acceptance Criteria

- [ ] Hard Phase 1 enemy values are unchanged.
- [ ] Hard Phase 2 and Phase 3 apply the specified additive bonuses to heroes and all enemy minions.
- [ ] Normal mode and player-owned minions are unchanged.
- [ ] Summon paths cannot bypass enemy minion scaling.

## Validation

- `npm run test --workspace @board-game/game-core -- src/engine.test.ts` — all game-core engine tests pass.
- `npm run build --workspace @board-game/game-core` — TypeScript build passes.

## Commit Message

```text
feat(game-core): scale hard enemies by phase

Plan: 2026-10-30-hard-mode-ramp
Phase: P01-hard-mode-ramp
Task: T01-phase-stat-scaling

- Add phase-based Hard hero health and enemy minion bonuses
- Apply minion bonuses to tokens and all enemy summon paths
```

## Progress

- [x] Implementation complete
- [x] Validation passed
- commit: pending
