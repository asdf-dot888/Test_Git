# Task: T05 플레이어 턴 타이머 표시 복구

## Status: done

## Goal

플레이어가 전투 화면에 진입했을 때 타이머를 실제로 볼 수 있게 하고, 애니메이션·메뉴·숨겨진 탭 이후에도 기존 20초 제한과 저장된 남은 시간이 올바르게 이어지게 한다.

## Decision Summary

- 타이머는 `TURN` 오른쪽에 `00:20` 형식으로 표시하고, 5초 이하에서는 빨간색 점멸한다.
- 플레이어 활성 턴에서만 카운트하며, 메뉴·숨겨진 탭·전투 연출 중에는 멈춘다. UI에서 전투 연출 종료 뒤 반드시 다시 보이도록 한다.

## Implementation

### I01. 표시 경로와 타이머 재개 회귀 수정

- Related Files:
  - `apps/web/src/App.tsx` :: `GameSessionView`, `useTurnTimer` options, `GameBoard` timer props — screen/turn/effect gating; modify
  - `apps/web/src/game/useTurnTimer.ts` :: `useTurnTimer` — deadline and visibility transitions; modify only if the audit finds the state defect here
  - `apps/web/src/components/GameBoard.tsx` :: `.run-meta` timer node — header placement; modify only if rendering props cause omission
  - `apps/web/src/styles/board.css` :: `.turn-timer`, `.turn-timer.is-hidden`, responsive `.run-meta` rules — ensure timer does not become clipped or display-none; modify
  - `apps/web/src/App.timer.test.tsx` :: `turn timer application wiring` — active turn and post-effect visibility regressions; modify
  - `apps/web/src/components/GameBoard.test.tsx` :: timer heading position/visibility cases; modify

#### Details

- Audit existing visibility dependencies before changing behavior: `visible` must be true exactly when `screen === "game"`, `menuView === "closed"`, player turn is active, battle is active, `!session.resolving`, and no combat effects remain. Do not show a pause label; menu backdrop remains the only pause affordance.
- Ensure the first active player turn creates a 20,000 ms deadline and immediately renders `00:20`; after combat-effect completion the existing paused remainder resumes and the timer node becomes visible without requiring another player action.
- Keep document visibility pause/resume, persisted `TurnTimerState`, no per-tick server saves, red blink at `remainingSeconds <= 5`, `aria-live="off"`, and CSS reduced-motion behavior.
- Check responsive rules at 1280 px, 720 px, and 390 px widths: `.run-meta > span:first-child` may be hidden, but `.turn-number` and `.turn-timer` must remain visible after each breakpoint and fit before the menu button.
- Add regression coverage for fresh run entry, restored run entry, enemy turn hidden state, menu closed return, effects active/complete, and <=5 seconds. This task should repair the actual missing-display cause found in the audit rather than loosening the confirmed pause rules.

## Acceptance Criteria

- [x] Timer appears at the right of `TURN` at the start of every active player turn and resumes after animations.
- [x] Timer remains absent during enemy turn, menu, hidden browser tab, and active combat effects, with the remaining time preserved.
- [x] At 5 seconds or fewer, the timer is red/blinking unless reduced motion is enabled.
- [x] Timer is not clipped or hidden at 1280, 720, or 390 px layouts.

## Validation

- `npm.cmd test --workspace @board-game/web -- src/game/useTurnTimer.test.ts src/App.timer.test.tsx src/components/GameBoard.test.tsx` — timer state, app visibility, and responsive markup regressions pass.
- `npm.cmd run lint --workspace @board-game/web` — React hook and UI lint pass.
- `npm.cmd run build --workspace @board-game/web` — responsive timer UI compiles.

## Commit Message

```text
fix(ui): restore visible player turn timer

Plan: 2026-10-22-enemy-card-ai-victory-flow
Phase: P01-enemy-combat-and-victory-ui
Task: T05-player-turn-timer-visibility

- Keep the timer visible on active player turns
- Preserve pause and resume behavior during effects and menus
- Cover responsive header and restored-turn states
```

## Progress

- [x] 구현 완료
- [x] 검증 통과
- commit: f024a5a

