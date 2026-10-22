# Task: T02 카드별 이펙트 이미지와 애니메이션

## Status: done

## Goal
카탈로그의 카드 30종마다 새 투명 배경 이펙트 이미지를 제공하고, T01이 만든 이벤트를 대상 방향으로 날아가 타격 뒤 사라지는 반응형 애니메이션으로 재생한다.

## Decision Summary
- 이펙트 이미지는 기존 카드 일러스트와 분리된 카드별 신규 파일이다.
- 전체 테마는 기존 어두운 판타지 일러스트와 맞춘다. 이미지가 대상 쪽으로 이동하고 타격 순간 짧은 반짝임/피격 표시 뒤 제거된다.
- 카드 행동이 아닌 적의 직접 피해에는 공통 `impact.png`를 표시한다.

## Implementation

### I01. 30개 투명 배경 카드 이펙트 자산

- Related Files:
  - `apps/web/public/art/effects/ash-wolf.png` through `apps/web/public/art/effects/ancient-treant.png` :: 30 card-specific effect assets; new
  - `apps/web/public/art/effects/impact.png` :: shared non-card hero damage asset; new
  - `packages/game-core/src/catalog.ts` :: `CARD_CATALOG`; read-only asset ID reference

#### Details
- **Asset contract**:
  - 경로는 `/art/effects/{cardId}.png`. `cardId`는 `CARD_CATALOG`의 ID이며 아래 30개를 빠짐없이 포함한다: `ash-wolf`, `crypt-guard`, `cinder-imp`, `bone-rat`, `grave-knight`, `mire-witch`, `iron-hound`, `ember-priest`, `shade-stalker`, `thorn-brute`, `dusk-raven`, `plague-bearer`, `rune-smith`, `moon-stag`, `hollow-giant`, `blood-oracle`, `frost-wraith`, `storm-crow`, `ancient-treant`, `dread-colossus`, `shadow-bolt`, `soul-lance`, `healing-mist`, `raise-bones`, `rune-surge`, `dark-insight`, `meteor-shard`, `life-thread`, `soul-storm`, `eclipse`.
  - `impact.png`를 포함해 투명도 있는 512×512 PNG, 투명 배경, 중심 정렬된 단일 피사체/마법 효과, 읽기 쉬운 실루엣으로 준비한다. 글자, 카드 프레임, 배경 장면은 넣지 않는다.
  - 하수인 이미지는 해당 하수인의 공격/소환 움직임을 표현한다. 주문 이미지는 주문별 대표 시각 효과를 표현한다(피해, 치유, 소환, 강화, 드로우).
  - 파일 이름과 `CardDefinition.id`가 일치해야 하며 런타임 자산 경로에 변환 로직을 추가하지 않는다.
- **Generation Flow**:
  1. `CARD_CATALOG`를 기준으로 자산 목록을 확인한다.
  2. 기존 카드 SVG와 같은 어두운 판타지 톤에서 투명 배경의 개별 효과 이미지를 준비한다.
  3. 모든 파일이 실제 PNG이며 512×512이고 투명 채널이 있는지 확인한다.
  4. 카드 ID와 파일 basename이 일치하는지 대조한다.

### I02. 보드 내 효과 렌더러와 모션

- Related Files:
  - `apps/web/src/components/CombatEffectLayer.tsx` :: `CombatEffectLayer`; new
  - `apps/web/src/components/GameBoard.tsx` :: `GameBoardProps`, `GameBoard`; modify
  - `apps/web/src/game/combatEffects.ts` :: hand anchor instance ID; modify
  - `apps/web/src/components/HeroPanel.tsx` :: `HeroPanel`; modify
  - `apps/web/src/components/MinionLane.tsx` :: `MinionLane`; modify
  - `apps/web/src/components/CardView.tsx` :: `CardView`; modify
  - `apps/web/src/components/HandPanel.tsx` :: `HandPanel`; modify
  - `apps/web/src/App.tsx` :: `GameSessionView`; modify
  - `apps/web/src/styles/board.css` :: battle overlay and keyframes; modify

#### Details
- **Signatures & Types**:
  ```typescript
  import type { CombatEffectEvent } from "../game/combatEffects.js";
  interface CombatEffectLayerProps {
    events: CombatEffectEvent[];
    onComplete(eventId: number): void;
  }
  ```
