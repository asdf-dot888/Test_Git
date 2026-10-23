# Plan: Player Turn Timer Warning Visual

## Goal

Make the last five seconds of a visible player turn easier to notice by adding a continuous red breathing glow to the game-board edges, while hiding it whenever the timer itself is hidden.

## Phases
| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `done` | Connect the existing timer visibility and remaining time to a red animated game-board edge, preserving existing timer and sound cues. | [P01](../phases/2026-10-23-player-turn-timer-warning-visual/P01-board-edge-warning/phase.md) |

## Scope Notes

- Show the red breathing edge when `turnTimer.visible` is true and `remainingSeconds <= 5`.
- Keep the glow active throughout the final five-second countdown. It is a continuous breathing animation, not a separate flash triggered once per second.
- The in-game menu already hides and pauses the timer. Hide the board-edge warning at the same time; show it again from the remaining time when the menu closes.
- Play the same animation when the device requests reduced motion, per the confirmed decision.
- Preserve the existing red blinking timer text and lower-volume warning sound played once per second. Add no sound asset or audio logic.
- No timer duration, saved timer state, turn progression, or game-core changes.

## Task Sequence

1. Add a timer-critical state class to the board from existing timer props, define the red breathing edge effect, and verify visibility transitions with component and application tests.
