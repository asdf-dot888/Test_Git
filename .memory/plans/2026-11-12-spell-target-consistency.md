# Plan: 주문 대상 규칙 일치 및 선택 오류 수정

## Goal
운명의 파편·수확자의 칼날의 하수인 선택을 복구하고, 플레이어와 컴퓨터의 피해 주문이 카드 설명의 대상 제한을 지키게 한다. 잘못된 대상에는 카드·마나·난수를 소모하지 않으며, 컴퓨터의 대상 예고와 피해 연출도 실제 대상과 일치한다.

## Decision Source
- [Confirmed decisions](../decisions/2026-11-12-spell-target-consistency.md)
- 과거 enemy-card-ai-victory-flow D03의 주문 하수인 우선 정책만 대체한다. 일반 하수인 공격과 카드 수치·난수·난이도 수치는 유지한다.

## Phases
| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `completed_with_validation_exceptions` | 주문 실행·컴퓨터 표시와 플레이어 대상 선택 일치 | [P01](../phases/2026-11-12-spell-target-consistency/P01-spell-targeting/phase.md) |

## Execution Order
1. T01: 엔진의 대상 검증·컴퓨터 행동과 대상 기록·예고·연출을 함께 수정한다.
2. T02: 플레이어의 대상 선택 판단을 통합하고 클릭·터치·드래그 경로를 검증한다. 최종 전체 빌드·테스트·lint를 수행한다.

## Scope and Boundaries
- 단일 Phase, 두 Task. 각 Task에 구현과 해당 회귀 테스트를 함께 둔다.
- API, 저장 스키마, 카드 정의/설명, 아트, 배포, 난이도 조정, 일반 하수인 공격은 변경하지 않는다.
- 현재 플레이어의 영웅 전용 주문은 카드 클릭만으로 즉시 시전한다. 이 정상 동작을 유지한다.
- 현재 컴퓨터의 운명의 파편은 하수인 우선, 없으면 영웅을 선택한다. 이 합법적인 전술은 유지한다.
- 구현 시 기존 작업 트리의 수정·미추적 파일을 보존하고 Task 파일과 구현 변경만 명시적으로 스테이징한다. `git add .`를 사용하지 않는다.
- 기존 `.memory/current.md`가 가리킨 hard-mode-ramp는 모든 Task 완료 상태였다. 이 계획의 T01로 포인터를 전환한다.

## Validation Strategy
- 루트에서 실행한다. 웹의 `@board-game/game-core` import는 `packages/game-core/dist`를 읽으므로 웹 테스트 전에 `npm run build --workspace @board-game/game-core`가 필요하다.
- T01은 엔진·컴퓨터 연출 관련 테스트와 코어/웹 빌드·해당 파일 lint를 통과시킨다.
- T02는 플레이어 상호작용 회귀 테스트 후 `npm run build`, `npm test`, `npm run lint`로 전체 통합을 확인한다.
- 계획 단계에서는 테스트를 실행하지 않았으며 통과를 주장하지 않는다. 검증 명령과 기대 결과는 각 Task에 명시한다.

## Out-of-scope Observations
- 루트 package.json의 `engines.node`는 `>=24 <25`지만 개발 의존성 `node`는 `^22.23.4`이다. 요구 버전과 설치 의존성의 불일치이며 실제 실패 여부는 확인하지 않았다. 이번 주문 수정 Task에는 런타임·의존성 갱신을 포함하지 않는다. 별도 정리를 사용자에게 제안한다.
- 기존 작업 트리에 EnemyHeroDefeatEffect.tsx, board.css와 다수 memory 파일의 변경이 있다. 이번 작업에서 덮어쓰거나 함께 커밋하지 않는다.

## Completion Criteria
- 두 Task가 검증·커밋 완료되고 phase 진행률이 2/2이다.
- `.memory/current.md`에 이 계획의 미완료 Task가 없음을 기록하고 Plan/Phase를 완료 처리한다.

## Final Validation State
- 주문 대상 변경의 관련 테스트 70/70, 전체 빌드와 변경 파일 lint는 통과했다.
- 전체 테스트 694개 중 5개와 전체 lint 기존 오류 12건은 남아 있으므로 전역 검증 완료로 간주하지 않는다. T02 청사진에 실패 목록을 기록했다.
