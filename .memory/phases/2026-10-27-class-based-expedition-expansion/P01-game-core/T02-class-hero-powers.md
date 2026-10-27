# Task: T02 Class Hero Powers

## Status: done

## Goal
Implement manually activated class powers and battle-scoped armor/soul-shard state, enforcing 2 mana and one use per player turn.

## Decision Summary
- Warrior gains 2 armor; Assassin deals 2 damage to any enemy; Demonist spends 3 shards + 2 mana to summon one random demon.
- Shards cap at 6 and reset per battle. All powers cost 2 mana and can be used once per turn.

## Implementation

### I01. Add player resources and useHeroPower
- Related Files:
  - packages/game-core/src/types.ts :: BattleState.
  - packages/game-core/src/engine.ts :: beginEncounter, dealDamageToPlayerHero, removeDeadMinions, startPlayerTurn; add useHeroPower.
  - packages/game-core/src/index.ts :: export useHeroPower.
- Details
  - Add BattleState.playerArmor: number, soulShards: number, heroPowerUsed: boolean. Initialize to 0, 0, false for each battle; startPlayerTurn resets only heroPowerUsed.
  - Export useHeroPower(run: RunState, targetId?: string): RunState. Require active player turn, non-legacy class, unused power, and 2 available mana. Use existing GameRuleError codes.
  - Warrior spends 2 mana and adds 2 armor. Player damage consumes armor first, then health. Armor never carries across battles.
  - Assassin accepts a live enemy minion ID or "enemy-hero", spends 2 mana and deals exactly 2 damage. Hero stays targetable with enemy minions alive. Remove deaths through existing death resolution.
  - Demonist requires >=3 shards and a free player-board slot; spend 3 shards and 2 mana, select one of 3 demon tokens using battle rngState, then summon. Failed use spends nothing.
  - removeDeadMinions grants a Demonist one shard for every enemy minion death, capped at 6; excess is lost. Friendly deaths grant none.

### I02. Test powers and resource edge cases
- Related Files:
  - packages/game-core/src/engine.test.ts :: power and damage tests.
- Details
  - Cover wrong turn, legacy run, duplicate use, insufficient mana, invalid Assassin target, hero target through enemy board, armor partial/full absorption, shard counts 2/3/6/7, full-board rollback, deterministic demon choice, and battle reset.

## Acceptance Criteria
- [x] Each class can use its power once per turn for 2 mana.
- [x] Armor absorbs damage before health and clears at encounter end.
- [x] Demonist shards come from enemy deaths, cap at 6, and reset per battle.
- [x] Failed powers leave all battle state unchanged.

## Validation
- npm run test --workspace @board-game/game-core -- src/engine.test.ts
- npm run build --workspace @board-game/game-core

## Commit Message
feat(game-core): implement class hero powers

Plan: 2026-10-27-class-based-expedition-expansion
Phase: P01-game-core
Task: T02-class-hero-powers

- Add once-per-turn class power rules
- Track armor and capped soul shards

## Progress
- [x] Implementation complete
- [x] Validation passed
- commit: pending
