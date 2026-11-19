# Task: T01 Tap Inspection Core

## Status: todo

## Goal
Replace the 500 ms long-press in `CardInspection` with tap-to-open details for touch pointers, add the popup action slot, and stop the browser's image menu on cards. No gameplay wiring changes yet (other tasks add minions, rewards and drag).

## Decision Summary
- Mobile D01: tap shows details everywhere; long press removed. D02: closes by backdrop or ×; details open even for disabled cards. D06: block the native image menu and text selection on card elements.

## Implementation
### I01. Input helpers
- `apps/web/src/game/inputMode.ts` (new)
  ```ts
  export function isTouchPointer(event: { pointerType?: string }): boolean; // pointerType === "touch"
  export function prefersTouchGuidance(): boolean; // window.matchMedia?.("(hover: none) and (pointer: coarse)").matches ?? false
  export function useTouchGuidance(): boolean;      // hook, subscribes to the media query "change" event, SSR/jsdom safe
  export const TAP_MOVE_TOLERANCE_PX = 10;          // shared with the drag threshold
  ```
### I02. Tap detection in CardInspection
- `apps/web/src/components/CardInspection.tsx`
  - Props: add `tapDetails?: boolean` (default `true`) and `action?: CardDetailsAction`.
  - Remove `armLongPress`, the 500 ms timer and `longPressTriggered`.
  - Pointer handlers on the wrapper: `onPointerDown` (touch only) records `{ x, y, id }`; `onPointerMove` cancels the tap when movement exceeds `TAP_MOVE_TOLERANCE_PX`; `onPointerUp` (touch only, tap not cancelled, `tapDetails` true, event target is inside the wrapper's DOM subtree) opens the popup and sets `tapConsumed = true`; `onPointerCancel` and `onPointerLeave` cancel.
  - Keep native `onTouchStart/Move/End` as a fallback for browsers without pointer events, guarded by a `gestureHandled` ref so one gesture opens the popup once.
  - `onClickCapture`: if `tapConsumed` is set (the click that follows a touch tap), `preventDefault()` + `stopPropagation()` and clear it, so the child button's `onClick` (select card, choose reward, discard) does not run. Mouse and pen clicks are untouched.
  - Events from the popup (React portal bubbles to the wrapper) must be ignored: check `wrapperRef.current?.contains(event.target as Node)`.
  - When `tapDetails` is false the wrapper does nothing for touch (used by hero power targeting, P03-T04).
  - Pass `action` through to `CardDetailsPopup`.
### I03. Popup action slot
- `apps/web/src/components/CardDetailsPopup.tsx`
  ```ts
  export interface CardDetailsAction { label: string; disabled?: boolean; onSelect(): void }
  // prop: action?: CardDetailsAction
  ```
  Render `<button className="menu-primary card-details-action" type="button" disabled={action.disabled} onClick={() => { action.onSelect(); onClose(); }}>{action.label}</button>` after the description. Backdrop/×/Escape behavior unchanged.
### I04. Suppress the native image menu
- `apps/web/src/styles/board.css`: on `.card-inspection-target, .card-inspection-target *, .minion-card, .game-card, .reward-card, .discard-card, .card-details-art` set `-webkit-touch-callout: none; user-select: none; -webkit-user-select: none;` (keep text selectable inside the popup description if needed: exclude `.card-details-dialog p`). Add `.card-details-action { width: 100%; min-height: 48px; margin-top: 8px; }`.
- Every card `<img>` rendered in `CardView.tsx`, `MinionCard.tsx`, `RewardScreen.tsx`, `CardInspection.tsx` (hover preview) and `CardDetailsPopup.tsx` gets `draggable={false}` and `onContextMenu={(event) => event.preventDefault()}` on the wrapper element (not on the whole page).

## Acceptance Criteria
- [ ] A touch tap on a hand card opens the details popup and does not select the card; a mouse click still selects.
- [ ] A touch tap on a disabled hand card (not enough mana, not your turn) opens details.
- [ ] Tapping the popup ×, backdrop or its action does not reopen the popup.
- [ ] No long-press behavior remains; the 500 ms tests are replaced.
- [ ] Tests, lint, build pass.

## Validation
- `npm run build`
- `npm test -- apps/web/src/components/CardInspection.test.tsx apps/web/src/components/CardView.test.tsx apps/web/src/components/GameBoard.test.tsx`
- Tests: rewrite `CardInspection.test.tsx` (tap opens, move cancels, click after tap swallowed, mouse click passes through, popup closes by × / backdrop / Escape and does not reopen, `tapDetails={false}` ignores taps, `action` button runs and closes); `CardView.test.tsx` (touch tap opens details instead of `onSelect`, mouse click calls `onSelect`); `inputMode.test.ts` (`isTouchPointer`, `prefersTouchGuidance` with a mocked `matchMedia`). First check how jsdom handles `fireEvent.pointerDown(el, { pointerType: "touch" })` and fall back to `new MouseEvent` with a `pointerType` property if needed.
- `npm test`
- `npm run lint`

## Commit Message
```text
feat(web): open card details on touch tap and stop the image menu

Plan: 2026-11-19-card-details-and-touch-drag
Phase: P02-touch-tap-details
Task: T01-tap-inspection-core
```

## Progress
- [ ] implementation complete
- [ ] validation passed
- commit: pending
