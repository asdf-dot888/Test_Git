# Task: T03 One-Time Opening Hand Redraw

## Status: pending

## Goal
Allow one full redraw of the opening three-card hand in the first encounter on desktop and mobile, and prevent reuse after an action or reload.

## Decision Summary
- Redraw all three cards once, only in the first encounter and before the first gameplay action.
- Hide and consume the button immediately when used; if unused, hide it after the first successful action.
- Persist the availability in `RunState`; old saves without the field default to unavailable.

## Implementation

### I01. Add deterministic core state and redraw operation
- Related Files:
  - `packages/game-core/src/types.ts` :: `RunState`; modify.
  - `packages/game-core/src/engine.ts` :: `createRun`, first gameplay-action transitions, exported `redrawOpeningHand`; modify.
  - `packages/game-core/src/index.ts` :: public export if engine exports are explicit; read/modify.
  - `packages/game-core/src/engine.test.ts` :: redraw rules; modify.

#### Details
- Add `openingHandRedrawAvailable?: boolean` to `RunState`; set `true` in `createRun` only. Later encounters must not set it again. Optional typing preserves old run payload compatibility.
- Export `redrawOpeningHand(run: RunState): RunState`. Require availability true, `completedBattles === 0`, a non-null active battle, player side active, and turn 1; otherwise throw `GameRuleError` code `INVALID_ACTION`.
- On success clone the run, combine the three initial hand cards with `drawPile`, shuffle once with existing `shuffle` and `battle.rngState`, deal exactly three new cards, preserve the remaining pile, store the returned RNG state, and consume availability. Do not mutate the deck list or card instance IDs.
- Consume availability after the first successful play-minion, cast-spell, attack, all-attack, fuse, hero-power, or end-turn action. Selection/cancel/menu do not consume. Failed actions do not consume. `advanceRun` never re-enables it.
- Tests cover eligibility, three-card replacement, deterministic RNG/pile update, one-use enforcement, post-action/later-encounter rejection, and no mutation on failure.

### I02. Persist and expose the control
- Related Files:
  - `apps/api/src/routes/runRoutes.ts` :: `runSchema`; modify.
  - `apps/api/src/routes/runRoutes.test.ts` :: field round trip and legacy omission; modify.
  - `apps/web/src/game/localRunStorage.ts` :: optional legacy field validation; modify.
  - `apps/web/src/game/gameActions.ts` :: `GameAction` and redraw reducer branch; modify.
  - `apps/web/src/components/GameBoard.tsx` :: callback/visibility props; modify.
  - `apps/web/src/components/HandPanel.tsx` :: button beside hand; modify.
  - `apps/web/src/components/GameBoard.test.tsx` :: visibility and activation; modify.
  - `apps/web/src/game/gameActions.test.ts` :: action state; modify.

#### Details
- Add `openingHandRedrawAvailable: z.boolean().optional().transform((value) => value ?? false)` to API `runSchema`.
- `isRunState` in local storage accepts absent legacy value and requires boolean if present.
- Add `{ type: "redraw-opening-hand" }`; call the core function through the existing `sessionForRun` flow and existing `GameRuleError` handler.
- Show “시작 손패 다시 뽑기” near the hand only while availability is true; disable during sync, resolution, or enemy playback. The flag change hides it after use or first action.
- Verify saved API runs preserve both true and false, and old payloads load as false.

## Acceptance Criteria
- [ ] Exactly one full redraw is possible at the start of the first encounter on both device classes.
- [ ] A first gameplay action consumes an unused redraw; card selection alone does not.
- [ ] Later encounters never offer redraw.
- [ ] Local/API saved runs preserve eligibility and legacy runs remain loadable.

## Validation
- `npm test -- packages/game-core/src/engine.test.ts apps/web/src/game/gameActions.test.ts apps/web/src/components/GameBoard.test.tsx apps/api/src/routes/runRoutes.test.ts` — core, UI, and persistence cases pass.
- `npm run build` — all workspaces compile and build.

## Commit Message
```text
feat(game): allow one opening hand redraw per expedition

Plan: 2026-10-29-mobile-card-ux-opening-redraw-victory
Phase: P01-mobile-and-battle-polish
Task: T03-opening-hand-redraw

- Persist one-time opening redraw eligibility in RunState
- Expose redraw on desktop and mobile until the first gameplay action
```

## Progress
- [ ] Implementation complete
- [ ] Validation passed
- commit: pending
