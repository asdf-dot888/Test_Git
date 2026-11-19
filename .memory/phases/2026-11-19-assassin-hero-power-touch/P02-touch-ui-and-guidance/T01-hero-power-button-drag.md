# Task: T01 Hero Power Button Drag

## Status: todo

## Goal
The assassin's hero power button can be pressed and dragged with a finger onto a target. A short press still works as a tap (enter target mode, then tap a target). Releasing on an invalid place cancels without side effects.

## Decision Summary
- D01 both ways; D02 invalid drop cancels completely; D03 assassin only, only when the power is usable, not in target mode, not in the tutorial.

## Implementation
### I01. Props and hook
- `apps/web/src/components/HeroPowerControl.tsx`: add optional props
  ```ts
  getValidTargets?(payload: DragPayload): DropTarget[];
  onDrop?(payload: DragPayload, target: DropTarget): void;
  onDragStateChange?(state: DragState | null): void;
  ```
  (types from `./dragInteractions.js` and `./useTouchDrag.js`). Hooks must run before the `if (!playerClass) return null;` early return, so call `useTouchDrag` at the top with:
  - `payload: { kind: "hero-power", instanceId: "hero-power" }`, `origin: "hero-power"`
  - `enabled: playerClass === "assassin" && ready && !targetMode && Boolean(onDrop)` where `ready` is computed before the hook (move the `ready` expression above the early return using optional chaining on `playerClass`; keep the existing `status` text logic after it).
  - `getValidTargets: () => getValidTargets?.(payload) ?? []`, `onDrop: (payload, target) => onDrop?.(payload, target)`, `onDragStateChange`.
  - `ghost: () => <span className="hero-power-ghost"><img src={`/art/hero-powers/${playerClass}.png`} alt="" /></span>`.
- Spread `touchDrag.handlers` on the `button.hero-power-button` (`onPointerDown/Move/Up/Cancel`, `onDragStart`, and `onClickCapture`). Keep the existing `onClick={handleActivate}`; a drag never reaches it because `onClickCapture` swallows the post-drag click. Render `{touchDrag.ghostPortal}` next to the button.
- Do not attach drag behavior for warrior or demonist (`enabled` is false, so the handlers do nothing).
### I02. Board wiring
- `apps/web/src/components/GameBoard.tsx`: pass `getValidTargets={getValidTargets}`, `onDrop={(payload, target) => onDropInteraction?.(payload, target)}` and `onDragStateChange={setDragState}` to `HeroPowerControl`. The existing `dropHighlights` already outline the enemy minions and the enemy hero when `dragState.valid` contains them; verify the enemy hero panel highlights (`HeroPanel` `dropHighlight`) and enemy lane minions highlight for this payload, and that nothing is highlighted for friendly minions or empty slots.
### I03. Styling
- `apps/web/src/styles/board.css`:
  - `.hero-power-button { touch-action: none; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; }` (only needs to apply on touch; if `touch-action: none` on a small button hurts page scrolling on a phone, scope it to `.hero-power-button.is-assassin`).
  - `.hero-power-ghost` (round, about 56 px, the illustration inside, drop shadow, `pointer-events: none`) and make sure `.touch-drag-ghost` still centers it on the finger (read the existing `.touch-drag-ghost` rule first and reuse its transform; do not duplicate it).
  - While the power is being dragged, give the button a dimmed “picked up” look, using the `dragging` flag from the hook (`is-dragging` class).

## Acceptance Criteria
- [ ] Touch drag of the assassin button: after moving past the threshold the ghost appears, enemy minions and the enemy hero are outlined, the one under the finger gets the hover outline; releasing on one calls `onDrop` once with `{ kind: "hero-power", instanceId: "hero-power" }` and that target.
- [ ] Releasing on a friendly minion, an empty slot, or empty space calls nothing and clears the ghost and the outlines; target mode is not entered.
- [ ] A short tap (no move) still calls `onActivate` once (target mode), exactly as before; no ghost.
- [ ] No click is sent to `onActivate` after a drag ends.
- [ ] Not draggable when: warrior or demonist, power used, mana below 2, not the player's turn, resolving, already in target mode, tutorial active.
- [ ] Mouse and pen input behave exactly as before (click only).
- [ ] Build, lint and tests pass.

## Validation
- `npm run build`
- `npm test -- apps/web/src/components/HeroPowerControl.test.tsx apps/web/src/components/GameBoard.touch.test.tsx`
- Tests to add: `HeroPowerControl.test.tsx` (hook-level behavior with synthetic `pointerType: "touch"` events: drag calls `onDrop`, tap calls `onActivate`, disabled cases, mouse ignored). `GameBoard.touch.test.tsx`: stub `document.elementFromPoint` like the existing drag tests (`pointAt`, `finger` helpers); an assassin board with two enemy minions: drag the button, check outlines (`.lane-enemy .is-drop-valid`, enemy hero panel), drop on `minion:enemy:<id>` and on the hero, and an invalid drop.
- `npm test`
- `npm run lint`

## Commit Message
```text
feat(web): drag the assassin hero power onto a target on touch

Plan: 2026-11-19-assassin-hero-power-touch
Phase: P02-touch-ui-and-guidance
Task: T01-hero-power-button-drag
```
Commit only the files this task changed, by explicit path.

## Progress
- [ ] implementation
- [ ] validation
