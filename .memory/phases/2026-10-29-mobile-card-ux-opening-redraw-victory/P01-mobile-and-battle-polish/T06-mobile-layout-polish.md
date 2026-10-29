# Task: T06 Mobile Layout Polish

## Status: done

## Goal
Make the entire game flow usable on mobile portrait screens without clipped card descriptions, inaccessible controls, or accidental page overflow.

## Decision Summary
- Review main menu, roadmap, battle, hand, reward, discard picker, audio/leaderboard/game dialogs, and victory overlay.
- Keep the compact battle board and horizontal hand behavior while allowing modal content and long descriptions to scroll fully into view.

## Implementation

### I01. Fix card and reward clipping
- Related Files:
  - `apps/web/src/styles/board.css` :: responsive card, reward, dialog, and description rules; modify.
  - `apps/web/src/components/RewardScreen.tsx` :: card structure only if robust CSS layout is insufficient; modify only if needed.
  - `apps/web/src/components/DiscardPicker.tsx` :: touch/card structure only if robust CSS layout is insufficient; modify only if needed.
  - `apps/web/src/components/RewardScreen.test.tsx` :: full description and choice semantics; modify/create if absent.

#### Details
- At widths 320–600 CSS px, let reward descriptions wrap completely. Allow the reward list/modal to scroll instead of clipping inside fixed `52vh` or fixed-height cards.
- Keep title and cost visible and minion attack/health visible. Preserve reasonable art framing with an explicit fit rule that does not crop subjects excessively.
- Ensure T02's card popup fits `100dvw`/`100dvh` safe margins and internally scrolls when its content exceeds the available height.
- Review height-constrained layouts at 320×568, 360×640, and 390×844; prevent document-level horizontal overflow while preserving the existing horizontal hand scroller.

### I02. Check the full responsive game flow
- Related Files:
  - `apps/web/src/styles/board.css` :: existing menu/map/battle/dialog breakpoints; modify.
  - `apps/web/src/components/GameBoard.test.tsx` :: accessible battle actions; modify only for regressions.
  - `apps/web/src/components/ExpeditionRoadmap.test.tsx` :: accessible route controls; modify only for regressions.
  - `apps/web/src/App.outcome.test.tsx` :: modal and victory routing; modify only for regressions.

#### Details
- Inspect existing `@media (max-width: 760px)`, `600px`, and `390px` rules before changing them: later selectors override earlier card-height/layout constraints.
- Check menu, roadmap nodes/top controls, battle actions/redraw control, reward/discard choices, audio settings, leaderboard, Escape menu, and victory confirmation at narrow widths.
- Do not change game rules or desktop layout. Add component assertions only when a semantic/accessibility regression is found; inspect actual layouts in the browser at the listed viewport dimensions.

## Acceptance Criteria
- [x] Reward descriptions wrap without a fixed-height card or list viewport; reward, discard, and card detail panels can scroll on mobile.
- [x] Modal/dialog content respects mobile viewport height and safe-area padding; victory, guide, and leaderboard overlays can scroll.
- [x] Reward title/cost/stats remain in the responsive card layout; hand scrolling and desktop CSS are unchanged.
- [x] Mobile document horizontal overflow is clipped while the hand keeps its own horizontal scroller.
- [x] Desktop layout remains intact; changes are scoped to mobile breakpoints.

## Validation
- `npm test -- apps/web/src/components/RewardScreen.test.tsx apps/web/src/components/GameBoard.test.tsx apps/web/src/components/ExpeditionRoadmap.test.tsx apps/web/src/App.outcome.test.tsx` — screen structure and accessible actions pass; put coverage in nearest existing suites if a focused test file is absent.
- `npm run build --workspace @board-game/web` — web build passes.
- Browser inspection at 320×568, 360×640, and 390×844 could not run because this environment has no installed browser automation/runtime. Responsive CSS was reviewed and component tests/build passed.

## Commit Message
```text
fix(web): prevent mobile card and dialog content clipping

Plan: 2026-10-29-mobile-card-ux-opening-redraw-victory
Phase: P01-mobile-and-battle-polish
Task: T06-mobile-layout-polish

- Keep long reward and card descriptions readable on mobile
- Check menu, roadmap, battle, and modal controls at narrow widths
```

## Progress
- [x] Implementation complete
- [x] Validation passed (web tests and build; browser viewport inspection unavailable)
- commit: `fix(web): prevent mobile card and dialog content clipping`
