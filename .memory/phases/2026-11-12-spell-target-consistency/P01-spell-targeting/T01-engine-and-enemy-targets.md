# Task: T01 주문 실행과 컴퓨터 대상 표시 수정

## Status: done

## Goal
일반·어려움의 컴퓨터와 플레이어 모두 피해 주문의 대상 제한을 지키고, 컴퓨터의 피해·행동 기록·예고·연출이 같은 대상을 가리키게 한다.

## Decision Summary
- 사용자 승인 범위는 같은 원인의 주문 대상 오류 전체이다. 영웅 전용은 상대 영웅만, 하수인 전용은 상대 하수인만 허용한다. 과거 컴퓨터 주문 하수인 우선 정책은 이 제한보다 우선하지 않는다.
- 카드 수치·난수 방식·저장/API 스키마·일반 하수인 공격은 유지한다. 운명의 파편의 기존 하수인 우선 전술도 유지한다. 명시적인 잘못된 대상은 다른 대상에 적용하지 않는다.

## Implementation

### I01. 공통 피해 대상 검증과 적용
- Related Files:
  - `packages/game-core/src/engine.ts` :: `applySpellEffect`, `castSpellWithResolution`, 새 내부 함수 `validateDamageSpellTarget` — 피해 대상 검증과 실행; modify
  - `packages/game-core/src/types.ts` :: `SpellEffect`, `BattleState`, `MinionState`, `HeroState` — 기존 타입; read-only
  - `packages/game-core/src/catalog.ts` :: `CARD_BY_ID` — 실제 카드 효과; read-only
  - `packages/game-core/src/errors.ts` :: `GameRuleError` — 기존 INVALID_TARGET 오류; read-only

#### Details
- **Signatures & Types**:
  ```typescript
  type TargetedDamageEffect = Extract<SpellEffect, { kind: "damage" | "randomDamage" | "cleave" }>;
  function validateDamageSpellTarget(battle: BattleState, effect: TargetedDamageEffect, targetId: string | undefined, caster: PlayerSide): void;
  function applySpellEffect(run: RunState, effect: SpellEffect, targetId?: string, caster?: PlayerSide, deferDefeat?: boolean, resolved?: { amount?: number; transferredCardInstanceId?: string }): RunState;
  export function castSpellWithResolution(run: RunState, handInstanceId: string, targetId?: string): SpellCastResolution;
  export function castSpell(run: RunState, handInstanceId: string, targetId?: string): RunState;
  ```
- **Data & Schema Fields**:
  - `PlayerSide`: `player | enemy`; applySpellEffect의 caster 기본값은 player, deferDefeat 기본값은 false.
  - `damage`: kind, amount:number, target:`enemyHero | enemyMinion`. 여기서 enemy는 시전자의 상대이다.
  - `randomDamage`: kind, min:0, max:5. `cleave`: kind, amount:number, target:`enemyMinion`.
  - `BattleState`: playerBoard/enemyBoard:`MinionState[]`, playerHero/enemyHero:`HeroState`, playerMana/enemyMana:`{current:number;max:number;temporary:number}`, hand/discardPile/enemyHand/enemyDiscardPile:`CardInstance[]`, rngState:number.
  - `CardInstance`: instanceId:string, cardId:string(CARD_BY_ID 참조). `MinionState`: instanceId:string, cardId:string, owner:PlayerSide, attack/health/maxHealth/summonedTurn:number, hasAttacked:boolean, statusEffects?:CombatStatusEffect[]. 생존 조건은 해당 전장에 존재하고 health > 0이다.
  - `HeroState`: id:`player | enemy`, health/maxHealth:number, statusEffects?:CombatStatusEffect[]. 주문용 별칭은 player-hero/enemy-hero이다. 저장 필드를 추가하지 않는다.
  - `SpellCastResolution`: run:RunState, effects:`{effectIndex:number;kind:SpellEffect['kind'];targetId:string|null;amount?:number}[]` 유지.
