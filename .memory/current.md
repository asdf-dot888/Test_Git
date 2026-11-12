# Current Context

## Active Plan
[주문 대상 규칙 일치 및 선택 오류 수정](./plans/2026-11-12-spell-target-consistency.md)

## Active Phase
[P01 주문 대상 규칙과 화면 일치](./phases/2026-11-12-spell-target-consistency/P01-spell-targeting/phase.md)

## Active Task
None — 주문 대상 수정의 계획된 두 Task는 구현 및 관련 검증을 마쳤습니다.

## Status
- T01 완료 및 관련 검증 통과. 커밋: ab87756.
- T02 구현 완료 및 관련 검증 통과. 커밋: d264dca.
- 전체 검증 예외: 전체 테스트 5/694 실패, 전체 lint 기존 오류 12건. 자세한 내용은 T02 Validation Results 참조.

## Next Step (IMPORTANT)
이번 계획의 구현 Task는 모두 완료했다. 전체 테스트·lint의 기존 실패와 누락된 `matron-thornling` 카드 이미지는 별도 범위에서 정리해야 한다.
