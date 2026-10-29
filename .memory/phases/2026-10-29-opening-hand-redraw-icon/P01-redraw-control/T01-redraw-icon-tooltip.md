# Task: T01 Redraw Icon and Tooltip

## Status: done

## Goal
Replace the text-only opening-hand redraw button beside the hand heading with an accessible, circular gold refresh icon beside the player's deck/discard counts, while preserving the existing one-time redraw rules.

## Decision Summary
- Render the control only while `run.openingHandRedrawAvailable === true`; pass through the existing action-disabled state and callback unchanged.
- PC: reveal tooltip on hover and keyboard focus. Touch: reveal after 500 ms long press, cancel if movement exceeds 10 px, suppress the synthesized click after a long press, and hide 2 seconds after release (confirmed by the user).
- Tooltip copy: `손패를 1회 다시 뽑습니다`.

## Implementation

### I01. Add the redraw control and move it into the deck-count area

- Related Files:
  - `apps/web/src/components/OpeningHandRedrawControl.tsx` :: `OpeningHandRedrawControl`; new accessible control and touch tooltip behavior.
  - `apps/web/src/components/GameBoard.tsx` :: `GameBoard`; render the control as the final child of `.deck-counts`, gated by the run flag, passing `actionsDisabled` and `onRedrawOpeningHand`.
  - `apps/web/src/components/HandPanel.tsx` :: `HandPanelProps`, `HandPanel`; remove redraw-only props and the old text button from `.hand-heading`.
  - `apps/web/src/styles/board.css` :: `.opening-hand-redraw-button`, `.deck-counts`, mobile rules; replace old text-button styles with the round gold icon and tooltip styles.

#### Details
- Component signature:
  ```tsx
  interface OpeningHandRedrawControlProps {
    disabled: boolean;
    onRedraw(): void;
  }
  export function OpeningHandRedrawControl(props: OpeningHandRedrawControlProps): JSX.Element;
  ```
  If the installed React type setup does not expose `JSX.Element`, use the repository's existing return-type convention (`ReactElement`) without changing behavior.
- Component markup:
  - Root wrapper class: `opening-hand-redraw-control`.
  - Button class: `opening-hand-redraw-button`; visible glyph `↻`; `type="button"`; accessible name `시작 손패 다시 뽑기`; `aria-describedby="opening-hand-redraw-tooltip"`.
  - Tooltip element has `id="opening-hand-redraw-tooltip"`, `role="tooltip"`, and exact text `손패를 1회 다시 뽑습니다`.
  - Keep the native `disabled` attribute when `disabled` is true. The tooltip must still be linked by `aria-describedby` when available.
- Touch interaction logic:
  1. On non-mouse `pointerdown`, save the pointer start coordinates and arm a 500 ms timer.
  2. On `pointermove`, cancel the timer if Euclidean movement from the start exceeds 10 px; scrolling/dragging must not open the tooltip.
  3. If the timer fires, set tooltip-visible state and mark the next synthesized click for suppression.
  4. On `pointerup` after a triggered long press, hide the tooltip after 2000 ms. On pointer cancel, clear pending timers and hide it immediately.
  5. A short touch press remains a normal button click and calls `onRedraw` once. A long press must not call `onRedraw`.
  6. Clear pending timers on unmount. Repeated presses must not leave multiple timers active.
- Desktop/keyboard tooltip behavior:
  - CSS reveals the tooltip for `.opening-hand-redraw-control:hover` and `:focus-within`.
  - Only use the touch-visible React state for the long-press class (for example `.is-tooltip-visible`); hover/focus continue to work without JavaScript event state.
- Placement and appearance:
  - In `GameBoard`, place the component immediately after the deck and discard count spans inside `.deck-counts`, only when `run.openingHandRedrawAvailable === true`.
  - Remove `redrawAvailable`, `redrawDisabled`, and `onRedraw` from `HandPanelProps` and its call site; leave card rendering and selection behavior untouched.
  - Icon is a 32–36 px circle, yellow-gold border and glyph, dark/gold gradient background, visible glow, and clear hover/focus-visible treatment. Disabled appearance remains visibly dimmed and uses `cursor: not-allowed`.
  - Tooltip is positioned above or adjacent to the icon so it stays within the viewport at 320 px width. It must not widen `.deck-counts` or create page-level horizontal overflow. At narrow widths, keep deck count spans readable and let the icon remain adjacent.

### I02. Cover redraw placement, availability, and input behavior

- Related Files:
  - `apps/web/src/components/GameBoard.test.tsx` :: opening redraw test; modify.
  - `apps/web/src/components/OpeningHandRedrawControl.test.tsx` :: touch-tooltip and click behavior; new.

#### Details
- Update the existing GameBoard server-render test to assert:
  - The icon button appears inside `.deck-counts` and after the deck/discard counters while the run flag is true.
  - The old text button `시작 손패 다시 뽑기` no longer appears beside the hand heading.
  - The icon is absent when `openingHandRedrawAvailable` is false.
  - The icon receives the native disabled state while actions are disabled.
- Add component tests using Vitest, Testing Library, and fake timers:
  - The accessible button name and tooltip description are present.
  - A short touch down/up followed by click calls `onRedraw` once and does not reveal the touch tooltip.
  - A 500 ms touch long press reveals the tooltip; releasing it and advancing 1999 ms keeps it visible, then advancing 1 ms hides it.
  - The synthetic click after long press does not call `onRedraw`.
  - Moving more than 10 px before 500 ms cancels the tooltip and leaves the next normal click able to redraw.
  - Pointer cancellation/unmount clears pending timers.
- Mouse hover and keyboard focus presentation are CSS states; keep the selector rules explicit and ensure the button uses `aria-describedby` for assistive technology.

## Acceptance Criteria
- [x] The gold circular refresh control appears beside deck/discard counts only while the existing redraw is available.
- [x] Existing redraw click action and disabled behavior are unchanged; the old hand-heading text button is removed.
- [x] PC mouse hover and keyboard focus reveal the tooltip with the specified copy.
- [x] Mobile long press reveals the tooltip without triggering redraw; brief touch triggers redraw normally.
- [x] Touch movement cancels long press, and the tooltip dismisses 2 seconds after release.
- [x] The tooltip and icon fit at narrow mobile widths without horizontal page overflow.
- [x] Browser-independent viewport constraints are encoded in bounded tooltip width; visual device preview was unavailable in this environment.

## Validation
- `npm test --workspace @board-game/web -- src/components/OpeningHandRedrawControl.test.tsx src/components/GameBoard.test.tsx` — touch interaction, accessibility labels, placement, and availability tests pass.
- `npm run build --workspace @board-game/web` — TypeScript and Vite build pass.

## Commit Message
```text
feat(web): move opening redraw to a gold icon

Plan: 2026-10-29-opening-hand-redraw-icon
Phase: P01-redraw-control
Task: T01-redraw-icon-tooltip

- Place the one-time redraw control beside deck and discard counts
- Add hover, focus, and mobile long-press help
```

## Progress
- [x] Implementation complete
- [x] Validation passed (17 focused web tests and web build; browser visual preview unavailable)
- commit: `feat(web): move opening redraw to a gold icon`
