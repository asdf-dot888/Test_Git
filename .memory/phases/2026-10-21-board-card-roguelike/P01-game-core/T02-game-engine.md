# Task: T02 게임 엔진과 카드 카탈로그

## Status: done

## Goal
30종 카드, 플레이어·적 전투, 12전투/3페이즈 런 진행을 UI·API와 분리된 순수 TypeScript 상태 전이로 구현해, 동일 입력과 seed가 동일한 게임 결과를 만들게 한다.

## Decision Summary
- `.memory/decisions/2026-10-21-board-card-roguelike.md`의 규칙을 그대로 따른다. 엔진은 React, Express, Cosmos SDK를 import하지 않는다.
- 모든 무작위 행동은 저장 가능한 `rngState`를 갱신하는 seeded PRNG로 결정한다. 카드 복사 제한 2, 필드 5, 손패 10, 플레이어 영웅 HP 30, 전투 시작 마나 5→턴마다 최대치 +1(10 cap)을 적용한다.

## Implementation

### I01. 도메인 타입 및 카드/적 데이터 정의
- Related Files:
  - `packages/game-core/src/types.ts` :: `CardDefinition`, `CardInstance`, `HeroState`, `MinionState`, `BattleState`, `RunState`, `EnemyDefinition`, `RewardState` — 전체 직렬화 도메인; new
  - `packages/game-core/src/catalog.ts` :: `CARD_CATALOG`, `STARTER_DECK_CARD_IDS`, `NORMAL_ENEMIES`, `BOSSES` — 게임 데이터; new
  - `packages/game-core/src/index.ts` :: public exports — 외부 사용 공개; modify

#### Details
- **Signatures & Types**:
  ```typescript
  export type CardKind = "minion" | "spell";
  export type RewardTier = "normal" | "boss";
  export interface CardDefinition {
    id: string; name: string; kind: CardKind; cost: number;
    description: string; artKey: string; rewardTier: RewardTier;
    minion?: { attack: number; maxHealth: number; effect?: MinionEffect };
    spellEffects?: SpellEffect[];
  }
  export interface CardInstance { instanceId: string; cardId: string }
  export interface HeroState { id: "player" | "enemy"; health: number; maxHealth: number }
  export interface MinionState {
    instanceId: string; cardId: string; owner: "player" | "enemy";
    attack: number; health: number; maxHealth: number;
    summonedTurn: number; hasAttacked: boolean;
  }
  export interface BattleState {
    battleId: string; turnNumber: number; activeSide: "player" | "enemy";
    playerHero: HeroState; enemyHero: HeroState;
    playerMana: { current: number; max: number };
    hand: CardInstance[]; drawPile: CardInstance[]; discardPile: CardInstance[];
    playerBoard: MinionState[]; enemyBoard: MinionState[];
    enemyId: string; rngState: number; status: "active" | "playerWon" | "playerLost";
    pendingDiscardBeforeDraw?: boolean;
  }
  export interface RunState {
    runId: string; seed: number; nextInstanceNumber: number;
    phase: 1 | 2 | 3; encounterInPhase: 0 | 1 | 2 | 3;
    completedBattles: number; status: "active" | "victory" | "defeat";
    deck: CardInstance[]; starterDeck: CardInstance[];
    battle: BattleState | null; pendingReward: RewardState | null;
    encounters: Array<{ phase: 1 | 2 | 3; kind: "normal" | "boss"; enemyId: string; status: "pending" | "active" | "complete" }>;
  }
  export interface EnemyDefinition {
    id: string; name: string; kind: "normal" | "boss"; maxHealth: number;
    actions: EnemyAction[]; artKey: string;
  }
  export type EnemyAction =
    | { kind: "heroDamage"; amount: number }
    | { kind: "summon"; cardId: string }
    | { kind: "bossEffect"; effectId: string; amount: number };
  ```
- `SpellEffect` exact union: `{kind:"damage"; amount:number; target:"enemyHero"|"enemyMinion"}`, `{kind:"heal"; amount:number; target:"playerHero"|"playerMinion"}`, `{kind:"summon"; cardId:string; count:number}`, `{kind:"buff"; attack:number; health:number; target:"playerMinion"}`, `{kind:"draw"; count:number}`. Target-required effects cannot resolve without a valid selected target.
- `MinionEffect` exact union: `{kind:"battlecrySummon"; cardId:string; count:number}`, `{kind:"battlecryBuff"; attack:number; health:number; target:"self"|"otherFriendly"}`, `{kind:"deathSummon"; cardId:string; count:number}`. Effects cannot bypass mana, board capacity, or turn rules.
- `CARD_CATALOG` contains exactly 30 unique definitions: 20 minions and 10 spells. Each card has a unique `id`, cost 0–10, nonempty name/description/art key, and coherent optional fields. Ten or more may be marked `boss` tier; remaining are `normal`.
- `STARTER_DECK_CARD_IDS` expands to exactly 30 instances, exactly 15 card IDs with two copies each; use exactly 20 minion instances and 10 spell instances. Store this immutable original set in `RunState.starterDeck`; `RunState.deck` begins as a separate copy. Rewards add instances to `deck`, respect a maximum two copies per card ID in the run deck, and do not change `starterDeck`.
- `NORMAL_ENEMIES` contains exactly 6 definitions; `BOSSES` exactly 3, one for each phase. Ordinary AI actions contain hero damage and summon options; boss action lists include at least one `bossEffect` unique to that boss.

