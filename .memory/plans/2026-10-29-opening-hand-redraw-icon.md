# Plan: Opening Hand Redraw Icon

## Goal
Move the one-time opening-hand redraw action beside the player's deck/discard counts and make it discoverable with a gold circular refresh icon and device-appropriate help tooltip.

## Phases
| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `done` | Relocate and style the redraw control, preserving its existing game-state behavior while supporting desktop hover and mobile long press. | [P01](../phases/2026-10-29-opening-hand-redraw-icon/P01-redraw-control/phase.md) |

## Dependencies
- P01-T01 moves only the control presentation and its interaction affordances; the game-core redraw action and persisted availability flag remain unchanged.

## Planning Notes
- The control appears only when `run.openingHandRedrawAvailable === true` and remains disabled when `actionsDisabled` is true.
- The tooltip copy is “손패를 1회 다시 뽑습니다”. It is available on mouse hover, keyboard focus, and mobile long press.
- Mobile long press uses the existing card inspection threshold: 500 ms, canceled after pointer movement beyond 10 px. To avoid accidental redraw when releasing after a long press, suppress the synthesized click.
- After touch release, keep the tooltip visible for 2 seconds, then hide it (confirmed by the user).
- This plan contains task blueprints only; implementation occurs during memory-execute.

## Status
- Complete: P01 task T01 implemented and validated.