- **Execution Flow / Logic**:
  1. Precondition & Validation: caster에 따라 상대 전장을 정한다. 공통 검증은 아래 표를 사용한다. castSpellWithResolution의 기존 효과 사전 검사 루프에서 피해 계열 검증을 수행하고, applySpellEffect의 피해 계열 실행 직전에도 같은 함수를 호출한다. 중복된 randomDamage 전용 검증은 이 함수로 대체한다. 기타 주문의 기존 검증은 유지한다.
  2. Core Processing: damage가 enemyHero이면 전장 유무와 무관하게 player 시전은 dealDamageToEnemyHero, enemy 시전은 dealDamageToPlayerHero(..., deferDefeat)를 호출한다. enemyMinion이면 검증된 상대 하수인 health를 amount만큼 감소시키고 기존 removeDeadMinions를 실행한다. randomDamage는 검증 후에만 pickIndex를 호출하며, 명시적 영웅 별칭이면 상대 영웅, 아니면 지정 하수인에 적용한다. cleave의 중앙·양옆 계산과 죽음 처리 순서는 유지한다.
  3. Error & Exception Handling: 불법 대상은 기존 `fail('INVALID_TARGET', ...)`로 GameRuleError를 발생시킨다. HTTP 계층은 변경하지 않는다. castSpellWithResolution은 cloneRun 후 검증하고, 손패 제거·마나 소모 전에 실패한다. 원본 run과 rngState는 보존한다.
  4. State Transition & Return: 정상 시전의 카드 이동·마나·openingHandRedraw 소모·resolved.amount·승패 판정은 기존 경로를 유지한다. 피해 적용을 위해 직접 영웅 health를 감소시키지 않는다(방어도/패배 지연 처리를 우회하지 않기 위해).

| 효과 | 허용 targetId | 누락 시 | 거부 대상 |
| :--- | :--- | :--- | :--- |
| damage/enemyHero, player | undefined, `enemy`, `enemy-hero` | 기존 즉시 시전 허용 | 모든 하수인, player/player-hero, 빈 문자열, 임의 문자열 |
| damage/enemyHero, enemy | undefined, `player`, `player-hero` | 내부 호환 허용 | 모든 하수인, enemy/enemy-hero, 빈 문자열, 임의 문자열 |
| damage/enemyMinion 또는 cleave | 생존 상대 하수인 instanceId | 거부 | 영웅, 아군, 없는/죽은 하수인 |
| randomDamage, player | `enemy-hero` 또는 생존 상대 하수인 instanceId | 거부 | 아군, 없는 대상, 정규화되지 않은 `enemy` |
| randomDamage, enemy | `player-hero` 또는 생존 상대 하수인 instanceId | 거부 | 아군, 없는 대상 |

### I02. 컴퓨터 사용 가능 판정·대상 선택·기록
- Related Files:
  - `packages/game-core/src/engine.ts` :: `selectEnemySpellTarget`, `isEnemyCardTargetPlayable`, `scoreEnemyCard`, `playEnemyCard`, `planHardEnemyTurn`, `resolveEnemyTurnWithPlayback` — 합법적인 대상에 따른 행동; modify
  - `packages/game-core/src/types.ts` :: `EnemyCombatRecord`, `EnemyTurnPlaybackStep` — 기록 형식; read-only

#### Details
- **Signatures & Types**:
  ```typescript
  function selectEnemySpellTarget(effect: SpellEffect, battle: BattleState, difficulty?: RunDifficulty): string | undefined;
  function isEnemyCardTargetPlayable(card: CardDefinition, battle: BattleState): boolean;
  function scoreEnemyCard(card: CardDefinition, battle: BattleState, enemy: EnemyDefinition, difficulty?: RunDifficulty, completedBattles?: number): number;
  function playEnemyCard(run: RunState, handInstanceId: string, deferDefeat?: boolean): RunState;
  export function resolveEnemyTurnWithPlayback(run: RunState): EnemyTurnResolution;
  ```
- **Data & Schema Fields**:
  - `RunDifficulty`: normal/hard, 기본 normal. `RunState.completedBattles:number`가 1 이상이고 hard이면 planHardEnemyTurn이 사용된다.
  - cast-spell 기록: type:`cast-spell`, cardId:string, instanceId:string, handSlot:number, effects:`{kind:SpellEffect['kind'];targetId:string|null;amount?:number;transferredCardInstanceId?:string}[]`.
  - 각 `EnemyTurnPlaybackStep`: action:EnemyCombatRecord, beforeRun:RunState, presentationRun:RunState. 스키마 변경 없이 피해 영웅의 targetId 값을 명시한다.
