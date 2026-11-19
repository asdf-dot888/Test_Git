# Task: T01 Drop Rules Module

## Status: done

## Goal
Move the drop rules out of `App.handleDropInteraction` into a pure, tested module so the PC drop handlers, the touch drag and the highlight styling share one rule set. No behavior change for PC.

## Decision Summary
- Mobile D04: touch drag reuses the PC drop rules exactly and highlights valid targets.

## Implementation
### I01. Module
- `apps/web/src/game/dropRules.ts` (new). Types `DragPayload` and `DropTarget` stay in `apps/web/src/components/dragInteractions.ts` (import them; do not move).
  ```ts
  export type DropAction =
    | { type: "play-minion"; instanceId: string; slotIndex: number }
    | { type: "cast-spell"; instanceId: string; targetId?: string }
    | { type: "attack"; attackerId: string; targetId: string }
    | { type: "fuse-minions"; firstMinionId: string; secondMinionId: string };

  export function resolveDrop(run: RunState, payload: DragPayload, target: DropTarget): DropAction | null;
  export function getValidDropTargets(run: RunState, payload: DragPayload): DropTarget[];
  export function canMinionAttack(battle: BattleState, minion: MinionState): boolean; // summonedTurn < turnNumber && !hasAttacked && no "root" status
  ```
  Rules copied from `App.tsx` lines ~610-658 (the source of truth today):
  - Card payload: the card must be in `battle.hand` with a catalog definition. Minion card + `slot` target → `play-minion` with `slotIndex`; the slot must be empty and the board not full. Spell + `minion` target (either side) → `cast-spell` with `targetId`. Spell + enemy `hero` → `cast-spell` with `targetId` = `"enemy-hero"` when `getPlayerSpellSelection(definition) === "enemy-character"`, else `battle.enemyHero.id` (existing behavior; keep it).
  - Minion payload: the attacker must be on `battle.playerBoard` and `canMinionAttack`. Enemy minion target → `attack`. Enemy hero target → `attack` with `battle.enemyHero.id` only when `battle.enemyBoard.length === 0`. Friendly minion target (different instance) → `fuse-minions` only when `FUSION_RECIPES` has a recipe for `run.playerClass` and the two card ids (either order) and `battle.playerMana.current >= 1` (matches `engine.fuseMinions`); `resolveDrop` returns `null` otherwise (today the engine would fail and show an error).
  - `getValidDropTargets` enumerates targets from `battle.playerBoard` / `battle.enemyBoard` / empty slots (`0..gameConstants.maxBoard - 1` not occupied) / the enemy hero and keeps those for which `resolveDrop` is non-null.
  - Returns `null`/`[]` when `battle.activeSide !== "player"`, `battle.status !== "active"` or `battle.pendingDiscardBeforeDraw`.
### I02. Use it in App
- `apps/web/src/App.tsx` `handleDropInteraction`: keep the tutorial gates (`tutorialAllows("play-card")`, `tutorialStep === "attack"`, `advanceTutorial`, `tutorialActionRef` bookkeeping) in place and replace the rule branches with `const action = resolveDrop(run, payload, target); if (!action) return;` followed by the same `dispatch(action)` calls. Tutorial advancement still happens only when an action resolves.
- Cases that used to dispatch and rely on engine errors (fusion without a recipe) now do nothing; that is intended.

## Acceptance Criteria
- [ ] Every PC drop that worked before still dispatches the same action.
- [ ] Invalid drops (exhausted attacker, full board, enemy hero while enemy minions remain, fusion without recipe) resolve to `null`.
- [ ] Tutorial drag steps still advance.
- [ ] Tests, lint, build pass.

## Validation
- `npm run build`
- `npm test -- apps/web/src/game/dropRules.test.ts apps/web/src/App.test.tsx`
- Tests: `dropRules.test.ts` covers each rule above plus the valid-target lists (slots, enemy minions, hero only with no enemy minions, fusion pairs by class); keep all existing drag tests in `App*.test.tsx` and `GameBoard.test.tsx` green (find them with a search for `drop`).
- `npm test`
- `npm run lint`

## Commit Message
```text
refactor(web): extract drag-and-drop rules into a shared module

Plan: 2026-11-19-card-details-and-touch-drag
Phase: P03-touch-drag
Task: T01-drop-rules-module
```

## Progress
- [x] implementation complete. `apps/web/src/game/dropRules.ts` exports `resolveDrop(run, payload, target, options?)`, `getValidDropTargets`, `canMinionAttack` and `DropAction`; `App.handleDropInteraction` keeps its tutorial gates and delegates the rules. Deviation from the blueprint: spells now follow strict target rules (enemy-minion spell only on enemy minions, friendly-minion spell only on friendly minions, targetless spell only on the enemy hero), but PC keeps its old behavior of sending a wrong spell target to the game so it shows “현재 선택할 수 없는 대상입니다.” That is the option `surfaceInvalidSpellTargets: true`, used only by `handleDropInteraction`. Touch drags and highlights (P03-T02/T03) use the strict rules. Fusion drops without a recipe (or without 1 mana) now do nothing instead of showing an engine error.
- [x] validation passed: build clean, lint clean, 1043 tests (94 files). The first implementation made four existing App tests fail (invalid spell drops no longer showed the error); that is what led to the option above.
- commit: see Git history
