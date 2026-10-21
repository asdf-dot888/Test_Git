# Task: T01 반응형 보드와 카드 화면

## Status: done

## Goal
React 앱에 어두운 판타지 보드, 양쪽 영웅, 5칸 하수인 전장, 손패 및 마나 표시를 구현해 실제 게임 상태를 읽을 수 있는 PC·모바일 화면을 제공한다.

## Decision Summary
- `@board-game/game-core`의 `RunState`를 입력으로 받고, 이 Task는 게임 규칙이나 API를 구현하지 않는다.
- 원본 카드 게임의 고유 로고·이미지·문구는 사용하지 않는다. 고유한 어두운 판타지 색상, 카드 프레임, 영웅/적 일러스트로 구성한다.

## Implementation

### I01. 보드 컴포넌트
- Related Files:
  - `apps/web/src/components/GameBoard.tsx` :: `GameBoard` — 전투 화면 조립; new
  - `apps/web/src/components/HeroPanel.tsx` :: `HeroPanel` — 체력/초상화; new
  - `apps/web/src/components/MinionLane.tsx` :: `MinionLane` — 5칸 하수인 배치; new
  - `apps/web/src/components/MinionCard.tsx` :: `MinionCard` — 하수인 공격력/현재 체력; new
  - `apps/web/src/components/HandPanel.tsx` :: `HandPanel` — 최대 10장 손패; new
  - `apps/web/src/components/CardView.tsx` :: `CardView` — 카드 이름, 비용, 효과와 art; new
  - `apps/web/src/components/ManaDisplay.tsx` :: `ManaDisplay` — 현재/최대 마나; new
  - `apps/web/src/components/TurnControls.tsx` :: `TurnControls` — 턴 종료/상태 안내 표시; new
  - `apps/web/src/components/GameBoard.test.tsx` :: 기본 렌더링 테스트; new

#### Details
- **Signatures & Types**:
  ```typescript
  export interface GameBoardProps {
    run: RunState;
    selectedCardInstanceId: string | null;
    selectedAttackerId: string | null;
    targetMode: "none" | "spell" | "attack";
    onSelectCard(instanceId: string): void;
    onSelectTarget(targetId: string): void;
    onEndTurn(): void;
  }
  export function GameBoard(props: GameBoardProps): JSX.Element;
  ```
- `HeroPanel`은 `HeroState`, side, `artKey`를 받고 체력을 `health/maxHealth`로 표시한다. 플레이어 영웅은 아래쪽, 적 영웅은 위쪽에 둔다.
- `MinionLane`은 정확히 5개의 visual slot을 렌더링한다. 빈 칸도 클릭·드롭 대상으로 오인되지 않게 장식 요소로만 표시한다.
- `MinionCard`는 printed attack과 current/max health를 별도 표기한다. 선택 가능한 대상이면 `aria-pressed`/focus style을 제공한다.
- `CardView`는 비용, 종류, 이름, 효과 설명을 모두 텍스트로 제공한다. `artKey`에 해당하는 그림이 없으면 로컬 fallback SVG를 쓴다.
- 손패가 모바일 폭을 넘으면 가로 스크롤, 카드 선택 시 상세 미리보기/확대, 보드 요소는 세로 흐름으로 재배치한다. PC에서는 전장·두 영웅·손패가 한 화면에 들어온다.
- `GameBoard`는 상태를 수정하지 않고 이벤트 callback만 발생시킨다. 금지 행동 비활성화는 후속 상위 컴포넌트가 `canPlay`/`canAttack` 값을 제공한다.

### I02. 시각 자산과 접근성
- Related Files:
  - `apps/web/src/styles/tokens.css` :: color/space/type tokens — 테마 변수; new
  - `apps/web/src/styles/board.css` :: board/card responsive styles — layout; new
  - `apps/web/public/art/board-surface.webp` :: original board surface — background asset; new
  - `apps/web/public/art/heroes/player.webp` :: player hero portrait — new
  - `apps/web/public/art/enemies/*.webp` :: 6 normal + 3 boss portraits — new
  - `apps/web/public/art/cards/*.webp` :: card art referenced by catalog `artKey`; new
- **Data & Schema Fields**: art file names exactly match `CardDefinition.artKey`; all art is local, optimized WebP/SVG and has alt text or `aria-hidden=true` when decorative.
- Generate original fantasy assets using the imagegen skill at implementation time; do not download art from a commercial card game. If an asset cannot be generated, retain the SVG fallback so the game remains usable.
- Color contrast must meet readable text contrast; selection/attack state uses icon/outline plus color so color alone does not convey state.

## Acceptance Criteria
- [x] Both hero panels, both 5-slot lanes, mana, hand, card text, and turn control render from fixture `RunState`.
- [x] PC and narrow mobile viewport have no clipped health, cost, text, or unreachable hand cards.
- [x] Selecting/target-ready/friendly/disabled states have visible and keyboard-readable indicators.
- [x] No external image URL or copyrighted game branding is included.

## Validation
- `npm run test --workspace @board-game/web` — component render and accessible labels pass.
- `npm run build --workspace @board-game/web` — Vite production build succeeds.
- Browser check at 1440x900 and 390x844 — board and controls remain usable without horizontal page overflow.

## Commit Message
```text
feat(web): add responsive dark fantasy battle board

Plan: 2026-10-21-board-card-roguelike
Phase: P02-game-ui
Task: T01-board-visuals

- Render heroes, minion lanes, hand, cards, and mana
- Add responsive original fantasy art and accessible states
```

## Progress
- [x] 구현 완료
- [x] 검증 통과 (`test`, `build`, `lint`, Edge viewport review)
- commit: `25cee30`
