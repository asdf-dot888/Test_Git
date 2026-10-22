# Task: T03 카드 기반 전투 애니메이션

## Status: done

## Goal
하수인이 공격할 때 카드 프레임과 하수인 그림이 함께 대상에게 이동하고, 주문을 사용할 때 해당 주문의 그림이 손패에서 대상까지 이동하도록 전투 이펙트를 교체한다.

## Decision Summary
- 공격 이벤트는 전장 하수인 앵커에서 출발해 카드 프레임과 같은 하수인 그림을 함께 이동시킨다. 주문 이벤트는 손패 카드 앵커에서 출발해 해당 주문 그림을 카드 프레임으로 이동시킨다.
- 기존 타격 피드백, 이벤트 종료 정리, `prefers-reduced-motion` 지원을 보존한다. 손패 외부의 직접 영웅 피격은 카드가 없으므로 현재 공통 impact 연출을 유지한다.

## Implementation

### I01. 이벤트별 렌더 형태와 이동 레이어

- Related Files:
  - `apps/web/src/game/combatEffects.ts` :: `CombatEffectEvent`, `pushEvent`, `collectCombatEffectEvents` — modify; 이벤트 source 종류와 카드 ID 유지
  - `apps/web/src/components/CombatEffectLayer.tsx` :: `EffectSprite`, `CombatEffectLayer`, `anchorPoint` — modify; 카드/하수인 조합 애니메이션
  - `apps/web/src/styles/board.css` :: `.combat-effect-*`, `@keyframes combat-effect-flight`, reduced-motion 규칙 — modify
  - `apps/web/src/game/combatEffects.test.ts` :: 이벤트 수집 테스트 — new
  - `apps/web/src/components/CombatEffectLayer.test.tsx` :: 이동 스프라이트 렌더 테스트 — new

#### Details
- **Signatures & Types**:
  ```typescript
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

  export function CombatEffectLayer(props: {
    events: CombatEffectEvent[];
    onComplete(eventId: number): void;
  }): ReactElement | null;
  ```
- **Execution Flow / Logic**:
  1. `collectCombatEffectEvents`는 기존 reducer 전후 상태를 사용한다. player `attack`과 enemy turn의 각 공격은 공격자 `cardId` 및 전/후 board slot을 가진 `attack` 이벤트로 만든다. 주문 `cast-spell`은 각 spell effect마다 기존 카드 ID/손패 source/목표 anchor를 보존한다.
  2. 손패 source 이벤트는 카드 그림과 장식 프레임이 결합된 이동 스프라이트 하나를 만든다. minion source의 `attack` 이벤트는 카드 프레임 스프라이트와 같은 카드 PNG로 만든 하수인 초상 스프라이트를 짝으로 만들어 같은 source-target 경로로 이동시킨다.
  3. 목적지의 피해/회복/버프 타격은 이동과 분리한 짧은 impact class로 재생하고, 기존 이벤트 완료 callback을 호출해 UI session 이벤트를 정리한다.
  4. 직접 피격처럼 source card ID가 없는 이벤트에는 `/art/effects/impact.png`를 사용한다. 카드 전용 `/art/effects/{cardId}.png`는 더 이상 요청하지 않는다. 파일 정리는 하지 않고 기존 asset을 보존한다.
  5. 빠른 화면 변경이나 unmount에서는 requestAnimationFrame/timeout을 취소한다. reduced-motion에서는 이동 시간을 줄이고 모든 event를 완료 처리한다.
- **Test Scenarios**:
  - minion attack 이벤트는 attacker card ID와 정확한 전장 앵커를 가진다.
  - 적 턴의 각 적 하수인 공격은 적 앵커에서 변경된 플레이어 목표 앵커까지 각각 이벤트를 만든다.
  - spell damage/heal/buff 이벤트는 손패 앵커에서 올바른 목표로 향하고 그 spell `cardId`를 보존한다.
  - 빈 source/hero impact는 카드 식별자 없이 공통 impact fallback을 사용한다.
  - overlay는 공격 이벤트에 쌍 스프라이트, 주문 이벤트에 카드 프레임 스프라이트를 렌더하고 `onComplete`를 한 번만 호출한다.

## Acceptance Criteria
- [ ] 양측 하수인 공격은 카드와 하수인 그림이 함께 이동한다.
- [ ] 공격/회복/버프 주문은 해당 주문 그림이 카드 프레임으로 이동해 목표에 닿는다.
- [ ] 타격 feedback, event cleanup, reduced-motion 및 빠른 unmount 동작이 유지된다.
- [ ] 카드가 없는 적의 직접 피격은 기존 impact 자산으로 표시된다.

## Validation
- `npm run test --workspace @board-game/web -- src/game/combatEffects.test.ts src/components/CombatEffectLayer.test.tsx` — 이벤트 source/target, paired sprite, cleanup 검증 통과.
- `npm run build --workspace @board-game/web` — UI 타입 및 빌드 통과.

## Commit Message
```text
feat(web): animate card and minion art during combat

Plan: 2026-10-22-card-art-adaptive-enemy-ai
Phase: P01-card-art-and-combat-ai
Task: T03-card-combat-animation

- Fly card art from hand for spells and card plays
- Animate a card frame and minion portrait together during attacks
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: feat(web): animate card and minion art during combat

