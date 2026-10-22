# Task: T04 상황 적응형 적 AI

## Status: done

## Goal
일반 적과 보스가 고유 전투 성향과 현재 전장에 따라 기존 행동 중 더 유리한 행동을 선택하게 하고, 위협 하수인 제거·즉시 영웅 처치·적별 차지 공격을 구현한다.

## Decision Summary
- 기본 체력·공격력과 적 주요 행동 1회/턴을 유지한다. 적 행동은 사전 노출하지 않고 deterministic `rngState` 기반 tie-break로 비슷한 선택 사이에 변화를 준다.
- 플레이어 영웅의 즉시 처치가 가능하면 최우선한다. 차지 준비 상태는 `BattleState`에 직렬화하여 API 저장/불러오기 후에도 유지한다.

## Implementation

### I01. 적 성향 및 차지 상태 모델

- Related Files:
  - `packages/game-core/src/types.ts` :: `EnemyDefinition`, `BattleState`, new `EnemyBehaviorProfile`, `EnemyChargeState` — modify
  - `packages/game-core/src/catalog.ts` :: `NORMAL_ENEMIES`, `BOSSES` — modify; 성향과 charge 설정을 전부 선언
  - `packages/game-core/src/engine.ts` :: `beginEncounter` — modify; 새 전투 차지 상태 초기화
  - `packages/game-core/src/engine.test.ts` :: catalog contract — modify

#### Details
- **Signatures & Types**:
  ```typescript
  export type EnemyBehaviorProfile =
    | "aggressor" | "summoner" | "hunter" | "controller"
    | "drain" | "board-clear" | "ravager";

  export type EnemyChargeTrigger =
    | "hero-at-half" | "board-empty" | "board-wide" | "hero-low-and-board-empty" | "turn-four";

  export interface EnemyTactics {
    profile: EnemyBehaviorProfile;
    chargeTrigger: EnemyChargeTrigger;
    chargeDelayTurns: 1 | 2;
    chargeDamage: number;
  }

  export interface EnemyChargeState {
    turnsRemaining: number;
    damage: number;
    target: "hero" | "board-and-hero";
  }

  export interface BattleState {
    // all current fields remain unchanged
    pendingEnemyCharge?: EnemyChargeState | null;
  }

  export interface EnemyDefinition {
    // all current fields remain unchanged
    tactics: EnemyTactics;
  }
  ```
- **Catalog Mapping / Values**:
  - `bandit-scout`: `aggressor`, `hero-at-half`, delay 1, damage 6.
  - `crypt-crawler`: `summoner`, `board-wide`, delay 2, damage 8.
  - `mire-hag`: `controller`, `hero-at-half`, delay 2, damage 6.
  - `fallen-sentinel`: `hunter`, `board-empty`, delay 1, damage 10.
  - `plague-herald`: `summoner`, `board-wide`, delay 1, damage 8.
  - `night-stalker`: `hunter`, `hero-low-and-board-empty`, delay 2, damage 10.
  - `boss-blood-matron`: `drain`, `hero-at-half`, delay 1, damage 10.
  - `boss-grave-king`: `board-clear`, `board-wide`, delay 1, damage 12.
  - `boss-void-titan`: `ravager`, `turn-four`, delay 2, damage 14.
  - Triggers: `hero-at-half` means player health `<= floor(maxHealth / 2)`; `board-empty` means player board length 0; `board-wide` means player board length `>= 3`; `hero-low-and-board-empty` means player health `<= floor(maxHealth / 2)` and board length 0; `turn-four` means battle turn `>= 4`.
  - Each charge damage above is new attack data only; do not alter the existing enemy `maxHealth`, existing `actions`, or card stats. Normal charge targets only `playerHero`; boss charge targets player hero and every player minion for the listed damage.
- **Backward Compatibility**:
  - `pendingEnemyCharge` is optional and nullable so existing serialized runs load. Treat missing exactly as `null` in engine logic.
  - `beginEncounter` writes `pendingEnemyCharge: null` in every newly created BattleState.
  - No API DTO, auth, or database changes; persistence already stores `RunState` as JSON.

### I02. Action scoring and enemy target selection

- Related Files:
  - `packages/game-core/src/engine.ts` :: `eligibleEnemyActions`, `applyEnemyAction`, `resolveEnemyMinionAttacks`, `resolveEnemyTurn`, new `scoreEnemyAction`, `selectEnemyAction`, `selectEnemyMinionTarget`, `resolveEnemyCharge` — modify
  - `packages/game-core/src/engine.test.ts` :: enemy turn tests — modify

