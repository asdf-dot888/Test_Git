# Task: T03 적 하수인 진영 표시

## Status: done

## Goal
적 하수인 원화 선명도는 플레이어 하수인과 똑같이 유지하면서, 개별 하수인의 붉은 테두리·약한 광채와 적 진영 바닥 표시를 더해 적임을 즉시 알아보게 한다.

## Decision Summary
- 적 카드 그림에는 blur, opacity 감소, 흐림 필터를 적용하지 않는다.
- 기존 붉은 테두리를 살리고 붉은 외곽 광채와 적 진영 레인 바닥 표시를 추가한다.

## Implementation

### I01. 적 하수인과 진영 레인 스타일
- Related Files:
  - `apps/web/src/components/MinionCard.tsx` :: `MinionCard` — 기존 owner 기반 `minion-enemy` 클래스를 유지하고 접근성 진영 설명 추가
  - `apps/web/src/components/MinionLane.tsx` :: `MinionLane` — `lane-enemy` 식별 유지/추가 및 진영 설명 표시
  - `apps/web/src/styles/board.css` :: `.minion-enemy`, `.minion-art-frame img`, `.minion-lane`, `.lane-enemy` — 붉은 외곽광과 레인 바닥 효과
  - `apps/web/src/components/MinionCard.test.tsx` :: `MinionCard` 테스트 — 적/아군 클래스 및 같은 PNG URL 보장
  - `apps/web/src/components/MinionLane.test.tsx` :: `MinionLane` 렌더 테스트 — 필요 시 신규

#### Details
- **Signatures & Types**:
  - `MinionCard` props와 `MinionLane` props는 기존 타입을 유지한다.
  - 화면 구분은 기존 `MinionState.owner: "player" | "enemy"`와 `PlayerSide`를 사용한다. 게임 코어 데이터 형식을 변경하지 않는다.
- **Execution Flow / Logic**:
  1. 적 하수인 `.minion-enemy`에는 붉은 테두리와 작은 `box-shadow` 외곽광을 준다.
  2. `.minion-art-frame img`에는 양 진영 공통으로 동일한 `filter`, `opacity`, `object-fit` 규칙을 유지한다. 적 전용 blur/filter/opacity를 만들지 않는다.
  3. `.lane-enemy`의 레인 바닥에 낮은 높이의 붉은 그라데이션/광선을 배치한다. 다섯 슬롯과 카드 클릭 영역 위에 덮이지 않게 pseudo-element의 stacking order를 지정한다.
  4. `prefers-reduced-motion`을 존중하며 애니메이션은 추가하지 않는다. 표시는 색상 외곽과 정적 바닥 신호로 처리한다.
  5. 테스트에서 player와 enemy 양쪽 이미지 `src`가 같은 카드 `artKey` PNG이며, 클래스만 진영별로 다른지 확인한다.

## Acceptance Criteria
- [ ] 플레이어·적 하수인의 동일 카드 이미지는 같은 URL과 선명도로 렌더링된다.
- [ ] 적 하수인에는 붉은 테두리와 약한 붉은 광채가 보인다.
- [ ] 적 레인 바닥의 붉은 표시가 하수인 슬롯이나 클릭/타깃 상호작용을 가리지 않는다.
- [ ] 카드 아트에 blur 또는 적 전용 투명도 저하가 없다.

## Validation
- `npm run test --workspace @board-game/web -- src/components/MinionCard.test.tsx src/components/MinionLane.test.tsx` — 진영 표시와 렌더 테스트 통과
- `npm run build --workspace @board-game/web` — 웹 빌드 통과
- 수동 브라우저 확인: 같은 카드 artKey를 아군·적 레인에 렌더링해 선명도, 붉은 바닥 표시, 타깃 선택을 비교한다.

## Commit Message
```text
feat(ui): distinguish enemy minions without blurring art

Plan: 2026-10-22-audio-visual-combat-polish
Phase: P01-combat-presentation-and-settings
Task: T03-enemy-minion-identity

- Add a subtle red enemy outline and lane floor signal
- Keep enemy minion artwork crisp and unchanged
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: feat(ui): distinguish enemy minions without blurring art