- **Execution Flow / Logic**:
  1. damage/enemyHero는 selectEnemySpellTarget에서 항상 `player-hero`를 반환한다. damage/enemyMinion은 생존 playerBoard 중 기존 처치 가능성·공격력·체력 정렬로 고른다. randomDamage는 같은 기존 하수인 정렬을 유지하고, 생존 대상이 없으면 `player-hero`를 반환한다. cleave도 생존 playerBoard 중 기존 우선순위를 유지한다.
  2. isEnemyCardTargetPlayable에 damage/enemyMinion의 생존 대상 필요 조건을 추가한다. cleave의 대상 존재 검사도 같은 생존 기준으로 맞춘다. 영웅 전용·randomDamage에는 하수인 존재 조건을 두지 않는다. isEnemyCardPlayable 및 playEnemyCard의 비용 소모 전 재검사를 유지하여 이미 죽은 하수인 대상으로 비용을 쓰지 않게 한다.
  3. scoreEnemyCard는 수정된 선택 결과를 사용한다. 영웅 주문에는 하수인 처치 점수가 적용되지 않고 기존 영웅 피해/치명타 점수가 적용되어야 한다. 기존 가중치 상수·난이도 보너스 수치·일반 하수인 행동은 변경하지 않는다. hard 탐색은 기존 isEnemyCardPlayable/applySpellEffect 경로를 그대로 사용한다.
  4. playEnemyCard의 기존 effects.push는 선택한 `player-hero`를 기록하게 된다. 피해가 없는 draw 등은 기존 null 기록을 유지한다. 다중 효과의 순서와 치명타 시 중단 동작은 유지한다.

### I03. 컴퓨터 예고·피해 연출을 명시적 영웅 ID와 연결
- Related Files:
  - `apps/web/src/game/combatEffects.ts` :: `enemySpellTarget`, `collectEnemyTurnEvents` — 영웅 앵커와 사망 효과 판정; modify
  - `apps/web/src/components/EnemyIntentPreview.tsx` :: `intentDetails` — 피해 대상 이름; modify
  - `apps/web/src/components/GameBoard.tsx` :: `intentTargetIds`, `intentHeroTarget` — 대상 강조; modify(이 Task는 intent 관련 부분만)

#### Details
- **Signatures & Types**:
  ```typescript
  function enemySpellTarget(battle: NonNullable<RunState['battle']>, effect: SpellEffect, targetId?: string): CombatAnchor;
  function intentDetails(step: EnemyTurnPlaybackStep): { title: string; description: string; target: string; artKey?: string };
  ```
- **Data & Schema Fields**: `CombatAnchor`의 관련 분기는 `{kind:'hero';side:PlayerSide}` 또는 `{kind:'minion';side:PlayerSide;slot:number}`. CombatEffectEvent의 target, damageTarget:`hero | minion`, soundCues:SoundEffectKind[], deathAnchors?:CombatAnchor[]가 일치해야 한다.
- **Execution Flow / Logic**:
  1. enemySpellTarget의 damage/randomDamage에서 targetId가 `player-hero`, battle.playerHero.id(`player`), 또는 누락이면 player hero 앵커를 반환한다. 이로써 이전 null 영웅 기록도 계속 읽는다. 그 외 ID는 기존 하수인 슬롯 처리로 보낸다. 다른 효과는 변경하지 않는다.
  2. collectEnemyTurnEvents의 `logged.targetId && !next.playerBoard.some(...)` 사망 조건을 수정한다. before의 playerBoard에 실제 존재한 해당 하수인이 after에서 사라졌을 때만 대상 사망을 추가한다. `player-hero`가 하수인 목록에 없다는 이유로 death를 추가하면 안 된다. 이미 있는 before/after 차이 기반 deathAnchors는 유지한다.
  3. intentDetails는 player-hero 및 `battle?.playerHero.id`를 내 영웅으로 표시한다. null 피해 기록(damage/randomDamage)은 기존 내부 기록의 영웅 의미로 해석하며 playerBoard 유무 조건을 제거한다. 명시적 하수인 ID는 기존 이름 표시를 유지한다. 다중 효과의 다른 설명은 그대로 둔다.
  4. GameBoard의 intentHeroTarget은 명시적 두 영웅 ID와 null damage/randomDamage 기록을 인식한다. 하수인 intentTargetIds는 실제 playerBoard에 있는 ID만 포함한다. 일반 공격·보스 영역 효과 처리는 그대로 둔다.

### I04. 회귀 테스트
- Related Files:
  - `packages/game-core/src/engine.test.ts` :: 기존 엔진 describe와 helper — 대상 제한 테스트 추가; modify
  - `apps/web/src/game/combatEffects.test.ts` :: `collectEnemyActionEffects` 테스트 — 영웅 피해·사망 효과 검증; modify
  - `apps/web/src/components/GameBoard.test.tsx` :: `GameBoard` describe — 적 의도 강조; modify
  - `apps/web/src/App.enemy-turn-playback.test.tsx` :: 기존 jsdom 테스트 — EnemyIntentPreview와 실제 턴 재생 검증; modify
  - `apps/web/src/game/gameActions.test.ts` :: 기존 reducer 테스트 — 오류 시 상태 보존 검증; modify

