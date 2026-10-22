# Task: T01 남은 마나 +1 회복 규칙

## Status: done

## Goal
전투 시작 마나를 5/10으로 고정하고, 플레이어 턴이 다시 시작될 때 남은 마나에 1을 더해 최대 10까지만 회복시킨다. 전투 코어의 상태 불변식과 회귀 테스트를 함께 갱신한다.

## Decision Summary
- `MAX_MANA`는 계속 10이다. 새 전투 시작은 `{ current: 5, max: 10 }`이다.
- `startPlayerTurn`은 최대치를 늘리지 않는다. 현재 마나만 `Math.min(10, current + 1)`로 바꿔 미사용 마나를 이월한다.

## Implementation

### I01. 전투 초기화와 다음 턴 마나 변경
- Related Files:
  - `packages/game-core/src/engine.ts` :: `INITIAL_MANA`, `MAX_MANA`, `beginEncounter`, `startPlayerTurn`, `gameConstants` — 새 마나 불변식으로 변경
  - `packages/game-core/src/engine.test.ts` :: 전투 생성·턴 종료 마나 테스트 — 변경 및 확장

#### Details
- **State Schema**:
  - `BattleState.playerMana`: 기존 `{ current: number; max: number }` 타입 유지.
  - 새 조우의 `playerMana` 값은 정확히 `{ current: INITIAL_MANA, max: MAX_MANA }`, 상수는 `INITIAL_MANA = 5`, `MAX_MANA = 10`.
- **Execution Flow / Logic**:
  1. `beginEncounter`가 전투 객체를 만들 때 기존 `max: INITIAL_MANA`를 `max: MAX_MANA`로 바꾼다.
  2. `startPlayerTurn`에서 `battle.turnNumber += 1`, `activeSide = "player"` 처리는 보존한다.
  3. `startPlayerTurn`은 `playerMana.max`를 수정하지 않고 `playerMana.current = Math.min(MAX_MANA, battle.playerMana.current + 1)`을 적용한다.
  4. 첫 플레이어 턴은 초기 마나를 그대로 표시하며, 적 턴 뒤 시작되는 두 번째 플레이어 턴부터 1씩 회복한다.
  5. 기존 서버 저장 런처럼 `playerMana.max`가 과거 규칙 값인 상태도 다음 플레이어 턴에서 `max = MAX_MANA`로 정규화한 후 회복한다. 이로써 규칙 배포 후 진행 중인 런도 최대치 10 규칙을 따른다.
- **Test Cases**:
  - `createRun(seed)`의 첫 전투가 5/10인지 검증.
  - 10/10에서 턴 종료 후 다음 플레이어 턴이 10/10인지 검증.
  - 5/10을 남기고 턴을 종료하면 다음 턴이 6/10인지 검증.
  - 0/10이면 다음 플레이어 턴이 1/10인지 검증.
  - 다음 조우를 시작하면 마나가 다시 5/10인지 검증.
  - 기존 저장 상태 `current: 5, max: 6`을 다음 플레이어 턴에 전달하면 `current: 6, max: 10`인지 검증.

## Acceptance Criteria
- [ ] 모든 새 조우가 5/10으로 시작하고 최대 마나 표시가 항상 10이다.
- [ ] 플레이어가 소비한 마나가 미사용량으로 보존되며 다음 턴에 정확히 1만 회복된다.
- [ ] 현재 마나가 10일 때 추가 회복으로 10을 넘지 않는다.
- [ ] 기존 카드 비용, 드로우, 적 턴 순서는 바뀌지 않는다.

## Validation
- `npm run test --workspace @board-game/game-core` — 엔진 테스트 통과
- `npm run build --workspace @board-game/game-core` — 게임 코어 TypeScript 빌드 통과

## Commit Message
```text
fix(game-core): recover one mana per player turn

Plan: 2026-10-22-audio-visual-combat-polish
Phase: P01-combat-presentation-and-settings
Task: T01-mana-regeneration

- Keep maximum mana fixed at ten and start encounters at five
- Carry unused mana and regenerate one up to the cap each turn
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: fix(game-core): recover one mana per player turn