### I02. Deterministic state transition functions
- Related Files:
  - `packages/game-core/src/engine.ts` :: `createRun`, `startBattle`, `playMinion`, `castSpell`, `attackWithMinion`, `endPlayerTurn`, `resolveEnemyTurn`, `chooseReward`, `skipReward`, `advanceRun` — pure game logic; new
  - `packages/game-core/src/random.ts` :: `nextRandom`, `shuffle` — serializable seeded random; new
  - `packages/game-core/src/errors.ts` :: `GameRuleError` — rule validation errors; new
  - `packages/game-core/src/engine.test.ts` :: game rule tests; new

#### Details
- **Signatures & Types**:
  ```typescript
  export function createRun(seed: number): RunState;
  export function startBattle(run: RunState, enemyId: string): RunState;
  export function playMinion(run: RunState, handInstanceId: string): RunState;
  export function castSpell(run: RunState, handInstanceId: string, targetId?: string): RunState;
  export function attackWithMinion(run: RunState, attackerId: string, targetId: string): RunState;
  export function discardBeforeDraw(run: RunState, handInstanceId: string): RunState;
  export function endPlayerTurn(run: RunState): RunState;
  export function resolveEnemyTurn(run: RunState): RunState;
  export function chooseReward(run: RunState, cardId: string): RunState;
  export function skipReward(run: RunState): RunState;
  export function advanceRun(run: RunState, nextSeed: number): RunState;
  ```
- Functions take immutable `RunState`, return a new state, and throw `GameRuleError` with stable codes for invalid action, insufficient mana, invalid target, max board, max copies, wrong turn, or terminal run.
- `createRun` creates the fixed 30-card `starterDeck` and an independent initial `deck` copy, a 12-entry `encounters` list (3 random normal enemy IDs followed by that phase's boss for each of 3 phases), and immediately starts encounter 1. It displays no route choices.
- `startBattle` marks the next encounter active, clears hand/board/discard, shuffles the current run deck into `drawPile`, deals 3 cards, sets player hero to 30 and enemy hero to its definition max, and sets current/max mana to 5. After normal encounter 3 the next encounter is that phase's boss; after each boss continue to next phase; after phase 3 boss win, status becomes `victory` and battle is null.
- Player turn start increments max mana by 1 (cap10) after battle turn 1 and refills current mana to max; draw one card. If hand is already 10 before draw, leave a pending `discardBeforeDraw` state that requires selecting one card from hand; after discard, draw one. Unplayed cards otherwise remain in hand at end turn.
- Playing a minion consumes cost, removes hand instance, creates a board instance with printed attack and full health, and moves the card to the correct pile when removed. A minion cannot attack until a later player turn and can attack once. Attack damages only target; no retaliation. Player may target enemy minions while any exist, otherwise enemy hero. Enemy minions mirror this target rule.
- `castSpell` checks target against that card's `SpellEffect`; if target required, missing/invalid target fails without state mutation. Full board invalidates summon; it never overfills the five-slot lane.
- End player turn resolves one hidden seeded random enemy action from currently valid actions (hero damage or summon; no summon if enemy lane full), then surviving enemy minions act by the same minion rules, then begins next player turn. Enemy action selection is not surfaced in `RunState` UI fields.
- When draw pile is empty, create fresh `CardInstance` IDs for all 30 entries in immutable `starterDeck`, shuffle those instances using the saved seeded RNG, and append them to the remaining draw pile before drawing. Leave hand, board, and discard pile untouched; this intentionally makes a new copy of the original starter set even when its previous instances remain elsewhere. Acquired reward cards remain in `deck` and enter each new battle's initial shuffle, but are not part of this mid-battle refill. Keep the refill deterministic from `rngState` and serializable.
- `BattleState.pendingDiscardBeforeDraw` records a full-hand turn draw; `discardBeforeDraw` moves the selected hand instance to discard and completes the draw. Extra cards drawn by spell effects while the hand is full are burned to discard.
- On normal win set pending normal reward with 3 eligible normal-tier cards; on boss win set 3 boss-tier choices. Filter IDs already at 2 copies. `chooseReward` adds a new `CardInstance`; `skipReward` adds none. After each fight restore player HP to 30 and reset next encounter mana to 5; preserve deck for all 3 phases. Defeat clears active battle and marks run `defeat`.
- **Execution Flow / Logic**:
  1. Validate run status, actor, target, costs, card copies, and lane/hand capacity.
  2. Clone affected nested arrays/objects; never mutate input run.
  3. Apply action and move cards between hand/board/discard exactly once.
  4. Evaluate hero HP and battle/run/phase transitions.
  5. Return JSON-serializable state with updated RNG seed.

## Acceptance Criteria
- [x] Catalog counts, IDs, costs, stats and card-copy rules satisfy the confirmed decision.
- [x] A seeded run progresses through 9 normal encounters and 3 bosses, ending on defeat or final boss victory.
- [x] Mana, draw/hand, minion, spell, AI and reward rules match the decision document.
- [x] Engine has no UI, browser, Express, or Cosmos imports and never mutates prior state.

## Validation
- `npm run test --workspace @board-game/game-core` — deterministic unit cases pass for every state transition and listed edge case.
- `npm run build --workspace @board-game/game-core` — emits ESM and declaration files.
- `npm run lint --workspace @board-game/game-core` — no TypeScript/ESLint errors.

## Commit Message
```text
feat(game-core): add deterministic card battle engine

Plan: 2026-10-21-board-card-roguelike
Phase: P01-game-core
Task: T02-game-engine

- Define 30 card and 9 enemy catalog
- Implement seeded battle, turn, reward, and run transitions
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: `477cd19`