#### Details
- 엔진 테스트 helper는 이미 `activeBattle(run):BattleState`, `asEnemyTurn(run):RunState`, `instance(id,cardId):CardInstance`, `minion(overrides:Partial<MinionState>):MinionState`, `copyRun(run):RunState`가 있다. minion 기본값은 ash-wolf/player/공격8/체력4/소환턴0/미공격이다. 상대 하수인은 owner를 enemy로 지정한다.
- `[shadow-bolt, soul-storm, eclipse]` 각각 player 시전 및 enemy normal/hard 시전에서 상대 하수인 체력이 그대로이고 상대 영웅만 2/4/8 피해를 받는다. soul-storm의 draw 부가 효과는 유지한다. 원본 run은 불변이다.
- 하수인 전용 `[soul-lance, meteor-shard, warrior-hammerfall, assassin-shuriken, demonist-hellfire]`는 player의 유효/잘못된 대상과 적어도 enemy 일반·어려움의 공유 카드 2종을 검증한다. 클래스 카드가 실제 적 덱에 나오도록 덱 생성 규칙을 바꾸지 않는다.
- enemy 테스트는 `createRun(seed,'warrior',difficulty)`를 asEnemyTurn으로 만들고 turnNumber=1, enemyBoard=[], playerArmor=0, enemyMana={current:CARD_BY_ID.get(cardId)!.cost,max:10,temporary:0}으로 구성한다. enemyHand=[], enemyDrawPile=[시험 instance], enemyDiscardPile=[]로 두어 턴 시작에 시험 카드 한 장만 드로우되게 한다. 마나는 정확히 한 번 시전할 만큼만 주어 추가 드로우 카드의 연속 시전을 막는다. 영혼 폭풍의 draw 검증에는 enemyDrawPile의 두 번째에 별도 soul-lance instance를 넣어 재섞기와 구분한다. 하수인 전용 빈 전장에서는 시험 카드가 손패에 남고 enemyMana.current가 그대로이며 피해/시전 action이 없어야 한다. 카드별 피해는 해당 instanceId의 cast-spell step 전후 상태를 비교한다.
- 어려움 탐색을 실제로 타게 하려면 completedBattles=1을 설정한다. turnNumber=1로 추가 마나 회복을 피하고 일반 적을 사용해 보스 패턴이 테스트를 오염시키지 않게 한다. 다른 minion 공격은 enemyBoard=[]로 차단한다.
- randomDamage는 상대 하수인이 있을 때 기존 하수인 우선, 없을 때 player-hero 기록을 확인한다. 고정 시드·같은 입력의 결과가 같고 amount가 0~5임을 검증한다. 플레이어의 invalid target은 rngState·손패·마나·openingHandRedraw를 포함한 원본 run 전체가 그대로인지 비교한다.
- player 영웅 주문은 targetId 미지정, enemy, enemy-hero를 허용하고, 아군/적 하수인/임의 문자열은 INVALID_TARGET이다. minion 전용과 cleave는 누락·영웅·아군·없는 대상에서 동일 오류이다.
- `reduceGameAction`에 restore-run 후 잘못된 cast-spell을 보내면 이전 run이 유지되고 error가 `현재 선택할 수 없는 대상입니다.`이며 새 combatEffects가 생기지 않는지 확인한다.
- 컴퓨터 연출: playerBoard에 하수인이 남아 있는 shadow-bolt의 명시적 player-hero 기록과 legacy null 기록을 사용한다. target hero/player, damageTarget hero, 사망 없음, 내 영웅 예고 및 hero-player의 is-intent-target을 검증한다. 실제 하수인이 죽는 soul-lance 기록에서는 하수인 death가 유지된다. randomDamage 0 피해는 miss이고 하수인 사망 효과가 없다.
- 단일 실제 resolveEnemyTurnWithPlayback 결과의 action/beforeRun/presentationRun을 collectEnemyActionEffects와 EnemyIntentPreview에 전달하여 실행과 표시를 함께 확인한다. 기존 fake timer 테스트에서는 비동기 연출을 act/advanceUntil로 진행한다.

