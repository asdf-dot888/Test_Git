# Task: T01 전투 이펙트 이벤트

## Status: done

## Goal
게임 규칙 결과와 별도로 화면이 재생할 일회성 전투 이펙트 이벤트를 생성한다. 카드별 자산 식별자와 보드 상의 출발/도착 위치를 제공하고, 이 데이터는 `RunState` 저장 내용에 포함하지 않는다.

## Decision Summary
- 이펙트 이벤트는 브라우저 세션의 `GameSession`에서만 유지한다. 기존 `RunState`, API DTO, Cosmos 문서는 변경하지 않는다.
- 플레이어/적 하수인 공격과 주문 효과는 행동을 유발한 카드 ID를 사용한다. 카드 없이 발생한 적의 직접 영웅 피해는 공통 `impact` 자산을 사용한다.
- 애니메이션은 전투 규칙 reducer가 정상 완료한 다음 화면에서 재생하며, 실패한 행동은 이벤트를 만들지 않는다.

## Implementation

### I01. 화면 전투 이벤트 타입과 추출 함수

- Related Files:
  - `apps/web/src/game/combatEffects.ts` :: `CombatEffectEvent`, `CombatAnchor`, `collectCombatEffectEvents`; new
  - `packages/game-core/src/types.ts` :: `RunState`, `BattleState`, `MinionState`; read-only
  - `packages/game-core/src/catalog.ts` :: `CARD_BY_ID`; read-only

#### Details
- **Signatures & Types**:
  ```typescript
  import type { RunState, PlayerSide } from "@board-game/game-core";
  import type { GameAction } from "./gameActions.js";

  export type CombatEffectKind = "attack" | "damage" | "heal" | "buff" | "summon" | "draw" | "impact";
  export type CombatAnchor =
    | { kind: "hand"; slot: number }
    | { kind: "hero"; side: PlayerSide }
    | { kind: "minion"; side: PlayerSide; slot: number };
  export interface CombatEffectEvent {
    id: number;
    assetCardId: string | null;
    effectKind: CombatEffectKind;
    source: CombatAnchor;
    target: CombatAnchor;
  }
  export function collectCombatEffectEvents(
    previousRun: RunState,
    nextRun: RunState,
    action: GameAction,
    firstEventId: number,
  ): CombatEffectEvent[];
  ```
- **Data & Schema Fields**:
  - `assetCardId`: 카드별 이미지 파일을 식별하는 `CardDefinition.id`; 적의 카드 없는 직접 피해는 `null`.
  - `effectKind`: 공격/주문 효과 분류. `impact`는 적의 카드 없는 직접 피해에 쓴다.
  - `source`와 `target`: 화면에 항상 렌더되는 손패/영웅/필드 슬롯의 위치. 하수인 슬롯은 해당 면의 왼쪽부터 0~4이며, 이미 제거된 사망 하수인도 옛 슬롯 위치를 사용할 수 있다.
  - 이벤트 ID는 현재 `GameSession`의 `nextCombatEffectId`에서 순차 증가한다. DB 저장용 필드는 아니다.
- **Execution Flow / Logic**:
  1. 행동 성공 후 이전 `RunState`, 새 `RunState`, `GameAction`을 받아 이벤트를 산출한다.
  2. `play-minion`은 손패 출발점과 새 하수인 또는 소환/전투의 함성 대상 슬롯을 연결한다. 효과가 없는 소환은 `summon` 이펙트로 표시한다.
  3. `cast-spell`은 손패의 주문 `cardId`를 읽고 카드 효과마다 타깃을 결정한다. 적 영웅/플레이어 영웅/적 하수인/아군 하수인/필드 소환/손패 드로우는 각각 영웅/하수인 슬롯/손패 앵커를 쓴다.
  4. `attack`은 공격 하수인의 카드 ID와 공격 전 공격자 슬롯을 출발점으로 사용하고, 공격 대상의 이전 슬롯 또는 적 영웅 앵커를 도착점으로 사용한다.
  5. `end-turn`은 이전과 다음 보드를 비교해 새로 공격한 적 하수인마다 공격 이벤트를 만들고, 체력이 감소한 영웅/하수인 위치를 대상으로 설정한다. 적의 카드 없는 직접 영웅 피해는 `assetCardId: null`, `effectKind: "impact"`로 설정한다.
  6. 유효하지 않은 액션으로 게임-core 실행이 실패한 경우 추출 함수를 호출하지 않는다.