#### Details
- **Execution Flow / Logic**:
  1. If a charge is already pending, decrement `turnsRemaining` at the beginning of the enemy turn. While the value remains above zero, the enemy spends its main action preparing; when it reaches zero, apply its charge and clear the state. Do not select another main action on a turn spent preparing or releasing the charge. Existing enemy minions still attack during these turns.
  2. If no charge is pending, check whether any legal `heroDamage`/boss action plus ready enemy minion face damage guarantees `damage >= playerHero.health`. If so, choose the lethal hero action before summons or nonlethal control effects.
  3. If no immediate lethal action exists and the profile's charge trigger is true, set `pendingEnemyCharge` with `turnsRemaining = chargeDelayTurns`, configured damage, and target (`hero` for normals, `board-and-hero` for bosses); skip the regular main action for this turn. Charge preparation itself is therefore the enemy's one main action. If no charge starts, score eligible catalog actions (summon remains ineligible at five enemy minions).
  4. Action score: `summon` gets +50 on an empty enemy board, +25 at board size 1, and -100 when full. `heroDamage` gets +40 for `aggressor`, +25 otherwise, and +30 when player health is at/below one third. A relevant boss effect gets +60: `blood-tithe` when enemy hero is below half health, `bone-storm`/`void-pulse` when player board has at least two minions; otherwise it gets +10. A `hunter` gets +25 to `heroDamage` when the player board is empty. A `controller` gets +30 to summon when player board has at least three minions and enemy board fewer than two. A `summoner` gets +25 to summon while enemy board has fewer than three minions.
  5. Choose a highest-scoring action. If multiple actions tie, select among ties with `pickIndex` and update `battle.rngState`; do not introduce nondeterministic `Math.random`.
  6. Resolve enemy minions in board order, one attack each as today. For each attacker select an available player minion by this stable sort: (a) killable by attacker before nonkillable, (b) higher attack first, (c) lower remaining health first, (d) lower current board index first. If no player minion exists, attack hero.
  7. Boss area damage affects every player minion and player hero; remove dead minions via existing `removeDeadMinions`. If player hero reaches zero, use existing defeat flow and stop resolution. Keep enemy action details out of `BattleState`; only pending charge state is persisted. No new intent/action preview is added.
- **Test Scenarios**:
  - Every one of the six normal enemies and three bosses declares a valid tactics profile, trigger, delay, and positive damage.
  - A lethal heroDamage action is chosen ahead of a legal summon/control action and ends the run.
  - A full enemy board never chooses summon; summoner/control profiles switch to another eligible action.
  - Minion targeting chooses a killable target first, then highest attack, then lowest health, then leftmost slot.
  - Profile action choices respond to empty/wide boards, low health, and boss effect relevance; tied actions are reproducible for the same `rngState`.
  - Each trigger stores an unseen charge state, survives structured clone/JSON round trip, observes its configured delay, and deals direct normal damage or boss area damage to hero and all minions.
  - Dead minions are removed and death effects still run; lethal charge ends the run before player turn begins.
  - Old battle JSON without `pendingEnemyCharge` resolves like `null` and does not throw.

## Acceptance Criteria
- [ ] Nine enemies each have a distinct configured behavior/charge profile (profiles may be shared where listed).
- [ ] No base enemy/card stats or number of main actions per enemy turn are increased.
- [ ] Enemy selection is situational, seeded/reproducible, and prioritizes guaranteed player-hero lethal.
- [ ] Enemy minions attack high-threat friendly minions first, preferring kills.
- [ ] Normal charge damages only the player hero; boss charge damages player hero and every player minion.
- [ ] Pending charge survives JSON persistence and old runs lacking the optional field remain playable.

## Validation
- `npm run test --workspace @board-game/game-core -- src/engine.test.ts` — catalog, scoring, targeting, charge timing, defeat and legacy-state tests pass.
- `npm run build --workspace @board-game/game-core` — strict TypeScript build passes.

## Commit Message
```text
feat(game-core): add adaptive enemy tactics and charged attacks

Plan: 2026-10-22-card-art-adaptive-enemy-ai
Phase: P01-card-art-and-combat-ai
Task: T04-adaptive-enemy-ai

- Score enemy actions against current board and hero health
- Persist per-enemy charge attacks and prioritize lethal plays
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: feat(game-core): add adaptive enemy tactics and charged attacks

