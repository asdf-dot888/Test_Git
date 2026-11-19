# Task: T02 App Drop Handling for the Hero Power

## Status: todo

## Goal
Make `App.handleDropInteraction` accept the hero power payload: dispatch `use-hero-power` with the resolved target, keep the tutorial blocked, and make sure a successful drop leaves no target mode behind.

## Decision Summary
- D01 (drag uses the hero power on release), D02 (invalid drop does nothing), D03 (tutorial keeps the hero power blocked).

## Implementation
### I01. Handler
- `apps/web/src/App.tsx` `handleDropInteraction(payload, target)`: at the top, `if (payload.kind === "hero-power" && tutorialMode !== "inactive") return;` before the existing tutorial gates (those gates only look at `card` and `minion` payloads; keep them as is, adjusting the narrowing so TypeScript accepts the new union).
- Pass `{ surfaceInvalidSpellTargets: true }` as today (it only affects spell drops; hero power drops ignore it).
- `const action = resolveDrop(run, payload, target, …); if (!action) return;` then the existing `dispatch(action)`. `DropAction` now includes `use-hero-power`, which is already a valid `GameAction` (`{ type: "use-hero-power"; targetId?: string }` in `game/gameActions.ts`), so no new action type is needed. Confirm the TypeScript union of `DropAction` is assignable to `GameAction`; if the compiler objects, narrow with a small mapping instead of a cast.
### I02. No lingering target mode
- A drag never dispatches `select-hero-power`, so `session.targetMode` stays `"none"`. If a drag somehow starts while `targetMode === "hero-power"` (the control disables dragging then, see P02-T01), the drop dispatches `use-hero-power`, which the game already handles from any mode (`gameActions.ts` resets selection after a successful action). Add a test for this.

## Acceptance Criteria
- [ ] Dropping the hero power payload on an enemy minion dispatches `use-hero-power` with that minion's id; on the enemy hero with `"enemy-hero"`.
- [ ] Dropping on an invalid target dispatches nothing and leaves `targetMode` as it was (`"none"`).
- [ ] During the first-run tutorial the drop does nothing.
- [ ] After a successful drop the session has used the hero power (`heroPowerUsed`, mana −2, damage dealt) and `targetMode` is `"none"`.
- [ ] Build, lint and tests pass.

## Validation
- `npm run build`
- `npm test -- apps/web/src/App.test.tsx apps/web/src/App.touch.test.tsx`
- Tests to add in `App.touch.test.tsx` (reuse its setup helpers): an assassin run with enemy minions; call the drop through the board in the next task if easier, otherwise render `App` with a saved run and drive `GameBoard`'s `onDropInteraction`. At minimum a unit-style test that `handleDropInteraction` path produces the expected state for minion, hero, invalid target and tutorial.
- `npm test`
- `npm run lint`

## Commit Message
```text
feat(web): use the assassin hero power from a drop

Plan: 2026-11-19-assassin-hero-power-touch
Phase: P01-drag-rules
Task: T02-app-drop-handling
```
Commit only the files this task changed, by explicit path.

## Progress
- [ ] implementation
- [ ] validation