### I02. GameSession에 이벤트 수명주기 연결

- Related Files:
  - `apps/web/src/game/gameActions.ts` :: `GameAction`, `GameSession`, `reduceGameAction`, `sessionForRun`; modify
  - `apps/web/src/game/useGameSession.ts` :: `useGameSession`, 내부 dispatch; modify
  - `apps/web/src/App.tsx` :: `GameSessionView`; modify
  - `apps/web/src/components/GameBoard.tsx` :: `GameBoardProps`; modify

#### Details
- **Signatures & Types**:
  ```typescript
  interface GameSession {
    // 기존 필드 유지
    combatEffects: CombatEffectEvent[];
    nextCombatEffectId: number;
  }
  type GameAction =
    | /* existing variants */
    | { type: "clear-combat-effects" };
  ```
- `initialGameSession`은 `combatEffects: []`, `nextCombatEffectId: 1`로 시작한다. 새 run 복원/생성 시 오래된 이벤트는 지우되 ID 카운터는 세션에서 유일하도록 증가시킨다.
- 성공한 run 변경 액션은 `sessionForRun` 또는 동등한 단일 helper를 통해 `collectCombatEffectEvents` 결과를 세션에 넣는다. 이벤트를 만들지 않는 reward/run/menu 액션은 이벤트 목록을 비운다.
- `clear-combat-effects`는 이벤트 목록만 비우며 run 및 ID 카운터를 변경하지 않는다.
- `GameSessionView`에서 `GameBoard`로 이벤트 목록과 clear callback을 전달한다. `GameBoardProps`는 이벤트 시퀀스 수신에 필요한 필드만 추가한다.

### I03. 이벤트가 저장 run에 섞이지 않는지 확인

- Related Files:
  - `apps/web/src/game/useRunSync.ts` :: `saveRun`; read-only
  - `apps/web/src/game/useDemoRunSync.ts` :: `saveRun`; read-only
  - `apps/web/src/game/gameActions.ts` :: `GameSession`; modify

#### Details
- `saveRun`이 받는 값은 계속 `RunState`이며 `combatEffects`나 이벤트 ID를 포함하지 않는다.
- 새 run/원격 run restore 때 이벤트 목록을 초기화해 새로고침 후 재생되지 않게 한다.
- 유효한 테스트 수단은 브라우저에서 공격/주문/적 턴을 수행하고 이벤트 데이터가 매번 소비되어 비워지는지 확인하는 것이다. 테스트 파일 추가는 이 Task 범위에 넣지 않는다.

## Acceptance Criteria
- [ ] 하수인 공격과 플레이어 주문으로 올바른 카드 ID, 종류, 출발/도착 앵커를 갖는 이벤트가 생성된다.
- [ ] 적 턴의 하수인 공격은 적 카드 ID를 사용하고 적의 직접 영웅 피해는 공통 이펙트 이벤트를 만든다.
- [ ] 보드 슬롯은 사망한 대상이 상태에서 제거돼도 올바른 애니메이션 위치를 제공한다.
- [ ] 유효하지 않은 액션은 이벤트를 생성하지 않고, 이벤트 상태는 `RunState`나 API 저장 payload에 들어가지 않는다.

## Validation
- `npm run build` — TypeScript 및 웹/API/game-core 프로덕션 빌드가 통과해야 한다.
- 브라우저 수동 확인: 하수인 공격, 대상 지정 주문, 영웅 대상 주문, 적 직접 피해 상황에서 이벤트 종류/카드 ID/앵커를 확인한다.

## Commit Message
```text
feat(game): add transient combat effect events

Plan: 2026-10-22-combat-effects-and-encounter-confirmation
Phase: P01-combat-flow
Task: T01-combat-effect-events

- Derive card-backed combat events from successful game actions
- Keep event state outside persisted run data
```

## Progress
- [x] Implementation complete
- [x] Validation passed (`npm.cmd run build`)
- commit: pending