## Acceptance Criteria
- [x] 영웅 전용 주문은 하수인이 있어도 양쪽 시전자에서 영웅만 타격한다.
- [x] 하수인 전용 주문은 빈 전장에서 컴퓨터가 사용하지 않으며 player 불법 시전은 자원을 소모하지 않는다.
- [x] normal과 completedBattles>0인 hard 모두 합법적 대상만 선택한다.
- [x] 명시적 영웅 기록이 예고·강조·연출에서 영웅을 가리키고 잘못된 하수인 사망 효과가 없다.
- [x] 기존 randomDamage/cleave 피해·다중 효과·방어도·일반 하수인 공격은 유지된다.

## Validation
루트 PowerShell에서 아래 순서로 실행한다. `npm.cmd`는 PowerShell의 npm.ps1 실행 정책 영향을 피하면서 같은 npm 명령을 실행한다.
- `npm.cmd run build --workspace @board-game/game-core` — 코어 타입 검사 및 dist 갱신 성공.
- `npm.cmd test -- --config apps/web/vite.config.ts packages/game-core/src/engine.test.ts apps/web/src/game/combatEffects.test.ts apps/web/src/game/gameActions.test.ts apps/web/src/components/GameBoard.test.tsx apps/web/src/App.enemy-turn-playback.test.tsx` — 수정 회귀 및 기존 테스트 통과. 실행 중 확인: 루트에는 Vitest 설정이 없어 원래 명령은 MainMenu의 `__APP_VERSION__` 정의를 읽지 못했다. 기존 웹 Vite 설정을 명시하여 실제 빌드와 같은 상수 정의로 검증한다. 공통 테스트 설정 파일은 변경하지 않는다.
- `npm.cmd run build --workspace @board-game/web` — TypeScript 및 Vite 빌드 성공.
- `npm.cmd exec -- eslint packages/game-core/src/engine.ts packages/game-core/src/engine.test.ts apps/web/src/game/combatEffects.ts apps/web/src/game/combatEffects.test.ts apps/web/src/game/gameActions.test.ts apps/web/src/components/EnemyIntentPreview.tsx apps/web/src/components/GameBoard.tsx apps/web/src/components/GameBoard.test.tsx apps/web/src/App.enemy-turn-playback.test.tsx` — 해당 파일 lint 성공.
- 기존 정책을 기대한 테스트가 실패하면 주문 시나리오의 기대값만 새 규칙으로 갱신하고 일반 공격 테스트를 약화시키지 않는다. 환경 실패는 코드 통과로 처리하지 않는다.

## Commit Message
```text
fix(game): enforce spell target restrictions for both casters

Plan: 2026-11-12-spell-target-consistency
Phase: P01-spell-targeting
Task: T01-engine-and-enemy-targets

- Validate damage spell targets before spending resources
- Align enemy spell selection, records, intent and effects
- Cover hero-only and minion-only spells in both difficulties
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: pending

## Validation Results
- 2026-11-12: 코어 TypeScript 빌드 및 웹 TypeScript/Vite 빌드 성공.
- 기존 웹 Vite 설정을 명시한 대상 테스트 5개 파일, 190개 테스트 전체 통과.
- 청사진에 지정한 소스/테스트 파일 ESLint 통과, git diff --check 통과.
- 기존 Soul Bargain 테스트는 하수인 전용 meteor-shard의 영웅 타격을 기대했다. 생존 하수인을 fixture에 추가하고 하수인 피해·영웅 무피해를 검증하도록 수정했다. 마나 획득 및 두 주문 순서 검증은 유지했다.
- 최초에는 node_modules가 없어 tsc를 실행하지 못했다. npm ci의 샌드박스 다운로드가 EACCES로 실패하여 승인된 재실행으로 잠금 파일 기준 의존성을 설치했다. package.json/package-lock.json 변경 없음.
- 실제 검증 환경 Node v26.13.0/npm 11.20.0에서 통과했다. 프로젝트의 Node 24 요구 및 node 22 개발 의존성 불일치는 이번 Task에서 수정하지 않았다.
- 웹 빌드의 기존 MSAL 정적/동적 import 중복 및 500kB 초과 청크 경고는 남아 있다. 이번 주문 수정 범위 밖이며 빌드는 성공했다.
- 실기기/시각적 수동 검증은 수행하지 않았다. T02에서 플레이어 입력 경로를 다룬다.

## Handoff
완료 시 이 Task를 done으로 표시하고 커밋, phase 진행률 1/2 갱신 후 `.memory/current.md`를 같은 폴더의 `T02-player-spell-selection.md`로 전진한다. 기존 사용자 변경을 포함하지 않고 관련 파일만 스테이징한다.
