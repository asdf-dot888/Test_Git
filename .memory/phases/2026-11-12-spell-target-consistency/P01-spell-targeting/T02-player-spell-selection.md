# Task: T02 플레이어 주문 대상 선택과 입력 경로 일치

## Status: pending

## Goal
운명의 파편과 수확자의 칼날을 플레이어가 정상적으로 하수인에게 사용할 수 있게 하고, 클릭·터치·드래그에서 주문의 대상 제한과 사용 가능 상태가 일치하게 한다.

## Decision Summary
- 운명의 파편은 선택한 상대 영웅/하수인에게 0~5 피해, 수확자의 칼날은 선택한 상대 하수인 4 및 양옆 2 피해이다. 대상 자체를 무작위로 고르지 않는다.
- T01이 엔진의 불법 대상 검증과 컴퓨터 표시를 완료한 상태에서 실행한다. 카드 수치·API·저장 구조·일반 공격과 기존 영웅 주문 즉시 시전은 유지한다.

## Implementation

### I01. 플레이어의 수동 대상 선택 분류 통합
- Related Files:
  - `apps/web/src/game/spellTargeting.ts` :: `PlayerSpellSelection`, `getPlayerSpellSelection` — 선택 모드 판단 공통 함수; new
  - `apps/web/src/components/GameBoard.tsx` :: `spellTargetSide`, `targetSide`, `canTargetEnemyHeroWithSpell`, `canSelectCard` — 대상 활성화; modify
  - `packages/game-core/src/types.ts`, `packages/game-core/src/catalog.ts` :: `CardDefinition`, `SpellEffect`, `CARD_BY_ID` — 기존 카드 정의; read-only
  - `apps/web/src/components/MinionLane.tsx`, `MinionCard.tsx`, `HandPanel.tsx`, `HeroPanel.tsx` — 현재 대상/disabled props 소비 방식; read-only

#### Details
- **Signatures & Types**:
  ```typescript
  import type { CardDefinition } from '@board-game/game-core';
  export type PlayerSpellSelection = 'enemy-minion' | 'enemy-character' | 'friendly-minion' | null;
  export function getPlayerSpellSelection(card: CardDefinition | undefined): PlayerSpellSelection;
  ```
- **Data & Schema Fields**:
  - CardDefinition의 관련 필드: id:string, kind:`minion | spell`, cost:number, spellEffects?:SpellEffect[]. 인수가 undefined이거나 minion이거나 수동 선택 효과가 없으면 null이다.
  - `SpellEffect` 선택 분류: damage/target enemyMinion 및 cleave → enemy-minion, randomDamage → enemy-character, heal/target playerMinion 및 buff → friendly-minion. damage/enemyHero와 heal/playerHero 등 즉시 효과는 null이다.
  - 현재 카드 중 수동 대상 효과가 여러 종류인 카드는 없다. 기존 `.find`와 같이 효과 순서대로 최초의 지원되는 수동 선택 효과를 사용한다. 영웅 피해+draw인 soul-storm은 null이다. boss 전용 자동 선택 효과를 새 수동 선택 모드로 바꾸지 않는다.
  - `GameBoardProps` 관련 값: selectedCardInstanceId:string|null, selectedAttackerId:string|null, targetMode:`none | spell | attack | hero-power`, isResolving:boolean, actionsDisabled?:boolean. 공개 props와 저장 구조를 변경하지 않는다.
- **Execution Flow / Logic**:
  1. Precondition & Validation: selectedCardInstanceId로 battle.hand의 CardInstance를 찾고 CARD_BY_ID로 정의를 얻는다. 없는 카드는 분류 null이다. helper는 상태나 카드 정의를 변경하지 않는 순수 함수이다.
  2. Core Processing: GameBoard의 기존 spellTargetSide 함수에 있는 중복 효과 탐색을 제거하고 helper 결과를 사용한다. enemy-minion/enemy-character는 enemy 진영, friendly-minion은 player 진영, null은 선택 진영 없음이다. 반환 mapping을 작은 로컬 함수로 유지하거나 targetSide 계산에 넣되 효과 종류 판정은 helper 한 곳에만 둔다.
  3. `canTargetEnemyHeroWithSpell`은 선택 카드 분류가 enemy-character인지로 정한다. 해당 주문은 적 하수인이 있어도 영웅 선택 버튼을 표시한다. enemy-minion에는 영웅 버튼이 없어야 한다. hero-power/일반 공격 분기는 유지한다.
  4. `canSelectCard(instance)`는 enemy-minion이면 생존 enemyBoard가 있어야 true, friendly-minion이면 생존 playerBoard가 있어야 true, enemy-character와 null이면 기존처럼 true이다. HandPanel이 이미 처리하는 마나 부족·전장 수 제한·턴 잠금 검사를 중복 구현하지 않는다.
  5. Error & Exception Handling: helper는 예외를 던지지 않는다. 불법 시전의 최종 검증은 T01의 엔진이 수행한다. 손패/전장이 바뀐 뒤 오래된 대상 ID가 전달되어도 엔진 INVALID_TARGET을 통해 처리한다.
  6. State Transition & Return: 선택은 기존 session.targetMode와 selectedCardInstanceId로 관리한다. MinionLane은 targetSide가 side와 같을 때 is-targetable을 설정하고 spell 모드의 다른 진영 버튼을 disabled로 만든다. 이 기존 컴포넌트 계약을 이용하여 두 주문의 누락을 복구한다.

