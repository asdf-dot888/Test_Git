# Task: T02 적 카드 AI 전투 엔진

## Status: done

## Goal

플레이어 턴 종료 후 적이 마나를 회복하고 카드를 내며 하수인으로 공격하고, 보스는 3턴 주기 광역 패턴을 실행하도록 만든다.

## Decision Summary

- 적은 플레이어와 동일한 카드 비용·드로우·마나·전장 규칙을 쓴다. 턴 중 가능한 범위에서 여러 카드를 내고 하수인은 한 번씩 공격한다.
- 플레이어 하수인이 하나라도 있으면 적 하수인과 단일 대상 피해 주문은 플레이어 하수인만 대상으로 삼는다. 영웅은 하수인이 모두 없을 때만 대상이 된다.
- 보스는 카드 행동 뒤 3·6·9번째 보스 턴에 플레이어 하수인과 영웅 각각에 1 피해를 주고, 이후 남은 적 하수인이 공격한다.

## Implementation

### I01. 적 카드 선택·시전·대상 평가

- Related Files:
  - `packages/game-core/src/engine.ts` :: `resolveEnemyTurn`, `playEnemyCard`, `selectEnemyCard`, `scoreEnemyCard`, `selectEnemySpellTarget`, `applySpellEffect` — 적 턴 전체 실행; modify
  - `packages/game-core/src/types.ts` :: `EnemyBehaviorProfile`, `EnemyCombatRecord` — 기록 및 행동 성격 타입; read-only from T01
  - `packages/game-core/src/engine.test.ts` :: 적 카드·주문·타깃 테스트; modify

#### Details

- **Signatures & Types**:
  ```typescript
  function resolveEnemyTurn(run: RunState): RunState;
  function playEnemyCard(run: RunState, handInstanceId: string): RunState;
  function selectEnemyCard(battle: BattleState, enemy: EnemyDefinition): CardInstance | null;
  function scoreEnemyCard(card: CardDefinition, battle: BattleState, enemy: EnemyDefinition): number;
  function selectEnemySpellTarget(effect: SpellEffect, battle: BattleState): string | undefined;
  function applySpellEffect(run: RunState, effect: SpellEffect, targetId?: string, caster: PlayerSide = "player"): RunState;
  ```
- **Execution Flow / Logic**:
  1. Validate `activeSide === "enemy"`. Set enemy maximum mana to 10 and current mana to `min(10, current + 1)`. Draw one card from enemy draw pile. When empty, clone the original 30-card `enemyStarterDeck` with fresh unique IDs, seeded-shuffle it, and continue drawing.
  2. When enemy hand is already at 10, select the lowest-priority card by `scoreEnemyCard` (tie-break through `battle.rngState`), discard it, then draw one. Do not pause for player input.
  3. Repeatedly select an affordable and legal card while hand has a candidate and board capacity permits. A card's cost is deducted once. Respect the shared five-minion cap and resolve all battlecry, summon, death, draw, heal, buff, and damage effects. Stop immediately if either hero reaches zero.
  4. Score for lethal damage first, removing a minion that threatens lethal or has high attack second, and survival/healing when enemy hero is low. Otherwise favor filling an empty board and using available mana. Apply `enemy.tactics.profile` as a deterministic score bias: aggressor/hunter favor cheap damage; summoner favors filling board; controller/drain favor useful buff/heal; board-clear/ravager favor removal/high-impact cards. Break equal scores with seeded RNG; never raise stats or invent card effects.
  5. Interpret card effect sides relative to caster: `enemyHero`/`enemyMinion` mean opponent targets; `playerHero`/`playerMinion` mean own targets. For single-target damage, if `battle.playerBoard.length > 0`, choose a player minion and never choose player hero; select a lethal/high-attack minion first, then lower health. Only target player hero if board is empty. Healing and buffs target the enemy's own hero/board.
  6. After all card actions, if the encounter is a boss and `battle.turnNumber % 3 === 0`, deal 1 damage to every player minion and the player hero, remove dead minions and resolve their death effects, and record one `boss-area` event. Then perform enemy minion attacks; each existing ready minion attacks once, choosing a player minion if any remain and the player hero only if the board is empty. Minions summoned this turn cannot attack.
  7. Remove scripted `EnemyAction` selection, normal-enemy charge attacks, and old boss charge attacks from this flow. The 3·6·9 boss area pattern is the sole scheduled enemy ability. Begin the next player turn using the existing `startPlayerTurn` behavior.
- **Error & Exception Handling**: Internal AI skips cards with insufficient mana, full-board summons, or unavailable legal targets. Invalid externally requested player actions retain current `GameRuleError` behavior. Any terminal hero result ends enemy resolution immediately and must not continue attacks or start a new player turn.
- **State Transition & Return**: `endPlayerTurn` resolves one complete enemy turn using only serialized state and seeded RNG, then restores player mana/draw/attack-ready state exactly as before.

### I02. Engine regression cases

- Related Files:
  - `packages/game-core/src/engine.test.ts` :: `enemy turns, rewards, and run progression` suite — replace scripted-action expectations with equivalent card-AI scenarios; modify

#### Details

- Assert proactive affordable minion play, multiple legal plays until mana/board limit, exact mana spent, one draw and mana recovery, hand overflow auto-discard, and no card play when unaffordable.
- Assert minions cannot attack the player hero while any player minion remains; they attack the player hero after the board is empty; attack once only; newly summoned minions wait a turn.
- Assert targeted enemy damage spells hit a player minion whenever available and hit the hero only on an empty board. Assert own-side heal/buff targets the enemy.
- Assert boss area effect triggers on turns 3/6/9 only, after card play and before minion attacks; deals 1 to each player unit and hero, never damages enemy units, resolves deaths, and ends immediately on hero defeat.
- Assert no normal enemy charge or legacy fixed hero-damage action is executed.

## Acceptance Criteria

- [ ] Enemy turns consist of resource refresh/draw, strategic card play, boss area pattern when due, minion attacks, then player turn.
- [ ] AI target restrictions match the selected minion-first rule for attacks and targeted damage spells.
- [ ] Enemy uses no numerical stat bonuses and all random ties/deck operations are repeatable for a fixed RNG state.

## Validation

- `npm.cmd test --workspace @board-game/game-core -- src/engine.test.ts` — engine cases pass, including seeded repeatability and all target rules.
- `npm.cmd run build --workspace @board-game/game-core` — core engine and types compile.

## Commit Message

```text
feat(game-core): play enemy turns with card AI

Plan: 2026-10-22-enemy-card-ai-victory-flow
Phase: P01-enemy-combat-and-victory-ui
Task: T02-enemy-card-ai-engine

- Spend enemy mana on tactical card plays
- Enforce minion-first attack and spell targeting
- Add periodic boss area damage after card plays
```

## Progress

- [x] 구현 완료
- [x] 검증 통과
- commit: pending

