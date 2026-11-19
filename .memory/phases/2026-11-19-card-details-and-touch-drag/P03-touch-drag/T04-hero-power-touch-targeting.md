# Task: T04 Assassin Hero Power on Touch

## Status: done

## Goal
Keep the assassin hero power usable on touch devices after taps open details: tapping the hero power button enters target mode, and while it is active a tap on a valid target selects it.

## Decision Summary
- Mobile D08 (added during planning): `tapDetails` is suspended only while `targetMode === "hero-power"`; pressing the hero power button again cancels. Warrior and demonist hero powers need no target and are unchanged.

## Implementation
### I01. Suspend details while targeting
- `GameBoard.tsx`: compute `const heroPowerTargeting = targetMode === "hero-power";` and pass `tapDetails={!heroPowerTargeting}` to `MinionLane` (both lanes). In `MinionLane`, `tapDetails` goes to each `CardInspection`; when false, a touch tap falls through to the minion button, whose `onSelect` calls `onSelectTarget` as today.
- The enemy hero already exposes `.hero-target-button` while `targetable`; confirm it receives touch taps (it is a real button, not inside a `CardInspection`).
### I02. Make the mode visible and cancelable on touch
- When `heroPowerTargeting` is active, show a short banner “대상을 선택하세요 · 영웅 능력 버튼을 다시 누르면 취소” near the hero power control (reuse an existing `role="status"` hint style if the board already has one for spell targeting; otherwise add `.target-mode-hint` in `board.css`). `onCancelTarget` already exists; no new action.
- Do not add this banner to PC behavior unless it already exists there.
### I03. Tests
- `GameBoard.test.tsx`: assassin, `targetMode="hero-power"`: a touch tap on an enemy minion calls `onSelectTarget`; with `targetMode="none"` the same tap opens details. Hero power button tap toggles target mode (existing handler).

## Acceptance Criteria
- [ ] On touch, the assassin hero power can be used: tap button → tap target.
- [ ] Outside target mode, taps on minions open details.
- [ ] Tests, lint, build pass.

## Validation
- `npm run build`
- `npm test -- apps/web/src/components/GameBoard.test.tsx apps/web/src/App.test.tsx`
- `npm test`
- `npm run lint`

## Commit Message
```text
fix(web): keep assassin hero power targeting working on touch

Plan: 2026-11-19-card-details-and-touch-drag
Phase: P03-touch-drag
Task: T04-hero-power-touch-targeting
```

## Progress
- [x] implementation complete. No new production code was needed: the `tapDetails={targetMode !== "hero-power"}` wiring came with P02-T02, and the target banner (“영웅 능력 대상을 선택하세요” + 취소 button, `TargetPicker`) and the hero power button's “대상을 선택하세요” status already existed, so the blueprint's I02 banner was not added. This task pinned the behavior with tests.
- [x] validation passed: build clean, lint clean, 1091 tests (97 files). New `App.touch.test.tsx` runs whole-screen touch flows: drag a spell onto an enemy minion, drag a minion card onto a slot, a plain tap only opens details, attack by dragging a minion, Assassin hero power (tap button, tap target), and cancelling the target mode so taps open details again.
- commit: see Git history
