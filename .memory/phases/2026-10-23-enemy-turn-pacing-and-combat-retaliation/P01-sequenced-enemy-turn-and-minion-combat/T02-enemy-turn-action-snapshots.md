# Task: T02 적 턴 행동별 전장 스냅샷

## Status: done

## Goal

엔진이 최종 적 턴 결과와 함께 카드 사용·보스 광역기·개별 하수인 공격 직후의 전장 스냅샷을 순서대로 반환해 웹에서 한 행동씩 재생할 수 있도록 한다.

## Decision Summary

- 서버에 저장하는 `RunState` 계약과 기존 `endPlayerTurn(run): RunState` 반환값은 유지한다. 새로운 시퀀스는 호출 결과에만 포함되는 임시 데이터다.
- 카드 한 장의 모든 효과는 하나의 `EnemyCombatRecord` 행동으로, 하수인 공격 하나와 보스 광역기는 각각 하나의 행동으로 반환한다.
- 패배 행동에는 영웅 체력이 0인 전장 프리뷰 스냅샷을 반환하되, 최종 `RunState`는 기존처럼 `status: "defeat"`, `battle: null`로 유지한다.

## Implementation

### I01. 엔진 행동 스냅샷 결과 타입

- Related Files:
  - `packages/game-core/src/types.ts` :: `EnemyCombatRecord`, `EnemyTurnPlaybackStep`, `EnemyTurnResolution` — 행동/상태 반환 타입; modify
  - `packages/game-core/src/engine.ts` :: `resolveEnemyTurn`, `endPlayerTurn`, 적 카드/광역/공격 루프 — 단계별 스냅샷 생성 및 기존 함수 호환; modify
  - `packages/game-core/src/index.ts` :: 공개 타입과 새 엔진 함수 export — 웹 패키지 사용 가능하게 한다; modify

#### Details

- **Signatures & Types**:

  ```typescript
  export interface EnemyTurnPlaybackStep {
    action: EnemyCombatRecord;
    beforeRun: RunState;
    presentationRun: RunState;
  }

  export interface EnemyTurnResolution {
    run: RunState;
    steps: EnemyTurnPlaybackStep[];
  }

  export function endPlayerTurnWithPlayback(run: RunState): EnemyTurnResolution;
  export function resolveEnemyTurnWithPlayback(run: RunState): EnemyTurnResolution;
  ```

- **Data & Schema Fields**:
- `beforeRun`은 해당 행동을 실행하기 직전의 전장, `presentationRun`은 해당 적 행동 직후 화면에 표시할 독립 깊은 복사본이다. `battle.activeSide`는 재생이 끝날 때까지 `"enemy"`로 남기며, 이미 처리된 로그를 재생 snapshot에 남기지 않는다. UI가 각 행동에 맞는 손패/전장 슬롯을 찾을 수 있도록 두 상태 모두 제공한다.
  - `run`은 턴 처리가 모두 끝난 기존 최종 상태다. 일반 진행에서는 `activeSide: "player"`로 시작 플레이어 턴까지 반영한다. 패배 진행에서는 기존 계약대로 `status: "defeat"`, `battle: null`을 유지한다.
  - 타입은 `packages/game-core/src/index.ts`에서 export한다. `RunState`, API Zod 스키마, DB 스키마에는 재생 큐를 추가하지 않는다.

#### Details: Execution Flow / Logic

