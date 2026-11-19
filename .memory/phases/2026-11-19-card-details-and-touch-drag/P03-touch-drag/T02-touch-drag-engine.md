# Task: T02 Touch Drag Engine

## Status: todo

## Goal
A reusable pointer-event drag controller for touch input: starts after a 10 px move, shows a floating card ghost, hit-tests the drop target under the finger, reports valid targets for highlighting, and cancels cleanly. It is not wired into the cards yet.

## Decision Summary
- Mobile D04: ghost follows the finger, valid targets are highlighted, an invalid drop cancels and the card returns. D05: hand scroll vs drag is decided by finger direction; board minions drag immediately after a small movement.

## Implementation
### I01. Pure helpers
- `apps/web/src/components/touchDrag.ts` (new)
  ```ts
  export const DRAG_START_THRESHOLD_PX = 10; // equals TAP_MOVE_TOLERANCE_PX
  export type GestureKind = "pending" | "drag" | "scroll";
  export function classifyGesture(dx: number, dy: number, origin: "hand" | "board"): GestureKind;
  // pending while hypot(dx, dy) <= threshold; board: drag; hand: scroll when |dx| > |dy| (angle under 45° from horizontal), else drag.
  export function parseDropTarget(element: Element | null): DropTarget | null;
  // walks up to the closest [data-drop-target]; formats "slot:<index>", "minion:<player|enemy>:<instanceId>", "hero:enemy".
  export function formatDropTarget(target: DropTarget): string; // inverse of parseDropTarget, used by components
  ```
### I02. Hook
- `apps/web/src/components/useTouchDrag.ts` (new)
  ```ts
  export interface TouchDragOptions {
    payload: DragPayload;
    origin: "hand" | "board";
    enabled: boolean;                       // false for disabled cards
    getValidTargets(): DropTarget[];        // from dropRules.getValidDropTargets
    onDrop(payload: DragPayload, target: DropTarget): void;
    onDragStateChange?(state: DragState | null): void;
    ghost: () => ReactNode;                 // what to render in the floating ghost
  }
  export interface DragState { payload: DragPayload; x: number; y: number; hovered: DropTarget | null; valid: DropTarget[] }
  export function useTouchDrag(options: TouchDragOptions): { handlers: { onPointerDown; onPointerMove; onPointerUp; onPointerCancel }; ghostPortal: ReactNode | null; dragging: boolean };
  ```
  - Only `pointerType === "touch"` starts a drag (mouse/pen keep HTML5 drag).
  - `onPointerDown`: store origin point, `setPointerCapture` so moves keep arriving, set `gesture = "pending"`.
  - `onPointerMove`: `classifyGesture`; `scroll` → release (let the browser keep the pan; do nothing); `drag` → `preventDefault`, update ghost position, resolve `hovered` through `document.elementFromPoint(x, y)` (the ghost has `pointer-events: none`), report to `onDragStateChange`.
  - `onPointerUp`: if dragging and `hovered` is in `valid` → `onDrop`; otherwise cancel (no action; the source card is never removed from the DOM so it “returns”). A tap (no drag) does nothing here; `CardInspection` handles taps.
  - `onPointerCancel`/unmount/`blur`: cancel and clear state; remove listeners and the ghost portal.
  - Suppress the HTML5 `dragstart` for touch: expose `onDragStart: (e) => e.preventDefault()` in `handlers` which components attach only when the last pointer was touch.
  - Ghost: portal to `document.body`, `position: fixed`, 96×140 px card clone (`.touch-drag-ghost`), centered above the finger (offset −70 px) so the finger does not hide it.
### I03. Styles
- `apps/web/src/styles/board.css`: `.touch-drag-ghost { position: fixed; z-index: 85; pointer-events: none; opacity: .92; transform: translate(-50%, -100%) scale(1.05); box-shadow: 0 14px 34px #000c; }`, `.is-drop-valid` (gold glow) and `.is-drop-hover` (brighter glow) for lanes, minions and the enemy hero.

## Acceptance Criteria
- [ ] `classifyGesture` returns the right kind for horizontal, vertical, diagonal and tiny movements for both origins.
- [ ] `parseDropTarget`/`formatDropTarget` round-trip every `DropTarget` kind and ignore elements without the attribute.
- [ ] Hook: drag starts after the threshold, drops only on valid targets, cancels on pointercancel/unmount, ignores mouse pointers, never leaves the ghost behind.
- [ ] Tests, lint, build pass.

## Validation
- `npm run build`
- `npm test -- apps/web/src/components/touchDrag.test.ts apps/web/src/components/useTouchDrag.test.tsx`
- Tests with synthetic pointer events and a stubbed `document.elementFromPoint`.
- `npm test`
- `npm run lint`

## Commit Message
```text
feat(web): add a touch drag controller with drop hit-testing

Plan: 2026-11-19-card-details-and-touch-drag
Phase: P03-touch-drag
Task: T02-touch-drag-engine
```

## Progress
- [ ] implementation complete
- [ ] validation passed
- commit: pending
