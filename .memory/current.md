# Current Context

## Active Plan
[주문 대상 규칙 일치 및 선택 오류 수정](./plans/2026-11-12-spell-target-consistency.md)

## Active Phase
[P01 주문 대상 규칙과 화면 일치](./phases/2026-11-12-spell-target-consistency/P01-spell-targeting/phase.md)

## Active Task
[T02 플레이어 주문 대상 선택과 입력 경로 일치](./phases/2026-11-12-spell-target-consistency/P01-spell-targeting/T02-player-spell-selection.md)

## Status
- T01 완료 및 검증 통과. 커밋: ab87756.
- T02 구현 시작 준비 완료.
- 이전 계획 hard-mode-ramp는 기존 current 기록상 모든 Task 완료 상태였음.

## Next Step (IMPORTANT)
T02 청사진을 읽고 `apps/web/src/game/spellTargeting.ts`, `apps/web/src/components/GameBoard.tsx`, `apps/web/src/App.tsx`의 플레이어 주문 대상 선택을 구현한다.
