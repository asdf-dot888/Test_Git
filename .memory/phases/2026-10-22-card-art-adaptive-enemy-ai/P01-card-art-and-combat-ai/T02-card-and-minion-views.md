# Task: T02 카드 및 하수인 뷰

## Status: done

## Goal
손패와 보상 화면에서 카드 그림을 중앙 주요 영역에 크게 보여주고, 전장 하수인은 같은 그림을 액자형 토큰으로 보여줘 카드·캐릭터 외형을 연결한다.

## Decision Summary
- 아트 파일은 `/art/cards/{card.artKey}.png`를 사용한다. 비용·이름은 위쪽, 하수인 공격력·체력과 설명은 아래쪽에 표시한다.
- 버튼 동작, 선택 표시, 타깃 앵커, disabled/ARIA 상태는 유지한다. 웹 전체의 기본 카드 크기를 키워 손패에서 그림을 읽을 수 있게 하되 모바일에서는 가로 스크롤을 유지한다.

## Implementation

### I01. 손패와 보상 카드 프레임

- Related Files:
  - `apps/web/src/components/CardView.tsx` :: `CardView` — modify; 손패 카드 정보와 이미지 표시
  - `apps/web/src/components/RewardScreen.tsx` :: `RewardScreen` — modify; 보상 선택 카드 표시
  - `apps/web/src/styles/board.css` :: `.game-card`, `.card-art`, `.reward-card`, 반응형 규칙 — modify; 프레임과 그림 배치
  - `apps/web/src/components/CardView.test.tsx` :: 카드 렌더 테스트 — new
  - `apps/web/src/components/RewardScreen.test.tsx` :: 보상 렌더 테스트 — new

#### Details
- **Signatures & Types**:
  ```typescript
  export function CardView(props: {
    instance: CardInstance;
    effectSlot?: number;
    selected: boolean;
    disabled: boolean;
    onSelect(): void;
  }): ReactElement | null;

  export function RewardScreen(props: {
    reward: RewardState;
    disabled?: boolean;
    onChoose(cardId: string): void;
    onSkip(): void;
  }): ReactElement;
  ```
  Import `type { ReactElement }` from `react` if return annotations are added; do not rely on a global `JSX` namespace.
- **Execution Flow / Logic**:
  1. 카드 정의를 `CARD_BY_ID`에서 조회하고 손패·보상 카드 모두 `/art/cards/${card.artKey}.png`를 렌더한다.
  2. 카드 그림을 테두리 안 카드 중앙 대부분에 배치하고, 비용 원석을 좌상단에 겹친다. 이름 배너를 그림 하단에 두며, 하수인 수치와 설명은 그 아래 읽을 수 있는 면에 배치한다. 그림 자체에는 텍스트를 추가하지 않는다.
  3. `data-effect-anchor`, `data-effect-instance-id`, 클릭, 선택, disabled, `aria-pressed` 동작을 보존한다.
  4. RewardScreen도 같은 카드 외형과 같은 PNG를 쓰되 보상 선택 버튼 및 기존 보상 동작을 보존한다.
  5. 기존 `.game-card` 모바일 폭과 `.hand-cards` 가로 스크롤을 유지하고, 작은 화면에서도 비용·이름·공격/체력은 잘리지 않도록 별도 미디어 규칙을 둔다.
- **Test Scenarios**:
  - Minion/spell 손패 카드가 각 artKey PNG, 비용, 이름, 설명, 하수인 수치를 표시한다.
  - 선택 상태, disabled 상태, 기존 data-effect 앵커와 인스턴스 ID가 DOM에 남는다.
  - 보상 카드가 PNG와 공격/체력(하수인만)을 표시하며 선택 콜백으로 올바른 cardId를 보낸다.

### I02. 전장 하수인 액자 토큰과 구 SVG 정리

- Related Files:
  - `apps/web/src/components/MinionCard.tsx` :: `MinionCard` — modify; 전장 그림·수치 토큰
  - `apps/web/src/styles/board.css` :: `.minion-card`, `.minion-stats`, `.minion-name`, 모바일 규칙 — modify
  - `apps/web/src/components/MinionCard.test.tsx` :: 하수인 토큰 렌더 테스트 — new
  - `apps/web/public/art/cards/*.svg` — delete; 이미지 경로 전환 후 대체된 심볼 자산 30개

#### Details
- `MinionCard`의 현재 button API 및 타깃/선택 상태를 유지한다.
- `/art/cards/${card?.artKey ?? minion.cardId}.png` 이미지를 액자 안에 넣고 같은 카드 그림을 사용한다. 이름은 이미지 아래, 공격력·현재 체력은 원형 메달처럼 이미지 하단 좌우에 겹쳐 표시한다. 현재/최대 체력 텍스트와 접근성 레이블은 유지한다.
- 5칸 레인에서 한 슬롯을 넘지 않게 이미지 비율과 크기를 고정한다. 작은 화면의 슬롯 폭 `54px` 이하에서도 수치 메달을 읽을 수 있게 CSS를 조정한다.
- `rg '/art/cards/.*\.svg|artKey.*\.svg' apps/web/src`로 참조가 남지 않는지 확인하고, SVG 30개만 제거한다. 영웅·적 SVG 파일은 건드리지 않는다.
- 테스트: player/enemy token 모두 새 PNG 경로와 이름·현재/최대 수치·선택/타깃 class를 렌더한다.

## Acceptance Criteria
- [ ] 손패, 보상 선택, 전장 하수인이 같은 `artKey` PNG를 사용한다.
- [ ] 이름과 비용, 하수인 공격·체력·설명이 그림 위에서도 읽힌다.
- [ ] 카드의 선택·타깃·비활성 상호작용 및 기존 데이터 앵커가 유지된다.
- [ ] 카드 SVG 참조 및 대체된 카드 SVG 파일이 남지 않고, 영웅/적 아트는 바뀌지 않는다.

## Validation
- `npm run test --workspace @board-game/web -- src/components/CardView.test.tsx src/components/MinionCard.test.tsx src/components/RewardScreen.test.tsx` — 세 카드 표면의 렌더·상호작용 검증 통과.
- `npm run build --workspace @board-game/web` — TypeScript와 Vite 빌드 통과.
- `rg '/art/cards/.*\.svg|artKey.*\.svg' apps/web/src` — 결과 없음.

## Commit Message
```text
feat(web): render illustrated cards and minion portraits

Plan: 2026-10-22-card-art-adaptive-enemy-ai
Phase: P01-card-art-and-combat-ai
Task: T02-card-and-minion-views

- Use card-specific illustration assets across hand, reward, and board
- Frame stats and descriptions without losing existing interactions
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: feat(web): render illustrated cards and minion portraits

