# Task: T03 Wire Hand Cards and Minions

## Status: todo

## Goal
Touch users can drag a hand card or a player minion onto valid targets; valid targets glow while dragging; invalid drops do nothing. Taps keep opening details (P02). PC drag and click are unchanged.

## Decision Summary
- Mobile D01: card play and attacks only by drag on touch. D04: same drop rules, highlight valid targets. D05: direction decides scroll vs drag.

## Implementation
### I01. Drop target attributes
- `apps/web/src/components/MinionLane.tsx`: each `.lane-slot` gets `data-drop-target={formatDropTarget(minion ? { kind: "minion", side, instanceId: minion.instanceId } : { kind: "slot", slotIndex: index })}`. Enemy empty slots are not targets (omit the attribute).
- `apps/web/src/components/HeroPanel.tsx`: the enemy panel gets `data-drop-target="hero:enemy"`.
### I02. Highlights
- `GameBoard.tsx` holds `const [dragState, setDragState] = useState<DragState | null>(null)` and passes `dropHighlights: { valid: DropTarget[]; hovered: DropTarget | null }` down to `MinionLane` and `HeroPanel`, which add `is-drop-valid` / `is-drop-hover` classes by comparing `formatDropTarget`.
### I03. Make cards draggable on touch
- `apps/web/src/components/CardView.tsx`: use `useTouchDrag({ payload: { kind: "card", instanceId }, origin: "hand", enabled: !disabled, getValidTargets, onDrop, ghost })` on the `CardInspection` wrapper. New props from `HandPanel`/`GameBoard`: `getValidTargets(payload)`, `onDropInteraction`, `onDragStateChange`.
- `apps/web/src/components/MinionCard.tsx` / `MinionLane.tsx`: same for player minions (`origin: "board"`, enabled when `canMinionAttack` or fusion targets exist and the lane is not disabled).
- Combine the drag handlers with the tap handlers of `CardInspection` without double-binding: `CardInspection` accepts `dragHandlers?` and merges them (`onPointerDown/Move/Up/Cancel`) so the tap check sees that movement above the tolerance means “not a tap”.
- Keep HTML5 `draggable` and `writeDragPayload` for mouse; call `event.preventDefault()` in `onDragStart` when the gesture started with a touch pointer.
- CSS: `.hand-card-inspection .game-card` keep `touch-action: pan-x` (browser pans horizontally); `.minion-card-inspection` and `.minion-card` get `touch-action: none`; `.touch-dragging` on `body` sets `overscroll-behavior: contain` while a drag is active.
### I04. GameBoard wiring
- `GameBoard.tsx` already receives `onDropInteraction`; pass it plus `getValidDropTargets` (bound to `run`) down. `App.tsx` provides `onDropInteraction={handleDropInteraction}` unchanged.

## Acceptance Criteria
- [ ] Dragging a minion card with a finger onto an empty slot plays it; onto an invalid place does nothing and the card stays in hand.
- [ ] Dragging a spell onto a valid target casts it; a targetless spell works by dropping on the enemy hero (same as PC rules).
- [ ] Dragging a ready minion onto an enemy minion (or the enemy hero when no enemy minions remain) attacks; onto a friendly fusion partner fuses.
- [ ] Valid targets glow during the drag and the glow disappears afterwards.
- [ ] Horizontal swipes on the hand scroll it (no drag started); the tutorial drag steps still advance.
- [ ] Tests, lint, build pass.

## Validation
- `npm run build`
- `npm test -- apps/web/src/components/CardView.test.tsx apps/web/src/components/MinionCard.test.tsx apps/web/src/components/GameBoard.test.tsx`
- `npm test`
- `npm run lint`
- Tests: synthetic touch pointer drags in `GameBoard.test.tsx` (stub `elementFromPoint`) for play-minion, cast-spell, attack, fuse, cancel; highlight classes; mouse HTML5 drag tests unchanged.
- Manual (user): the checklist in P04-T02.

## Commit Message
```text
feat(web): drag cards and minions with a finger on touch devices

Plan: 2026-11-19-card-details-and-touch-drag
Phase: P03-touch-drag
Task: T03-wire-hand-and-minions
```

## Progress
- [ ] implementation complete
- [ ] validation passed
- commit: pending