### I02. 카드 선택·영웅 ID 변환·드래그 실행 연결
- Related Files:
  - `apps/web/src/App.tsx` :: `GameSessionView.selectCard`, `selectTarget`, `handleDropInteraction` — 사용자 입력; modify
  - `apps/web/src/game/gameActions.ts` :: `GameAction`, `reduceGameAction`, `ruleMessage` — 실행/오류 경로; read-only
  - `apps/web/src/components/dragInteractions.ts` :: `DragPayload`, `DropTarget` — 드래그 형식; read-only
  - `packages/game-core/src/engine.ts` :: `castSpellWithResolution` — T01의 검증; read-only

#### Details
- **Signatures & Types**:
  ```typescript
  // App.tsx 컴포넌트 내부 기존 콜백
  const selectCard: (instanceId: string) => void;
  const selectTarget: (targetId: string) => void;
  const handleDropInteraction: (payload: DragPayload, target: DropTarget) => void;
  type DragPayload = { kind: 'card' | 'minion'; instanceId: string };
  type DropTarget = { kind: 'slot'; slotIndex: number }
    | { kind: 'minion'; side: 'player' | 'enemy'; instanceId: string }
    | { kind: 'hero'; side: 'player' | 'enemy' };
  ```
- **Data & Schema Fields**:
  - GameAction의 기존 분기: `{type:'select-card';instanceId:string}`, `{type:'cast-spell';instanceId:string;targetId?:string}`, `{type:'cancel-selection'}`. targetId를 생략할 때 exactOptionalPropertyTypes에 맞게 필드를 생략한다.
  - 화면 HeroPanel의 대상 ID는 `battle.enemyHero.id === 'enemy'`이다. randomDamage 실행은 `enemy-hero` 별칭을 요구하므로 기존 정규화를 유지한다.
  - T01의 엔진 계약: damage/enemyHero는 targetId 생략/enemy/enemy-hero 허용, 하수인 ID 거부. damage/enemyMinion·cleave는 생존 상대 하수인만 허용. randomDamage는 enemy-hero 또는 생존 상대 하수인만 허용. 불법 대상에서 원본 run·손패·마나·난수가 보존된다.
- **Execution Flow / Logic**:
  1. selectCard의 수동 대상 효과 `.find`를 getPlayerSpellSelection으로 교체한다. 분류가 non-null이면 select-card를 dispatch, null이면 기존 즉시 cast-spell을 dispatch한다. minion 소환과 튜토리얼 허용 검사는 유지한다.
  2. selectTarget의 spell 분기에서 helper 결과가 enemy-character이고 targetId가 battle.enemyHero.id일 때만 enemy-hero로 바꾼다. 하수인 instanceId는 원형 그대로 전달한다. hero-power의 별도 정규화 및 일반 공격 분기는 유지한다.
  3. handleDropInteraction에서 카드가 주문이고 하수인에 드롭되면 기존처럼 그 하수인 instanceId를 전달한다. 잘못된 하수인에도 일단 엔진으로 전달되어 INVALID_TARGET 오류를 표시하는 기존 reducer 경로를 사용한다. 카드 설명과 다르게 영웅으로 재지정하거나 silently 시전하지 않는다. T01이 이 경로를 안전하게 처리한다.
  4. 적 영웅 드롭에서는 helper가 enemy-character인 경우 enemy-hero, 아니면 기존 enemyHero.id를 전달한다. 따라서 하수인 전용 주문을 영웅에 드롭하면 엔진이 거부하고 그림자 화살의 영웅 드롭은 성공한다. 대상 없는 다른 주문의 기존 드롭 동작은 변경하지 않는다.
  5. Error & Exception Handling: reduceGameAction이 GameRuleError를 `현재 선택할 수 없는 대상입니다.`로 표시한다. UI에서 별도 자원 차감/낙관적 피해 처리를 추가하지 않는다. 오류 시 새로운 피해 연출은 생성하지 않는다.
  6. State Transition & Return: 정상 선택은 기존 reducer와 sessionForAction에서 선택을 해제하고 combatEffects를 생성한다. 취소, 턴 잠금, 소환/공격 입력, 카드 상세 보기의 터치/길게 누르기 동작을 유지한다.

