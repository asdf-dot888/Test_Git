# Task: T02 Minion Card Details

## Status: todo

## Goal
A touch tap on any board minion (player or enemy) opens the details popup. Because touch no longer uses tap-to-select, the old attack flow (tap attacker, tap target) is unreachable by touch; attacking is done by drag in P03.

## Decision Summary
- Mobile D01: tap shows details for hand, both boards, rewards and the discard picker. PC click-to-select is unchanged.

## Implementation
### I01. Wrap minions
- `apps/web/src/components/MinionLane.tsx`
  - Wrap each `MinionCard` in `<CardInspection card={definition} className="minion-card-inspection" tapDetails={tapDetails}>`. The `lane-slot` wrapper (with `data-effect-anchor` and the drop handlers) stays the outer element so effect anchors and drops keep working. If `CARD_BY_ID` has no definition (unknown id), render the card without the wrapper as today.
  - New prop `tapDetails?: boolean` (default `true`); `GameBoard.tsx` passes `tapDetails={targetMode !== "hero-power"}` now (the full hero power flow is finished in P03-T04) to keep the assassin hero power usable.
- Minion details must show the minion's catalog data (cost, art, stats, description). Show the live stats too: extend `CardDetailsPopup` with optional `liveStats?: { attack: number; health: number; maxHealth: number }` and display “현재 공격 X · 체력 Y/Z” in place of the catalog stats when given. `MinionLane` passes `liveStats` from `MinionState`.
### I02. Disabled state and styling
- `MinionCard` disables its button in several modes; the inspection wrapper still receives the tap (disabled button has `pointer-events: none`; confirm `.minion-card:disabled` in CSS does the same, add it if missing).
- `apps/web/src/styles/board.css`: `.minion-card-inspection { width: 100%; height: 100%; }` and make sure `.lane-slot > .minion-card-inspection > .minion-card` keeps its current size.

## Acceptance Criteria
- [ ] A touch tap on a player or enemy minion opens its popup with live stats; the popup closes by × or backdrop.
- [ ] Mouse click on a minion still selects the attacker or the target exactly as before.
- [ ] Layout and effect anchors of the lanes are unchanged.
- [ ] Tests, lint, build pass.

## Validation
- `npm run build`
- `npm test -- apps/web/src/components/MinionCard.test.tsx apps/web/src/components/GameBoard.test.tsx apps/web/src/components/CardDetailsPopup.test.tsx`
- Tests to add or change: `CardDetailsPopup.test.tsx` (new: live stats text, action slot); `GameBoard.test.tsx` (touch tap on enemy and player minion opens a dialog and does not call `onSelectTarget`; mouse click still does); a test that `tapDetails={false}` lets the tap reach `onSelectTarget`.
- `npm test`
- `npm run lint`

## Commit Message
```text
feat(web): open minion details on touch tap

Plan: 2026-11-19-card-details-and-touch-drag
Phase: P02-touch-tap-details
Task: T02-minion-card-details
```

## Progress
- [ ] implementation complete
- [ ] validation passed
- commit: pending
