# Phase: P01 주문 대상 규칙과 화면 일치

## Status: in_progress

## Goal
피해 주문의 허용 대상, 실제 피해, 화면에서 선택 가능한 대상, 컴퓨터의 행동 예고를 일치시킨다.

## Tasks
| Task | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| T01 | `done ✅` | 양쪽 시전자 대상 검증, 컴퓨터 사용 조건 및 대상 기록·표시 수정 | [T01](./T01-engine-and-enemy-targets.md) |
| T02 | `in_progress 🔵` | 플레이어 주문 선택 통합, 클릭·터치·드래그 회귀 검증 | [T02](./T02-player-spell-selection.md) |

## Progress
- done: 1/2 (active: T02)

## Dependencies and Completion
- T02는 T01의 엔진 대상 검증 및 최신 코어 빌드를 전제로 한다.
- T01에 컴퓨터 표시 수정도 포함해 영웅 대상 기록 형식 변경과 소비 코드 변경을 같은 커밋으로 검증한다.
- Task 완료마다 Status, Progress, commit 기록을 갱신하고 current 포인터를 다음 Task로 옮긴다.
- T02 완료 후 이 Phase와 상위 Plan을 완료 처리하고 current에 미완료 Task가 없음을 기록한다.
