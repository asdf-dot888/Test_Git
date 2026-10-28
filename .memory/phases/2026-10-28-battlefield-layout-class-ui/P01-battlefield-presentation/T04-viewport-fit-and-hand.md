# Task: T04 Viewport Fit and Compact Hand

## Status: done

## Goal
Show the complete battle interface without vertical scrolling on desktop and mobile portrait screens, give the battlefield more height, and keep the hand compact but readable.

## Decision Summary
- The battle screen, including its top bar, field, controls, and hand, fits inside `100dvh` without vertical page scrolling.
- The hand is one horizontal row; narrow screens show multiple cards and scroll horizontally for the rest.
- Visible cards keep name, cost, attack, and health readable; selecting a card retains the normal game selection action and exposes a larger detail preview.

## Implementation

### I01. Allocate viewport height to the field and hand
- Related Files:
  - `apps/web/src/styles/board.css` :: `.game-shell`, `.game-topbar`, `.battle-board`, `.player-controls`, `.player-toolbar`, `.hand-panel`, `.hand-cards`, `.game-card`, mobile and short-height media queries; modify.
  - `apps/web/src/components/GameBoard.tsx` :: `game-shell`, top bar, board, toolbar, and hand structure; modify only if a wrapper or semantic constraint is needed.
- Details
  - Use a viewport-constrained game shell based on `height: 100dvh`, `min-height: 0`, and `overflow: hidden`; use grid rows with `minmax(0, 1fr)` for the battle region. Remove the current vertical auto-scroll behavior from the battle shell.
  - Ensure `.battle-board`, `.player-controls`, their grid children, and responsive descendants use `min-height: 0` where needed so intrinsic `min-height: 370/390/470px` values cannot force page overflow.
  - Keep the header, turn timer, menu, player controls, and hand inside the viewport. Allocate the largest remaining region to `.battle-board`; compress margins, padding, and card art before reducing essential labels.
  - Add short-height rules (at minimum `max-height: 760px` and `max-height: 680px`) alongside existing width breakpoints. Validate portrait widths 360px and 390px at heights 640px and 844px, plus desktop 1366x768 and 1440x900.
  - Preserve scroll or overlay behavior for independent dialogs and non-battle screens; only the battle shell must not page-scroll.

### I02. Keep the hand single-row and readable
- Related Files:
  - `apps/web/src/components/HandPanel.tsx` :: `HandPanel` and `.hand-cards`; modify only if accessible overflow cues or selected-card preview markup is needed.
  - `apps/web/src/components/CardView.tsx` :: `CardView` and card name/cost/stats/description markup; modify only if preview semantics require it.
  - `apps/web/src/styles/board.css` :: `.hand-panel`, `.hand-heading`, `.hand-cards`, `.game-card`, `.card-cost`, `.card-name`, `.card-stats`, `.card-description`, selected-card preview styles; modify.
  - `apps/web/src/components/CardView.test.tsx` and `apps/web/src/components/GameBoard.test.tsx` :: selected-card and markup regressions; modify if behavior changes.
- Details
  - Keep `.hand-cards` as one non-wrapping horizontal flex row with `overflow-x: auto`; provide a visible scrollbar/edge affordance and preserve touch panning.
  - Reduce card width/height responsively so several cards fit on narrow portrait viewports. Do not shrink visible name, cost, attack, or health below legible sizes; for minions keep `.card-stats` visible. Spells retain their cost and name.
  - Keep the card's normal `onSelect` behavior: selecting a card still selects it for play/targeting. Add an enlarged, non-blocking detail preview for the selected card that does not intercept field clicks or drag/drop; include full art, name, cost, card type, exact description, and minion attack/health when applicable.
  - Preserve drag payload, `disabled`, mana validation, selected state, effect anchors, and the hand capacity display. Cards beyond the viewport remain reachable via horizontal touch/mouse scrolling.

## Acceptance Criteria
- [x] The viewport-constrained battle shell gives the field the remaining flexible height and keeps the hand in the bottom row.
- [x] Hand cards remain one row and can be reached by horizontal touch or mouse scrolling.
- [x] Visible cards show name and mana cost; minions also show attack and health.
- [x] Selecting a card keeps the existing play/targeting flow and shows a larger detail preview without blocking the board.
- [x] Existing menu/dialog flows, drag-and-drop, timer, and board controls retain their existing overlay and interaction behavior.
- [ ] Manual visual inspection at the specified viewport sizes was not available in this run; local dev servers were not running and the battle UI requires Entra authentication.

## Validation
- `npm run test --workspace @board-game/web -- src/components/CardView.test.tsx src/components/GameBoard.test.tsx` — card selection, displayed data, and battle markup pass.
- `npm run build --workspace @board-game/web` — production build passes.
- Manual responsive inspection at 360x640, 390x844, 1366x768, and 1440x900 — verify no vertical scroll, visible controls, readable visible card stats, and horizontal hand access.

## Commit Message
```text
feat(web): fit battlefield and hand to one viewport

Plan: 2026-10-28-battlefield-layout-class-ui
Phase: P01-battlefield-presentation
Task: T04-viewport-fit-and-hand

- Give the battlefield more room and constrain the battle shell to the viewport
- Keep compact hand cards readable and horizontally scrollable
```

## Progress
- [x] Implementation complete
- [x] Automated validation passed
- [ ] Manual responsive inspection
- commit: pending