### I03. 실제 사용자 입력과 상태 변화 회귀 검증
- Related Files:
  - `apps/web/src/components/GameBoard.test.tsx` :: 기존 SSR 테스트 — 선택 가능한 대상과 손패 disabled; modify
  - `apps/web/src/App.interactions.test.tsx` :: 기존 jsdom describe — 카드 선택·터치·드래그 통합; modify
  - `apps/web/src/game/gameActions.test.ts` :: T01의 불법 시전 상태 보존 테스트 — 필요 시 UI 경계와 연결되는 사례 보완; modify
  - `apps/web/src/App.testUtils.ts` :: `renderWithTestAuth` — 공용 auth fixture; read-only
  - `apps/web/src/components/MinionLane.test.tsx`, `CardInspection.test.tsx`, `HeroPanel.test.tsx` — 관련 기존 동작 검증; read-only

#### Details
- helper 자체의 분류만 반복하는 새 테스트는 만들지 않는다. 실제 GameBoard 렌더와 App 시전을 통해 helper의 결과를 검증한다.
- 기존 GameBoard.test.tsx는 renderToStaticMarkup 기반이다. run=createRun(seed), battle.hand를 지정하고 마나 10, 생존 아군과 적 하수인을 각 1개 이상 만든다. 각 카드 선택 상태로 render하여 lane-enemy의 is-targetable/disabled 여부, lane-player의 비활성, hero-target-button 존재 여부를 실제 button 태그별로 비교한다. 문서 전체의 disabled 문자열 유무만 검사하지 않는다.
- 운명의 파편: 적 하수인 선택 가능+적 영웅 선택 가능+아군 선택 불가. 적 전장이 비어도 손패 카드 활성 및 영웅 선택 가능. 하수인의 hasAttacked/summonedTurn 값 때문에 피해 대상 선택이 막히면 안 된다.
- 수확자의 칼날: 적 하수인만 활성, 영웅 선택 없음, 적 전장이 비면 손패 카드 disabled. 영혼 창도 같은 하수인 전용 규칙, 생명의 실/룬의 파동은 기존 아군 대상 선택이 유지된다.
- App.interactions.test.tsx에는 `// @vitest-environment jsdom`, `makeReadySync(run):LocalRunController`, `enterActiveEncounter():void`, `renderWithTestAuth`가 있다. `renderWithTestAuth(<GameSessionView sync={sync}/>)` 후 enterActiveEncounter로 실제 게임 화면을 연다. afterEach가 cleanup/localStorage/globals를 복원한다.
- 테스트 run의 마나 10, enemyHero.health/maxHealth는 30 등 치명타를 피할 값, 대상 하수인 health/maxHealth는 10, hand는 시험 카드로 지정한다. 검증할 선택/피해가 발생하기 전에 적절한 전장 상태를 명시한다. 운명의 파편은 0 피해도 정상이므로 체력 감소만 성공 기준으로 삼지 말고 손패 제거·정확한 비용 2 소모·버림 카드·결과 기록/변경 상태를 확인한다.
- 클릭 운명의 파편→적 하수인: 대상 버튼 활성화와 시전 성공, 선택한 하수인만 0~5 감소, 다른 하수인·영웅 유지. 클릭 파편→적 영웅(적 하수인 있음)도 성공하며 하수인 유지. 각 시나리오는 독립 run/render로 연출 잠금의 영향을 분리한다.
- 터치는 pointerDown/pointerUp의 pointerType:'touch' 뒤 실제 click 활성화를 발생시켜 파편 선택→하수인 선택 경로를 검증한다. 이는 jsdom 이벤트 경로 검증이며 실기기 검증을 했다고 보고하지 않는다. 기존 길게 누르기 상세보기 테스트도 함께 통과해야 한다.
- 클릭 수확자의 칼날→중앙 하수인: 세 하수인의 체력을 10으로 두고 결과가 8/6/8이며 영웅은 불변인지 검증한다. 양끝 처리/사망 순서는 기존 엔진 테스트도 유지한다.
- 드래그는 기존 `application/x-ashen-expedition` MIME의 `{kind:'card',instanceId}` JSON을 반환하는 DataTransfer mock을 재사용한다. 적 minion은 `.battle-opponent .lane-slot.is-occupied`, 영웅은 `.hero-enemy`, 아군은 `.lane-player .lane-slot.is-occupied`에 drop한다.
- 파편 적 하수인/영웅 드롭과 칼날 하수인 드롭은 성공. 그림자 화살→하수인, 영혼 창/칼날→영웅, 파편→아군 드롭은 오류이며 손패·마나·영웅·하수인·rngState가 그대로이다. `sync.saveRun`은 타이머 저장도 호출할 수 있어 단순 미호출 검사를 피하고 저장된 run의 게임 상태 또는 reducer 결과를 비교한다.
- 그림자 화살의 카드 클릭 즉시 시전은 적 하수인이 있어도 영웅에게만 2 피해. 기존 튜토리얼, 아군 버프/치유 선택, 전체 공격, 소환 드래그가 유지된다.