1. `endPlayerTurnWithPlayback`은 기존 플레이어 턴 유효성 검증 및 보드 공격 가능 상태 초기화를 동일하게 수행한다.
2. 내부 `resolveEnemyTurnWithPlayback`는 마나 증가, 손패 보충, 카드 선택, 보스 광역기, 적 하수인 공격을 기존 결정 순서로 계산한다.
3. 적 카드 한 장을 처리한 직후 `EnemyCombatRecord` 하나와 현재 전체 `RunState` 복사본을 `steps`에 추가한다. 주문 카드의 모든 spellEffects는 해당 한 단계에 포함한다.
4. 3번째/6번째/9번째 보스 턴에서는 카드 행동들 뒤, 하수인 공격들 앞에 광역기 한 단계를 추가한다.
5. 각 적 하수인 공격 직후 해당 공격 하나의 action과 전장 상태를 추가한다. 상호 피해가 발생한 후 죽은 하수인·죽음의 메아리까지 반영된 전장을 저장한다.
6. 유닛 사망, 카드 효과, 영웅 피해로 패배가 발생하면 이후 적 행동을 중단한다. 행동 전 `beforeRun`을 먼저 복사하고, 피해 적용으로 `finishDefeat`가 전장을 지우기 전에 체력이 0인 battle을 가진 `presentationRun`을 캡처한다. 최종 `run`에는 기존 `finishDefeat` 계약을 적용한다. 이를 위해 terminal 패배 처리 직전 표시 상태를 캡처하는 내부 콜백/결과 경로를 추가하되 `RunState`의 외부 terminal 규칙은 바꾸지 않는다.
7. 플레이어가 패배하지 않았으면 모든 스냅샷을 만든 뒤 기존 `startPlayerTurn`을 한 번만 호출해 최종 `run`을 확정한다.
8. 기존 `endPlayerTurn`와 `resolveEnemyTurn`은 새 시퀀스 함수의 `.run`을 반환하는 호환 래퍼로 유지한다. 기존 API/테스트가 행동 기록 없는 반환값을 기대하지 않도록 현재 반환 형태를 보존한다.
9. 재생 스냅샷은 API 저장용이 아니다. 웹은 `resolution.run`만 기존 `session.run`으로 저장하고 `steps`는 세션의 UI 재생 상태로 보유한다.

- **Error & Exception Handling**:
  - 잘못된 플레이어/적 차례는 기존 `GameRuleError("WRONG_TURN", ...)`를 유지한다.
  - 단계 생성 중 기존 카드·타겟 오류는 기존처럼 전파하고, 임의로 부분 완료된 `steps`를 정상 해상도로 반환하지 않는다.

### I02. 시퀀스 순서 및 최종 결과 테스트

- Related Files:
  - `packages/game-core/src/engine.test.ts` :: enemy card AI, boss pattern, end-turn tests — 기존 동작과 단계 결과 검증; modify

#### Details

- `steps` 순서는 적이 낸 카드 순서, 고유 보스 광역기, 적 하수인 공격 순으로 기록된다.
- 카드 전투의 함성/다중 주문 효과는 `steps` 한 개로 묶이고 해당 스냅샷에는 모든 효과의 결과가 있다.
- 각 attack 단계는 바로 직전 단계 이후 보드와 체력만 반영한다. 다음 적 행동의 효과가 이전 스냅샷에 미리 나타나지 않는다.
- `endPlayerTurnWithPlayback(run).run`은 같은 seed의 기존 `endPlayerTurn(run)`과 동일한 상태다. 두 함수 호출을 각각 복제본으로 수행해 RNG나 입력 run이 변이되지 않는지 확인한다.
- 치명적인 주문, 적 하수인 공격, 보스 광역기 각각에 대해 terminal 최종 run은 `battle: null`이고 마지막 단계 `presentationRun`은 플레이어 체력이 0인 표시 가능한 battle을 가진다.
- 보스가 3/6/9번째가 아닌 턴에는 광역 단계가 없으며, 보스가 아닌 적에게도 광역 단계가 없다.
- 공격 대상이나 적 전술 점수, 뽑기/버리기, 마나 계산은 기존 테스트와 동일하다.

## Acceptance Criteria

- [ ] 엔진이 고수준 적 행동 단위로 정확한 중간 전장 상태를 반환한다.
- [ ] 단계 반환 API와 기존 최종 `RunState` API가 같은 결정론적 결과를 낸다.
- [ ] 패배 행동은 최종 저장 상태를 깨지 않으면서 마지막 공격 연출에 필요한 전장 스냅샷을 제공한다.

## Validation

- `npm.cmd test --workspace @board-game/game-core -- src/engine.test.ts` — 단계 순서, snapshot, terminal preview 및 기존 전투 규칙 통과.
- `npm.cmd run build --workspace @board-game/game-core` — 신규 export와 타입 선언 생성 통과.

## Commit Message

```text
feat(game-core): expose enemy turn action snapshots

Plan: 2026-10-23-enemy-turn-pacing-and-combat-retaliation
Phase: P01-sequenced-enemy-turn-and-minion-combat
Task: T02-enemy-turn-action-snapshots

- Capture state after each enemy card, area attack, and minion attack
- Preserve existing final run contracts
```

## Progress

- [x] 구현 완료
- [x] 검증 통과
- commit: `41b356a`
