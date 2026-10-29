# Task: T02 Card Inspection on Desktop and Touch Devices

## Status: pending

## Goal
Let players inspect complete card details without accidentally playing, choosing, or discarding a card, including when a hand card is disabled.

## Decision Summary
- Desktop hover opens every hand-card preview, even when its play control is disabled.
- On touch, a short tap keeps its existing action; a long press opens details and suppresses the matching click. Apply to hand, reward, and discard cards.
- Dismiss the popup with an × button or by tapping the dimmed backdrop.

## Implementation

### I01. Share full card rendering and inspection behavior
- Related Files:
  - `apps/web/src/components/CardDetailsPopup.tsx` :: accessible card-details dialog and backdrop; new.
  - `apps/web/src/components/CardInspection.tsx` :: reusable hover/long-press controller; new.
  - `apps/web/src/components/CardView.tsx` :: hand-card wrapper, disabled hover inspection, existing rendering; modify.
  - `apps/web/src/components/RewardScreen.tsx` :: inspect reward cards without changing short-tap selection; modify.
  - `apps/web/src/components/DiscardPicker.tsx` :: inspect discard cards without changing short-tap discard; modify.
  - `apps/web/src/styles/board.css` :: popup, hover hit target, and touch styling; modify.

#### Details
- Build preview content from `CardDefinition` (`@board-game/game-core`): art, cost, name, kind, attack/health when present, and full untruncated description.
- Implement touch long press with pointer events and a 500 ms threshold. Cancel on pointer movement greater than 10 CSS px, pointer cancellation, or pointer leaving the card so horizontal hand scrolling does not open the popup.
- After a long press opens details, suppress the generated click/pointer release action. A short tap/click invokes the existing action callback exactly once.
- Detect desktop with `(hover: hover) and (pointer: fine)`. Place hover handling on a wrapper or equivalent hit target because native disabled buttons may suppress pointer events; retain disabled behavior for play/drag.
- Popup semantics: `role="dialog"`, `aria-modal="true"`, accessible × button, backdrop click closes, clicks within the panel do not close. Inspection must not mutate game state.

### I02. Test interactions and edge cases
- Related Files:
  - `apps/web/src/components/CardView.test.tsx` :: hand hover and disabled preview; modify.
  - `apps/web/src/components/CardInspection.test.tsx` :: long-press threshold, scroll cancellation, and click suppression; new.
  - `apps/web/src/components/RewardScreen.test.tsx` :: inspect versus choose; modify/create if absent.
  - `apps/web/src/components/DiscardPicker.test.tsx` :: inspect versus discard; modify.

#### Details
- With fake timers, assert a 500 ms hold opens details; early release and movement beyond 10 px do not.
- Assert a disabled hand card still shows full details on desktop hover.
- Assert short tap invokes the original callback once in each location and long press invokes none.
- Assert × and backdrop close while clicks inside the dialog do not.

## Acceptance Criteria
- [ ] Disabled hand cards remain inspectable on desktop and mobile.
- [ ] Long press on hand/reward/discard cards opens full details without triggering card action.
- [ ] Short tap behavior is unchanged in each location.
- [ ] Full text wraps inside the popup and is dismissible.

## Validation
- `npm test -- apps/web/src/components/CardView.test.tsx apps/web/src/components/CardInspection.test.tsx apps/web/src/components/RewardScreen.test.tsx apps/web/src/components/DiscardPicker.test.tsx` — all interaction tests pass; if a focused file does not exist, add its coverage to the nearest existing component test.
- `npm run build --workspace @board-game/web` — TypeScript and production build pass.

## Commit Message
```text
feat(web): make card details available on hover and long press

Plan: 2026-10-29-mobile-card-ux-opening-redraw-victory
Phase: P01-mobile-and-battle-polish
Task: T02-card-inspection

- Keep disabled hand cards inspectable on desktop
- Add touch long-press details without activating the card
```

## Progress
- [ ] Implementation complete
- [ ] Validation passed
- commit: pending