## Acceptance Criteria
- [ ] 파편을 클릭·터치로 적 하수인에게 사용할 수 있고 적 하수인 존재 여부와 무관하게 영웅도 선택할 수 있다.
- [ ] 칼날은 적 하수인만 선택 가능하고 적 전장이 비면 사용할 수 없다.
- [ ] 화면 선택 모드와 손패 사용 가능 판단이 동일한 helper를 사용한다.
- [ ] 드래그의 불법 대상은 다른 대상에 적용되지 않고 자원을 소모하지 않는다.
- [ ] 그림자 화살 즉시 시전, 아군 주문, 영웅 능력, 일반 공격, 튜토리얼의 기존 정상 동작이 유지된다.
- [ ] 전체 빌드·테스트·lint가 통과하며 기존 사용자 변경을 보존한다.

## Validation
루트 PowerShell에서 순차 실행한다. npm.cmd는 PowerShell 실행 정책 영향을 피하기 위한 npm 실행 파일이다.
- `npm.cmd run build --workspace @board-game/game-core` — T01의 코어 dist를 최신으로 확보. 웹 패키지는 src가 아닌 dist를 import한다.
- `npm.cmd test -- apps/web/src/components/GameBoard.test.tsx apps/web/src/App.interactions.test.tsx apps/web/src/game/gameActions.test.ts apps/web/src/components/MinionLane.test.tsx apps/web/src/components/CardInspection.test.tsx apps/web/src/components/HeroPanel.test.tsx apps/web/src/App.tutorial.test.tsx` — 대상 선택/입력 및 인접 조작 회귀 테스트 통과.
- `npm.cmd run build` — 코어, API, leaderboard API, 웹 빌드 통과.
- `npm.cmd test` — 전체 테스트 통과. 관련 검사 통과 뒤 계획의 마지막 통합 확인으로 한 번 수행한다.
- `npm.cmd run lint` — 전체 lint 통과.
- `git diff --check` — 변경의 공백 오류 없음. 무관한 기존 변경에서 실패한 경우 파일과 원인을 보고하고 임의 수정하지 않는다.

## Commit Message
```text
fix(web): restore consistent spell target selection

Plan: 2026-11-12-spell-target-consistency
Phase: P01-spell-targeting
Task: T02-player-spell-selection

- Share player spell selection rules across app and board
- Restore minion selection for Fate Shard and Reaper Cleave
- Verify click, touch and drag targeting without invalid resource use
```

## Progress
- [ ] 구현 완료
- [ ] 검증 통과
- commit: pending

## Handoff
T01 완료가 전제이다. 성공 시 이 Task를 done으로 표시하고 커밋, phase 진행률 2/2와 완료 상태, 상위 Plan 완료 상태를 기록한다. `.memory/current.md`는 이 계획의 Active Task를 None(모든 Task 완료)으로 변경한다. 기존 변경된 EnemyHeroDefeatEffect.tsx, board.css, 무관한 memory 파일은 스테이징하지 않는다. 배포는 이 계획의 Task가 아니다.
