# Task: T01 하수인 상호 피해

## Status: done

## Goal

플레이어와 적 하수인이 서로 공격할 때 양쪽 모두 상대의 공격력만큼 피해를 받아 체력이 0 이하인 유닛이 전투에서 제거되도록 한다.

## Decision Summary

- 피해는 양쪽 공격력을 피해 적용 전에 읽어 동시에 계산한다. 먼저 공격한 쪽이 상대를 죽여도 반격 피해를 막지 않는다.
- 사망 판정과 죽음의 메아리 처리는 양쪽 피해 적용 뒤 진행한다. 영웅 직접 공격, 주문 피해, 보스 광역 피해에는 하수인 반격을 적용하지 않는다.

## Implementation

### I01. 공통 하수인 교전 계산

- Related Files:
  - `packages/game-core/src/engine.ts` :: `attackWithMinion`, `resolveEnemyMinionAttacks`, `removeDeadMinions` — 양방향 피해 적용 및 양쪽 사망 정리; modify

#### Details

- **Existing types**:
  - `MinionState`: `{ instanceId: string; cardId: string; owner: PlayerSide; attack: number; health: number; maxHealth: number; summonedTurn: number; hasAttacked: boolean }`.
  - `PlayerSide`: `"player" | "enemy"`.
  - `attackWithMinion(run: RunState, attackerId: string, targetId: string): RunState`.
- **Execution Flow / Logic**:
  1. 기존 차례·공격 가능 여부·도발 대상 유효성 검증을 그대로 유지한다.
  2. 공격자와 방어자의 `attack` 값을 피해를 적용하기 전에 지역 변수에 저장한다.
  3. 대상 `health`에서 공격자 공격력을 빼고 공격자 `health`에서 대상 공격력을 뺀 뒤 공격자의 `hasAttacked`를 `true`로 설정한다.
  4. 양쪽 체력이 이미 반영된 뒤 죽은 유닛을 양 진영에서 제거한다. 플레이어 공격이면 적 진영을, 적 진영을, 적 공격이면 플레이어 진영을, 그 다음 적 진영을 정리한다. `removeDeadMinions`의 기존 discard 및 `deathSummon` 처리를 유지한다.
  5. 적 자동 공격 루프는 처음 공격자 ID 목록을 순회하되 각 단계에서 현재 `run.battle.enemyBoard`를 다시 조회한다. 앞선 교전에서 죽은 공격자는 건너뛰고, 죽은 공격자가 이전 배열 반복자에 남아 다시 행동하는 일을 막는다.
  6. 적 하수인 공격의 대상 우선순위, 공격 후 영웅 직접 공격, 주문 대상 선택은 변경하지 않는다.
- **Data & Schema Fields**:
  - 저장 스키마 변경 없음. `RunState`의 기존 양 진영 보드 및 버린 카드 더미만 사용한다.
- **Error & Exception Handling**:
  - 기존 `GameRuleError` (`INVALID_ACTION`, `INVALID_TARGET`, `WRONG_TURN`) 동작과 메시지 경로를 유지한다.

### I02. 상호 피해 회귀 테스트

- Related Files:
  - `packages/game-core/src/engine.test.ts` :: `attackWithMinion` 및 `resolveEnemyTurn` 전투 규칙 테스트 — 정상/치명 반격 검증; modify

#### Details

- 플레이어 3/5가 적 1/3을 공격하면 적 하수인은 제거되고 플레이어 하수인은 체력 4로 남는다.
- 플레이어 1/3과 적 3/3이 맞붙으면 공격자와 대상 모두 죽고 각각 올바른 discard pile에 한 번씩 들어간다.
- 적 1/3 하수인이 플레이어 3/5를 공격하면 적 하수인이 제거되고 플레이어 하수인 체력은 4가 된다.
- 적 공격 중 양쪽 하수인이 서로 죽일 수 있는 능력치를 가졌을 때, 둘 다 제거되며 이후 반복에서 제거된 공격자가 재행동하지 않는다.
- 적 보드가 비어 영웅을 공격하는 경우 영웅 피해 및 기존 행동 완료 규칙은 그대로 유지한다. 단일 대상 주문 피해에는 반격이 발생하지 않는다.
- `deathSummon` 하수인이 양쪽에서 동시에 죽을 경우 각 사망 효과가 정확히 한 번 실행된다.

## Acceptance Criteria

- [ ] 플레이어와 적의 하수인 대 하수인 공격이 모두 상호 피해를 적용한다.
- [ ] 양쪽 사망과 기존 discard/deathSummon 처리가 정확하며 적 공격 루프가 사망 유닛을 다시 실행하지 않는다.
- [ ] 영웅 직접 공격과 주문·광역 피해 규칙은 회귀하지 않는다.

## Validation

- `npm.cmd test --workspace @board-game/game-core -- src/engine.test.ts` — 플레이어/적 교전 및 기존 엔진 규칙 테스트 통과.
- `npm.cmd run build --workspace @board-game/game-core` — 공개 `RunState` 및 엔진 타입 검사 통과.

## Commit Message

```text
fix(game-core): apply reciprocal minion combat damage

Plan: 2026-10-23-enemy-turn-pacing-and-combat-retaliation
Phase: P01-sequenced-enemy-turn-and-minion-combat
Task: T01-reciprocal-minion-damage

- Apply both attacks before removing dead minions
- Preserve retaliation rules for player and enemy combat
```

## Progress

- [x] 구현 완료
- [x] 검증 통과
- commit: `59ed505`
