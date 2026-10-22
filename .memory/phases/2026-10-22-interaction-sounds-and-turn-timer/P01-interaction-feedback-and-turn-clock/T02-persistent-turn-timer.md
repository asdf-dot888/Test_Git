# Task: T02 저장 가능한 턴 타이머

## Status: done

## Goal

플레이어 전투 턴마다 20초 시계를 시작한다. 메뉴·전투 연출·숨겨진 탭 동안 남은 시간을 보존하며 멈추고, 0초에는 턴을 한 번 종료한다. 로그인 run은 저장된 같은 battle/turn의 시간을 새로고침 후 이어가며, Local Demo는 기존 비저장 동작을 유지한다.

## Decision Summary
- 새 플레이어 턴마다 20초, timeout이면 자동으로 종료한다. 메뉴/연출/hidden tab에서는 pause한다.
- 로그인 모드의 RunState와 timer snapshot을 저장한다. Local Demo는 refresh persistence를 추가하지 않는다.

## Implementation

### I01. RunState/API 선택 snapshot schema
- Related Files:
  - `packages/game-core/src/types.ts` :: `TurnTimerState`, `RunState`; modify
  - `apps/api/src/routes/runRoutes.ts` :: `runSchema`; modify
  - `apps/api/src/routes/runRoutes.test.ts` :: schema cases; modify
  - `apps/api/src/db/runRepository.ts`, `apps/api/src/db/runDocument.ts` :: persistence/version; read-only unless needed

#### Details
- Add exact type and optional field:
  ```typescript
  export interface TurnTimerState {
    battleId: string;
    turnNumber: number;
    deadlineAt: number | null;
    pausedRemainingMs: number | null;
  }
  // RunState: turnTimer?: TurnTimerState;
  ```
- `battleId` identifies BattleState; `turnNumber` is 1..100,000. Active invariant: safe-integer `deadlineAt` epoch ms and `pausedRemainingMs === null`. Paused invariant: `deadlineAt === null` and integer `pausedRemainingMs` in 0..20,000. Initial null/null is allowed. Hook checks battle/turn identity.
- Add optional `turnTimer` in `runSchema`: `battleId: id`, bounded integer turn, safe integer-or-null deadline, integer 0..20,000-or-null remaining. Missing field remains accepted for legacy runs. Invalid ranges return current 400 `INVALID_BODY`. Keep schemaVersion 1 because field is additive and optional.
- Repository already stores full RunState; add no DB column/migration. Test active/paused roundtrip, legacy missing field, and out-of-range rejection.

### I02. Reducer and clock hook
- Related Files:
  - `apps/web/src/game/gameActions.ts` :: `GameAction`, `reduceGameAction`; modify
  - `apps/web/src/game/useGameSession.ts` :: resolving gate; modify
  - `apps/web/src/game/useTurnTimer.ts` :: timer controller; new
  - `apps/web/src/game/useTurnTimer.test.ts` :: deterministic clock tests; new
  - `apps/web/src/game/gameActions.test.ts` or existing reducer spec :: timer action; modify

#### Details
- Add `GameAction` `{ type: "set-turn-timer"; timer: TurnTimerState | undefined }`; reducer changes/removes only `run.turnTimer`, creates no combat event, and does not mutate BattleState. Allow this internal action while `useGameSession` is resolving; keep other actions blocked.
- Add `useTurnTimer(options: { run: RunState | null; paused: boolean; onTimerChange(timer: TurnTimerState | undefined): void; onTimeout(): void; now?: () => number }): TurnTimerViewState`, where `TurnTimerViewState` is `{ remainingMs: number; remainingSeconds: number; isPaused: boolean }`.
- `paused` is true for menu open, resolving, combat effects present, hidden document, inactive game screen, or non-player turn. Add/remove `visibilitychange` listener and reevaluate on change.
- No active battle, completed battle, or enemy turn: no running clock. For a new player `battleId/turnNumber` or missing/mismatched snapshot, create `{battleId, turnNumber, deadlineAt:now()+20_000, pausedRemainingMs:null}`. A matching snapshot takes precedence on restore.
- View updates may tick locally every 100..250ms. Persist only at new turn, pause, resume, or clear; never dispatch/save each second. Pause snapshot is `clamp(deadlineAt-now(),0,20_000)` in `pausedRemainingMs`, deadline null. Resume uses `deadlineAt=now()+pausedRemainingMs`, remaining null. Restored paused state stays paused until pause reason clears.
- On deadline, invoke `onTimeout` once using ref guard; reset guard for new battle/turn. Do not time out enemy turns or complete battles. Snapshot flows through existing RunState autosave; Demo save remains no-op.
- Fake-clock cases: 20-second start, tick does not extend deadline, pause/resume, matching restore, mismatched turn reset, one expired timeout, no timeout on enemy/outcome, reducer update/removal.

### I03. App wiring and low-time alerts
- Related Files:
  - `apps/web/src/App.tsx` :: `GameSessionView`, run save, menu/visibility state, board props; modify
  - `apps/web/src/game/useRunSync.ts` :: existing autosave; read-only unless narrow typing change needed
  - `apps/web/src/DemoApp.tsx` :: demo hookup; modify only if required
  - `apps/web/src/App.timer.test.tsx` :: integration and alerts; new

#### Details
- Invoke hook in `GameSessionView`. `onTimerChange` dispatches `set-turn-timer`; existing save effect persists changed snapshots. Do not persist local ticks. Do not initialize before auth restore resolves.
- Login resumes loaded matching deadline and initializes/persists a new run's first turn. Demo timer works in memory and refresh still starts a fresh run.
- Compose pause condition from I02 and stabilize effect dependencies to avoid pause/resume loops. Effects remain active until CombatEffectLayer clears them.
- When integer seconds newly enters 5,4,3,2,1, call `audioController.playEffect("timer-warning", 0.4)` once for that second. Track last alert second to prevent rerender/pause duplicates. Resume at a new lower second can alert once; global mute and effects volume are handled by T01 controller.
- Integration cases assert snapshot reaches login save callback, restore, menu/hidden/effect pause and resume, 5..1 alerts once at 0.4 scale, timeout dispatches `end-turn` once, and demo sync remains non-persistent.

## Acceptance Criteria
- [x] Every player turn starts at 20 seconds; new battle/turn resets it.
- [x] Menu, effect animation, hidden tab preserve remaining milliseconds and resume from them.
- [x] Login refresh resumes saved current-turn time; Local Demo refresh starts a new run.
- [x] Timeout dispatches one end-turn only for an active player battle.
- [x] Seconds 5..1 each trigger one alert at 40% configured SFX volume; global mute applies.
- [x] Display ticks do not cause repeated RunState/API writes.

## Validation
- `npm.cmd run test --workspace @board-game/web -- src/game/useTurnTimer.test.ts src/game/gameActions.test.ts src/App.timer.test.tsx` — hook/reducer/integration tests pass
- `npm.cmd run test --workspace @board-game/api -- src/routes/runRoutes.test.ts` — schema validation passes
- `npm.cmd run lint --workspace @board-game/web && npm.cmd run lint --workspace @board-game/api` — lint passes
- `npm.cmd run build --workspace @board-game/game-core && npm.cmd run build --workspace @board-game/api && npm.cmd run build --workspace @board-game/web` — all workspace builds pass

## Commit Message
```text
feat(game): add persistent player turn timer

Plan: 2026-10-22-interaction-sounds-and-turn-timer
Phase: P01-interaction-feedback-and-turn-clock
Task: T02-persistent-turn-timer

- Persist the active turn deadline with RunState
- Pause, resume, warn, and end expired player turns
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: pending
