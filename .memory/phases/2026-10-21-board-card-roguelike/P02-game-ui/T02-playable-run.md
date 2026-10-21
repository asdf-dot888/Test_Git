# Task: T02 플레이 가능한 전투와 런 진행

## Status: done

## Goal
보드 UI 입력을 순수 게임 엔진에 연결해 시작 덱부터 3페이즈 보스 승리/패배까지 플레이 가능한 게임 흐름을 완성한다.

## Decision Summary
- 게임 수치와 규칙은 `@board-game/game-core`가 단일 기준이다. React는 임시 UI 선택 모드만 소유하고 직접 체력·마나·턴 규칙을 재구현하지 않는다.
- 로그인/서버 저장 연결 전까지 브라우저 메모리에 현재 RunState를 둔다. P03에서 동일 state를 API 저장과 연결한다.

## Implementation

### I01. App 상태와 플레이 액션
- Related Files:
  - `apps/web/src/App.tsx` :: `App` — 메뉴/게임/보상/종료 화면 전환; modify
  - `apps/web/src/game/useGameSession.ts` :: `useGameSession` — RunState + engine dispatcher; new
  - `apps/web/src/game/gameActions.ts` :: `GameAction`, `reduceGameAction` — typed UI action adapter; new
  - `apps/web/src/components/TargetPicker.tsx` :: `TargetPicker` — 공격/주문 target overlay; new
  - `apps/web/src/components/DiscardPicker.tsx` :: `DiscardPicker` — 손패 10장일 때 카드 선택 폐기; new
  - `apps/web/src/components/GameBoard.test.tsx` :: action rendering regression tests; modify

#### Details
- **Signatures & Types**:
  ```typescript
  export type GameAction =
    | { type: "start-run"; seed: number }
    | { type: "select-card"; instanceId: string }
    | { type: "play-minion"; instanceId: string }
    | { type: "cast-spell"; instanceId: string; targetId?: string }
    | { type: "attack"; attackerId: string; targetId: string }
    | { type: "end-turn" }
    | { type: "discard-before-draw"; instanceId: string }
    | { type: "choose-reward"; cardId: string }
    | { type: "skip-reward" }
    | { type: "continue-run" };
  export interface GameSession { run: RunState | null; error: string | null; selectedCardInstanceId: string | null; selectedAttackerId: string | null; }
  export function useGameSession(): { session: GameSession; dispatch(action: GameAction): void; startNewRun(seed: number): void };
  ```
- **Execution Flow / Logic**:
  1. Main menu shows `새 판 시작`; after a cloud session is attached in P03 it will also show `이어하기` when `run.status === "active"`.
  2. Clicking an affordable minion card calls `playMinion`; clicking a targeted spell first sets `targetMode="spell"`, then a valid target calls `castSpell`.
  3. Clicking a friendly ready minion selects attacker; clicking an enemy minion/hero calls `attackWithMinion`. Hero target is enabled only if enemy lane is empty.
  4. If player turn start has pending full-hand discard, `DiscardPicker` requires discarding exactly one existing hand card before dispatching draw completion.
  5. End turn runs player end, hidden random AI action, enemy minion actions, then next player turn. Disable all player actions while AI resolution/reward transition is in progress.
  6. Normal/boss reward screen shows three legal cards with a skip button. After choice/skip show next random encounter; after boss 1/2 start next phase; after boss 3 show victory. On player death show defeat and offer new run from fixed starter deck.
  7. Catch `GameRuleError` and show concise inline feedback; unexpected errors render a retryable game error boundary without corrupting current RunState.
- Use `useReducer` or a reducer-backed hook; no direct state mutation. Generate a new seed via `crypto.getRandomValues` at new-run time; show no enemy action intent.
- **Data & Schema Fields**: UI session state contains `run`, `selectedCardInstanceId`, `selectedAttackerId`, `targetMode`, `pendingDiscard`, `error`; all durable game fields remain in `RunState`.

### I02. UX verification
- Related Files:
  - `apps/web/src/game/useGameSession.test.ts` :: engine adapter tests; new
  - `apps/web/src/components/TargetPicker.test.tsx` :: target/discard interaction tests; new
- Cases: insufficient mana prevents card play; full 5-minion lane disables minion card; player minion attacks at most once; no hero attack with enemy minion present; spell targets match card rules; AI action remains hidden; reward skip does not add a copy; phase 3 boss victory displays final outcome.

## Acceptance Criteria
- [x] A player can start, play cards, attack, end turns, earn/skip rewards, defeat 9 normal enemies + 3 bosses, or lose.
- [x] UI cannot create state that violates engine constraints.
- [x] Mobile player can select a card and target without hover-only controls.
- [x] No network save is required in this Task; P03 will attach persistence without changing engine rules.

## Validation
- `npm run test --workspace @board-game/web` — hook and interaction tests pass.
- `npm run test --workspace @board-game/game-core` — all rule tests remain green.
- `npm run build --workspace @board-game/web` — browser bundle succeeds.

## Commit Message
```text
feat(web): connect board interactions to roguelike game engine

Plan: 2026-10-21-board-card-roguelike
Phase: P02-game-ui
Task: T02-playable-run

- Wire card, target, attack, and turn actions to game-core
- Add three-phase rewards and end-of-run screens
```

## Progress
- [x] 구현 완료
- [x] 검증 통과 (`web test`, `game-core test`, `web build`, `web lint`)
- commit: `48ee9ef`
