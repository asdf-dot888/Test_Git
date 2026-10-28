# Task: T03 Card Hover Preview

## Status: done

## Goal
Show a complete card preview at about 1.5 times the rendered hand-card size only while the mouse is hovering that card, keep the preview outside the clipped horizontal scroller and inside the viewport, and remove the detail popup currently opened by card selection without changing selection/play behavior.

## Decision Summary
- Hover is the only trigger for the enlarged inspection preview; clicking only selects the card as before.
- The enlarged preview contains full card art, name, mana cost, type, minion attack/health when applicable, and exact rules text.
- The hover preview must not block field clicks, drag/drop, or combat effect anchors.

## Implementation

### I01. Render a viewport-bounded full-card hover preview outside the hand scroller
- Related Files:
  - `apps/web/src/components/CardView.tsx` :: `CardView`; add hover state, anchor measurement, and portal preview while preserving the existing button.
  - `apps/web/src/components/HandPanel.tsx` :: `HandPanel`; remove the selected-card details `<aside>` and its `CARD_BY_ID` lookup if no longer otherwise used.
  - `apps/web/src/styles/board.css` :: `.card-description`, `.card-kind`, `.game-card`, new `.game-card-hover-preview` selectors; modify/add.
  - `apps/web/src/components/CardView.test.tsx` :: mouse hover/leave, content, click, and portal placement tests; extend.
  - `apps/web/src/components/GameBoard.test.tsx` :: selected-card preview regression; update.
- Details:
  - Keep the current hand card button, `onSelect`, `aria-pressed`, `disabled`, drag payload, `data-effect-anchor`, instance/card IDs, and effect slot unchanged.
  - On `onMouseEnter`, measure the card button with `getBoundingClientRect()` and render a visual-only preview into `document.body` using `createPortal` from `react-dom`. Hide it on `onMouseLeave` and component unmount. Do not open the preview from click or selected state.
  - Set preview dimensions to about 1.5 times the hovered button's measured width and height. Prefer above the source card; use below if there is insufficient top space. Clamp left/top to an 8px viewport inset so the preview remains visible. Recompute or dismiss on viewport resize/scroll so it cannot remain detached from its card.
  - Render the preview as a non-interactive `<div aria-hidden="true">`, not a second button. Apply `pointer-events:none` so it cannot intercept board clicks or interrupt drag/drop.
  - Preview details must use `CARD_BY_ID` definition values: `artKey`, `name`, `cost`, `kind`, `description`, and `minion.attack`/`minion.maxHealth` when `kind === "minion"`. Use the same `/art/cards/${artKey}.png` source and `object-fit:contain` to display full art.
  - Add a dedicated `.game-card-hover-preview` class so the preview can show `.card-kind` and `.card-description` even though those elements remain hidden on compact hand cards. Keep all content legible at the 1.5x size.
  - Remove `.hand-card-preview` markup and styles associated only with selected-card state. A selected card continues to be selected and usable, but selection alone never displays a popup.
  - The preview is hover-only; on touch devices without hover, retain the existing click-to-select/play behavior and do not show a persistent details popup.

### I02. Verify inspection and normal card interactions
- Related Files:
  - `apps/web/src/components/CardView.test.tsx` :: `CardView` tests; extend.
  - `apps/web/src/components/GameBoard.test.tsx` :: `GameBoard` selected card regression; update.
- Details:
  - Mock `HTMLElement.prototype.getBoundingClientRect` in the hover test with a known card rectangle and use a viewport-sized jsdom window.
  - Assert mouse enter renders one portal preview with full card information and 1.5x dimensions/viewport-safe coordinates; mouse leave removes it.
  - Assert clicking the card calls the existing selection handler but does not render a preview when the pointer is not hovering.
  - Assert the preview has no button role and is `aria-hidden`; verify a minion preview includes attack/health and a spell preview still includes full text.

## Acceptance Criteria
- [x] Hovering a hand card shows its complete card at about 1.5x size; leaving removes the preview.
- [x] Preview includes full art, name, cost, type, exact effect text, and minion attack/health where applicable.
- [x] Preview is not clipped by `.hand-cards` horizontal scrolling and its position is clamped to the viewport.
- [x] Clicking a card selects it as before but does not show a detail popup by itself.
- [x] Preview is a non-interactive portal with no duplicated effect anchors, so it does not block clicks or drag/drop.

## Validation
- `npm.cmd run test --workspace @board-game/web -- src/components/CardView.test.tsx src/components/GameBoard.test.tsx` — hover lifecycle, card details, click selection, and regression tests pass.
- `npm.cmd run build --workspace @board-game/web` — production build passes.
- Manual browser inspection on first, middle, and last visible cards — not run in this turn because no authenticated local game session was active; portal position and bounds were verified in component tests.

## Commit Message
```text
feat(web): inspect hand cards on hover

Plan: 2026-10-28-hero-power-and-hand-card-presentation
Phase: P01-ability-and-hand-ui
Task: T03-card-hover-preview

- Add a viewport-bounded 1.5x full-card hover preview
- Keep selection for play and remove the selected-card popup
```

## Progress
- [x] Implementation complete
- [x] Automated validation passed
- [ ] Manual browser inspection
- commit: pending
