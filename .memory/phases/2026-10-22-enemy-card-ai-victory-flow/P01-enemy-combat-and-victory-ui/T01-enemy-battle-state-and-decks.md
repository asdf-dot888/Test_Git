# Task: T01 적 전투 상태와 덱 구성

## Status: done

## Goal

각 전투의 저장 가능한 `BattleState`에 적의 30장 덱, 손패, 드로우·버림 더미, 마나를 추가하고, 기존 저장본도 현재 전투 모델로 복구한다.

## Decision Summary

- 적은 플레이어와 동일한 3장 시작 손패, 턴당 1장 드로우, 손패 10장, 시작 마나 5 및 턴당 +1(최대 10), 보드 최대 5 규칙을 쓴다.
- 적 덱은 적 성격별 카드 가중치를 적용해 기존 카드 목록에서 매 전투 30장으로 무작위 구성한다. 같은 카드 최대 2장, 복구·셔플은 저장된 seeded RNG를 사용한다.
- 적 능력치와 카드 능력치는 바꾸지 않는다.

## Implementation

### I01. 저장 가능한 적 전투 상태

- Related Files:
  - `packages/game-core/src/types.ts` :: `BattleState`, `EnemyDefinition`, `EnemyTactics`, `EnemyCombatRecord` — 적 전투 상태, 성격 프로필, 시각 효과용 일시 기록; modify
  - `packages/game-core/src/engine.ts` :: `beginEncounter`, `createEnemyDeck`, `hydrateRunForCurrentBattle` — 새 전투 초기화 및 구형 저장 상태 복구; modify
  - `packages/game-core/src/catalog.ts` :: `NORMAL_ENEMIES`, `BOSSES` — 적별 덱 성격 연결; modify
  - `packages/game-core/src/engine.test.ts` :: 전투 초기화·재생성 테스트; modify

#### Details

- **Signatures & Types**:
  ```typescript
  export interface BattleState {
    // Existing fields remain.
    enemyMana: { current: number; max: number };
    enemyStarterDeck: CardInstance[];
    enemyHand: CardInstance[];
    enemyDrawPile: CardInstance[];
    enemyDiscardPile: CardInstance[];
    enemyTurnEvents?: EnemyCombatRecord[];
  }

  export type EnemyCombatRecord =
    | { type: "play-minion"; cardId: string; instanceId: string; handSlot: number; summonedIds: string[] }
    | { type: "cast-spell"; cardId: string; instanceId: string; handSlot: number; effects: Array<{ kind: "damage" | "heal" | "summon" | "buff" | "draw"; targetId: string | null }> }
    | { type: "attack"; cardId: string; attackerId: string; targetId: string }
    | { type: "boss-area"; damage: 1; targetMinionIds: string[]; targetHeroId: "player" };

  export function hydrateRunForCurrentBattle(run: RunState): RunState;
  ```
- **Data & Schema Fields**:
  - `BattleState.enemyMana`: `{ current: number; max: number }`; new battle defaults to `{ current: 5, max: 10 }`.
  - `enemyStarterDeck`: immutable 30-card composition used to refill the enemy draw pile after it empties.
  - `enemyHand`, `enemyDrawPile`, `enemyDiscardPile`: card instance arrays; initial hand is the first 3 shuffled cards, remaining 27 enter draw pile.
  - `enemyTurnEvents`: per-transition animation records. `reduceGameAction` consumes and removes these before publishing/saving the next `RunState`; they are not durable save data.
  - `EnemyDefinition.tactics.profile` remains the source of card-generation bias. Remove only charge-specific fields after T02 migrates their use; do not alter enemy IDs, portraits, or `maxHealth`.
- **Execution Flow / Logic**:
  1. `createEnemyDeck(enemy, seed)` scores all `CARD_CATALOG` cards and performs deterministic weighted selection until there are 30 instances, never selecting one card ID more than twice. Every score is positive. Aggressor/hunter profiles favor low-cost minions and damage; summoner favors minions and summon effects; controller/drain favor healing and buffs; board-clear/ravager favor removal and higher-cost boss cards.
  2. `beginEncounter` uses the current seeded RNG state, creates unique `enemy-card-*` instance IDs through the run instance counter, shuffles the generated deck, deals 3, writes the remaining 27 cards to `enemyDrawPile`, initializes enemy mana, and stores the unshuffled `enemyStarterDeck`.
  3. `hydrateRunForCurrentBattle` clones only when normalization is needed. If an active legacy battle lacks enemy zones, create a deterministic themed enemy deck from `battle.rngState`, deal an opening hand, preserve player state and both boards, initialize enemy mana to 5/10, remove obsolete `pendingEnemyCharge`, and keep the updated RNG state. New state passes through unchanged.
  4. `reduceGameAction` invokes `hydrateRunForCurrentBattle(action.run)` when processing `restore-run`, so existing server saves can continue without a reset.
- **Error & Exception Handling**: If a profile has no valid candidates, fail with the existing `GameRuleError("INVALID_ACTION", ...)`; deck generation must never return fewer than 30 cards.
- **State Transition & Return**: New and restored active battles always have all enemy zones and 5/10 mana. Existing player state, run progression, and seeded repeatability remain intact.

### I02. Persist and validate enemy zones

- Related Files:
  - `apps/api/src/routes/runRoutes.ts` :: `battleSchema`, `runSchema`, PUT normalization — accept old snapshots and validate new fields; modify
  - `apps/api/src/routes/runRoutes.test.ts` :: save and validation scenarios; modify

#### Details

- Add optional-for-legacy Zod fields `enemyMana`, `enemyStarterDeck`, `enemyHand`, `enemyDrawPile`, and `enemyDiscardPile` to `battleSchema`. Validate mana integers in `0..10`; card arrays with the existing `cardInstanceSchema`; deck/discard arrays maximum 100, hand maximum 10. Do not require `enemyTurnEvents` in the API because it is removed before saving.
- The existing GET route returns stored snapshots as-is; compatibility is performed by `hydrateRunForCurrentBattle` on client restore. New PUTs must retain every normalized enemy field when constructing the `RunState` from parsed data.
- Keep current route error response (`400 INVALID_BODY`) for malformed values and keep legacy `turnTimer` optional validation unchanged.

## Acceptance Criteria

- [ ] Every new battle contains a deterministic, 30-instance enemy starter deck with no card ID repeated more than twice, 3 opening cards, 5/10 mana, and 27 draw cards.
- [ ] Same run seed and encounter produce the same enemy deck, hand, and RNG continuation.
- [ ] Restoring an old active battle preserves player state and initializes missing enemy state; restoring a modern state does not regenerate its deck.
- [ ] API accepts a legacy battle without enemy fields and round-trips the complete modern enemy state.

## Validation

- `npm.cmd test --workspace @board-game/game-core -- src/engine.test.ts` — deck seeding, zones, and legacy hydration pass.
- `npm.cmd test --workspace @board-game/api -- src/routes/runRoutes.test.ts` — legacy and modern run schema cases pass.
- `npm.cmd run build --workspace @board-game/game-core` — exported state and helper types compile.

## Commit Message

```text
feat(game-core): add enemy deck and battle state

Plan: 2026-10-22-enemy-card-ai-victory-flow
Phase: P01-enemy-combat-and-victory-ui
Task: T01-enemy-battle-state-and-decks

- Persist enemy hand, deck zones, and mana
- Generate seeded personality-weighted 30-card enemy decks
- Normalize active legacy battles on restore
```

## Progress

- [x] 구현 완료
- [x] 검증 통과
- commit: pending

