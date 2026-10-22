# Task: T05 적 차지 준비 신호

## Status: done

## Goal
플레이어가 적의 강한 공격 준비를 감지할 수 있도록 적 영웅 초상화와 보드에 약한 시각 신호만 표시한다. 구체 행동·피해량·남은 턴 수는 노출하지 않는다.

## Decision Summary
- 게임 상태의 `battle.pendingEnemyCharge` 유무만 시각화한다. 텍스트·아이콘·숫자·도구 설명으로 적의 다음 행동이나 발동 시점을 공개하지 않는다.
- 기존 보드 동작과 입력은 유지하고 reduced-motion 환경에서는 반복 애니메이션을 멈춘다.

## Implementation

### I01. 비언어적 차지 신호

- Related Files:
  - `apps/web/src/components/GameBoard.tsx` :: `GameBoard` — modify; charge class 전달
  - `apps/web/src/components/HeroPanel.tsx` :: `HeroPanel` — modify; 적 영웅 portrait cue
  - `apps/web/src/styles/board.css` :: `.enemy-charge-warning`, `.hero-enemy` animation — modify
  - `apps/web/src/components/GameBoard.test.tsx` :: board state rendering — modify

#### Details
- **Signatures & Types**:
  ```typescript
  export function GameBoard(props: GameBoardProps): ReactElement;

  export function HeroPanel(props: {
    hero: HeroState;
    side: PlayerSide;
    artKey: string;
    name: string;
    targetable: boolean;
    onSelectTarget(targetId: string): void;
  }): JSX.Element;
  ```
- **Execution Flow / Logic**:
  1. `GameBoard`에서 `Boolean(battle.pendingEnemyCharge)`를 계산해 battle board에 `enemy-charge-warning` class를 적용한다.
  2. 적 영웅의 `.hero-portrait-wrap`에만 붉은-금빛 가장자리 맥동을 표시한다. 플레이어 영웅과 보드 입력에는 영향을 주지 않는다.
  3. 대기 차지의 `damage`, `target`, `turnsRemaining`을 DOM text/ARIA label/data attribute에 넣지 않는다. 현재 턴에서 차지가 발동한 뒤 상태가 null이 되면 신호가 제거된다.
  4. CSS `@media (prefers-reduced-motion: reduce)`에서 애니메이션을 끄되 정적인 강조 테두리는 유지한다.
- **Test Scenarios**:
  - `pendingEnemyCharge`가 null/missing이면 board warning class가 없다.
  - charge가 있을 때 warning class가 있고, 기존 영웅 초상화와 적 이름이 유지된다.
  - HTML에 피해량·대상·남은 턴 숫자 또는 적 행동 설명이 추가되지 않는다.

### I02. 보스 차지 광역 피해 표시

- Related Files:
  - `apps/web/src/game/combatEffects.ts` :: `collectCombatEffectEvents` — modify; 보스 차지 해제 시 피해 이벤트 추가
  - `apps/web/src/game/combatEffects.test.ts` :: end-turn resolution cases — modify

#### Details
- `action.type === "end-turn"`이고 `previous.battle.pendingEnemyCharge != null`이었으며 `next.battle.pendingEnemyCharge == null`이고 보스 enemy kind의 damage 변화가 확인되면 charge가 해제된 것이다. `!= null`은 기존 저장 상태에서 필드가 없는 경우도 안전하게 처리한다.
- 보스 차지 해제 시 `next`에서 체력이 감소한 플레이어 하수인 각각과 플레이어 영웅을 대상으로 `effectKind: "damage"`, `assetCardId: null`, source `{ kind: "hero", side: "enemy" }` 이벤트를 만든다. 0 피해였던 대상을 애니메이션에 넣지 않는다.
- 기존 `CombatEffectLayer`의 null asset fallback(`impact.png`)과 target anchor를 사용한다. 이 Task에서는 `CombatEffectEvent` public shape 및 사용자 액션 흐름을 바꾸지 않는다.
- 적 직접 영웅 공격과 하수인 개별 공격이 함께 실행된 경우 기존 공격 이벤트를 보존하고, 차지 AoE도 중복 없이 별도 target 별 이벤트로 표시한다.
- 테스트: charge state가 pending에서 null로 전환되며 감소한 hero/minion health에 각각 이벤트 한 개, 피해 없는 대상에는 이벤트 없음, 정상 end-turn에는 charge 이벤트 없음.

## Acceptance Criteria
- [ ] 적 차지가 준비 중일 때만 보드와 적 초상에 약한 시각 신호가 표시된다.
- [ ] 신호는 행동 종류·피해량·정확한 발동 시점을 공개하지 않는다.
- [ ] 보스 차지 해제 때 피해를 받은 영웅과 하수인 각각에 공통 충격 연출이 표시된다.
- [ ] reduced-motion, 모바일 보드 레이아웃, 기존 타깃 클릭 동작이 유지된다.

## Validation
- `npm run test --workspace @board-game/web -- src/components/GameBoard.test.tsx` — charge 유무 표시와 정보 비노출 검증 통과.
- `npm run build --workspace @board-game/web` — TypeScript와 Vite 빌드 통과.

## Commit Message
```text
feat(web): show subtle enemy charge cues

Plan: 2026-10-22-card-art-adaptive-enemy-ai
Phase: P01-card-art-and-combat-ai
Task: T05-enemy-charge-cue

- Add a restrained visual charge warning to the enemy portrait
- Keep enemy attack details hidden and honor reduced motion
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: feat(web): show subtle enemy charge cues