- **Execution Flow / Logic**:
  1. `CombatEffectLayer`는 `createPortal(..., document.body)`로 화면에 고정된 overlay에 렌더링한다. hand source가 battle board 바깥에 있고 `.game-shell`/`.battle-board`에 overflow clipping이 있으므로 board 자식으로 렌더링하지 않는다. overlay에는 `aria-hidden="true"`, `pointer-events: none`을 사용해 입력을 가로막지 않는다.
  2. 각 앵커를 `data-effect-anchor` 속성으로 찾는다. `HeroPanel`, `MinionLane`의 모든 슬롯, `CardView`에 위치 식별자를 추가하고 `HandPanel`에서 손패 슬롯 인덱스를 전달한다. 데스크톱/모바일 모두 실제 DOM 중심좌표와 viewport 좌표를 사용한다.
  3. 이벤트별 `<img>`는 `/art/effects/${assetCardId ?? "impact"}.png`를 사용하고 CSS custom properties로 시작/끝 x/y 좌표를 받는다. 미지원 DOM 앵커는 해당 면의 보드 가장자리 좌표로 대체한다.
  4. 각 이벤트를 700ms 이내로 재생한다. 이동 중 이미지를 1.0→0.9 크기로 줄이고, 도착 시 타격 링과 350ms 이하의 피해/버프 반짝임을 표시한 뒤 제거한다. 연속 이벤트는 120ms 간격으로 시작한다.
  5. `animationend`에서 `onComplete(eventId)`를 호출하고, `prefers-reduced-motion: reduce`에서는 이동을 생략해 짧은 fade만 실행한다. animationend 미발생 시 최대 1초 timeout으로 이벤트를 비운다.
  6. `GameBoard`가 이벤트 배열을 받고 레이어를 보드 위에 렌더링한다. 완료 callback은 `GameSession`의 clear 액션에 연결한다.
- Hand anchor는 `slot`과 `instanceId`를 함께 가진다. 카드가 run state에서 제거된 뒤 같은 hand slot을 다른 카드가 차지할 수 있으므로, source DOM에서 instance ID가 일치하지 않으면 손패 패널 중앙을 source로 사용한다.
- CSS overlay는 `position: fixed; inset: 0`으로 viewport에 고정하고 z-index를 80으로 둔다. 기존 `.battle-board`의 clipping/stacking context 밖에 두되 화면의 게임 UI보다 위에 보이게 한다.

### I03. 화면 크기/애니메이션 확인

- Related Files:
  - `apps/web/src/styles/board.css` :: `@media (max-width: 760px)`, `@media (max-width: 390px)`, `prefers-reduced-motion`; modify
  - `apps/web/public/art/effects/*.png`; read-only during review

#### Details
- 모바일 가로 스크롤 또는 좁은 보드에서 이벤트 오버레이의 좌표를 `.battle-board` 기준으로 보정한다.
- 동시 이벤트가 여러 개면 큐의 각 이벤트가 순서대로 완료되어 화면에 계속 겹쳐 남지 않게 한다.
- 이벤트 이미지가 hero portrait, minion, hand 위치를 가리는 시간은 1초 이내로 제한하고, `prefers-reduced-motion` 설정에서도 상태 변화와 이벤트 완료가 보장되어야 한다.

## Acceptance Criteria
- [ ] 카탈로그 30종 각각 이름이 일치하는 신규 효과 PNG가 있고 공통 피격 PNG가 있다.
- [ ] 플레이어/적 하수인 공격 및 주문 이벤트의 이미지가 올바른 대상까지 이동한 뒤 사라진다.
- [ ] 대상이 영웅/하수인/손패인 경우 위치가 맞고, 사망해 DOM에서 사라지는 하수인은 이전 슬롯을 기준으로 도착점이 계산된다.
- [ ] 애니메이션은 조작을 막지 않고, 한 초 이내 자동 정리되며, reduced-motion 설정을 따른다.

## Validation
- `npm run build` — 웹 TypeScript 및 프로덕션 빌드가 통과해야 한다.
- 브라우저 수동 확인: 카드별 자산 로딩, 공격→대상 이동, 사망 대상 위치, 주문 버프/피해, 적 직접 공격, 390px 폭, reduced-motion 설정을 확인한다.
- 자산 확인: `CARD_CATALOG`의 각 `id`에 대해 `/art/effects/{id}.png`가 존재하는지 확인한다.

## Commit Message
```text
feat(web): animate card-specific combat effects

Plan: 2026-10-22-combat-effects-and-encounter-confirmation
Phase: P01-combat-flow
Task: T02-card-effect-art-and-animation

- Add transparent effect artwork for every catalog card
- Animate effects between board anchors with reduced-motion support
```

## Progress
- [x] Implementation complete
- [x] Validation passed (`npm.cmd run build`, PNG count/dimension/alpha check, local HTTP page and asset responses)
- commit: `e34153d`
