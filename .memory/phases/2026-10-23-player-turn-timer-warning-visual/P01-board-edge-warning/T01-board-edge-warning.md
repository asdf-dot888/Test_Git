# Task: T01 Board Edge Warning

## Status: done

## Goal

Visually highlight the game board during the last five seconds of a visible player turn by making its edge continuously breathe with a red glow, then hide and restore that effect with the existing timer visibility state.

## Decision Summary

- Derive the warning from existing `turnTimer.visible` and `turnTimer.remainingSeconds`; add no timer state or data model.
- Use a continuous red breathing animation through the final five seconds. Hide it while the menu or other existing condition hides the timer, and play the same animation under reduced-motion preference.

## Implementation

### I01. Derive critical board styling from timer props

- Related Files:
  - `apps/web/src/components/GameBoard.tsx` :: `GameBoardProps`, `GameBoard` — add conditional class to the battle-board section; modify.
  - `apps/web/src/components/GameBoard.test.tsx` :: `GameBoard` timer markup tests — assert critical class conditions; modify.

#### Details

- **Signatures & Types**:
  ```ts
  export interface GameBoardProps {
    run: RunState;
    turnTimer: { text: string; remainingSeconds: number; visible: boolean };
    // retain all existing fields unchanged
  }
  ```
  Do not add another prop: `turnTimer` already carries the authoritative countdown and visibility state.
- **Execution Flow / Logic**:
  1. Before returning board markup, compute `const showTimerWarning = turnTimer.visible && turnTimer.remainingSeconds <= 5`.
  2. Add class `is-timer-critical` to the existing `<section className="battle-board" id="battle">` only when `showTimerWarning` is true. Keep `battle-board`, `id="battle"`, and `aria-label="카드 전투 보드"` unchanged.
  3. Continue rendering the timer’s current `is-critical` class exactly as it is; the board warning supplements it.
  4. Do not change `App.tsx` visibility rules: `turnTimer.visible` is already false while the in-game menu is open, outside active player-turn display, or while resolving/effects/playback hide the timer.
  5. When visibility becomes false, remove the board warning class so the CSS animation ends. When the visible timer resumes at 5 or fewer seconds, restore the class from the current remaining value.
  6. Add no timer state, reducer action, audio cue, or persisted field.
- **Test Scenarios** in `apps/web/src/components/GameBoard.test.tsx`:
  - At visible `remainingSeconds: 5`, server markup contains `battle-board is-timer-critical`.
  - At visible `remainingSeconds: 6`, the board has no `is-timer-critical` class.
  - At hidden `remainingSeconds: 5`, the board has no `is-timer-critical` class.
  - At visible `remainingSeconds: 1`, the board remains critical through the last second.
  - Existing timer text assertions and all other GameBoard behavior remain intact.

### I02. Implement red breathing edge and test menu transitions

- Related Files:
  - `apps/web/src/styles/board.css` :: `.battle-board.is-timer-critical`, `@keyframes battle-board-timer-breath` — add animation rules.
  - `apps/web/src/App.timer.test.tsx` :: `turn timer application wiring` — assert warning is hidden and restored with the paused timer; modify.

#### Details

- **CSS Behavior**:
  1. Define a keyframe animation `battle-board-timer-breath` with a continuous `ease-in-out` breathing cycle around 1.2–1.5 seconds.
  2. Animate the board’s border from its normal color toward a clear red, and pulse an outer red glow plus a restrained red inset glow. Preserve the board’s existing dark drop shadow and inset board shading in both keyframe endpoints so the board does not visually jump.
  3. Apply the animation only to `.battle-board.is-timer-critical`; use `infinite` iteration so the breathing continues throughout the critical countdown.
  4. Do not add an override in `@media (prefers-reduced-motion: reduce)`: the confirmed behavior intentionally keeps this warning animated regardless of that setting.
  5. Keep the existing `.battle-board.is-shaking` animation and `.turn-timer.is-critical` animation unchanged. Avoid using `transform` in the new keyframes so the timer warning does not conflict with board shake positioning.
- **Application Test Flow** in `apps/web/src/App.timer.test.tsx`:
  1. Use its existing fake timers, active player run, `FakeAudio`, and `GameSessionView` wiring.
  2. Advance the clock from 20 seconds to 5 seconds and assert `.battle-board` has `is-timer-critical`.
  3. Open the in-game menu. Assert the timer has `is-hidden` and the board no longer has `is-timer-critical` while the menu pauses the clock.
  4. Close the menu. Assert the timer is visible again and the board warning class returns at the same remaining value.
  5. Continue the existing countdown assertions for five low-volume warning sounds; verify this visual change does not add or remove audio playback.

## Acceptance Criteria

- [x] The board edge breathes red while a visible timer is at 5, 4, 3, 2, or 1 seconds.
- [x] The effect is absent at 6 seconds and whenever the timer is hidden.
- [x] Opening the menu hides the warning; closing it restores the warning at the paused remaining time.
- [x] The warning animates even under `prefers-reduced-motion: reduce`.
- [x] Existing red timer text and per-second warning audio remain unchanged.

## Validation

- `npm.cmd test --workspace @board-game/web -- src/components/GameBoard.test.tsx src/App.timer.test.tsx` — component and timer/menu transition tests pass.
- `npm.cmd run build --workspace @board-game/web` — web TypeScript/Vite build passes.
- `npm.cmd run lint --workspace @board-game/web` — web lint passes.

## Commit Message
```text
feat(web): add red board edge timer warning

Plan: 2026-10-23-player-turn-timer-warning-visual
Phase: P01-board-edge-warning
Task: T01-board-edge-warning

- Pulse the board edge during the final five seconds
- Follow timer visibility when menus pause the turn
```

## Progress
- [x] Implementation complete
- [x] Validation passed
- commit: created
