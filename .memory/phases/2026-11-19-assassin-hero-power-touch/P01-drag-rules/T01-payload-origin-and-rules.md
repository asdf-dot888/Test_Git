# Task: T01 Hero Power Payload, Gesture Origin and Drop Rules

## Status: done

## Goal
Teach the shared drag layer about the assassin hero power: a new payload kind, a gesture origin that never scrolls, and drop rules that match the engine. Pure code and unit tests; no UI yet.

## Decision Summary
- Decision D01: drag the button onto a target. D02: an invalid drop cancels. D03: same targets as the tap flow (enemy minions and the enemy hero, **including the hero while enemy minions remain**), assassin only, only while the power is usable.

## Implementation
### I01. Payload type
- `apps/web/src/components/dragInteractions.ts`: change `DragPayload` to
  ```ts
  export type DragPayload =
    | { kind: "card" | "minion"; instanceId: string }
    | { kind: "hero-power"; instanceId: "hero-power" };
  ```
  Leave `writeDragPayload` as is. Keep `readDragPayload` returning only `card` / `minion` (HTML5 drag is not used for the hero power); its text fallback and `DRAG_TYPE` are unchanged. Fix any type error in callers (for example `payload.kind === "card" ? … : …` in `dropRules.ts`, `CardView`, `MinionLane`, `useTouchDrag`) so each branch is explicit.
### I02. Gesture origin
- `apps/web/src/components/touchDrag.ts`: `export type DragOrigin = "hand" | "board" | "hero-power";`. In `classifyGesture`, only `"hand"` can return `"scroll"`; `"board"` and `"hero-power"` return `"drag"` once the movement passes `DRAG_START_THRESHOLD_PX`.
### I03. Drop rules
- `apps/web/src/game/dropRules.ts`:
  - Extend `DropAction` with `| { type: "use-hero-power"; targetId: string }`.
  - Add `function resolveHeroPowerDrop(run: RunState, battle: BattleState, target: DropTarget): DropAction | null`:
    - `run.playerClass !== "assassin"` → `null`; `battle.heroPowerUsed` → `null`; `battle.playerMana.current < 2` → `null` (use a named constant `HERO_POWER_MANA_COST = 2` in this file with a comment that it mirrors the engine and `HeroPowerControl`).
    - `target.kind === "minion" && target.side === "enemy"` and the minion exists in `battle.enemyBoard` → `{ type: "use-hero-power", targetId: target.instanceId }`.
    - `target.kind === "hero" && target.side === "enemy"` → `{ type: "use-hero-power", targetId: "enemy-hero" }` (always allowed, even with enemy minions).
    - anything else (slots, friendly minions, player hero) → `null`.
  - In `resolveDrop`, route `payload.kind === "hero-power"` to `resolveHeroPowerDrop` (still behind the existing `canAct(battle)` check). `getValidDropTargets` needs no change; verify it returns the enemy minions and the enemy hero.

## Acceptance Criteria
- [ ] `resolveDrop` returns `use-hero-power` with the minion id for a live enemy minion and with `"enemy-hero"` for the enemy hero (also when enemy minions exist).
- [ ] It returns `null` for: a non-assassin class, the power already used, mana below 2, the enemy's turn, finished battle, `pendingDiscardBeforeDraw`, a slot, a friendly minion, the player hero, or an unknown minion id.
- [ ] `getValidDropTargets` for the hero power lists exactly the enemy minions plus the enemy hero.
- [ ] `classifyGesture` with origin `"hero-power"` returns `"drag"` for a horizontal move (never `"scroll"`), `"pending"` inside the threshold.
- [ ] Existing card and minion drop tests are unchanged and pass. Build, lint and tests pass.

## Validation
- `npm run build`
- `npm test -- apps/web/src/game/dropRules.test.ts apps/web/src/components/touchDrag.test.ts`
- Tests to add: in `dropRules.test.ts` a `describe("hero power drops")` covering every acceptance line above (build the run with the same helpers the file already uses; set `playerClass: "assassin"`, `heroPowerUsed`, `playerMana.current`); in `touchDrag.test.ts` the `"hero-power"` origin cases.
- `npm test`
- `npm run lint`

## Commit Message
```text
feat(web): add hero power drag payload and drop rules

Plan: 2026-11-19-assassin-hero-power-touch
Phase: P01-drag-rules
Task: T01-payload-origin-and-rules
```
Commit only the files this task changed, by explicit path (`git add <file>`), not by folder: the working tree has unrelated modified files.

## Progress
- [x] implementation complete. `DragPayload` gained `{ kind: "hero-power"; instanceId: "hero-power" }`; `DragOrigin` gained `"hero-power"` (`classifyGesture` now scrolls only for `"hand"`); `dropRules.ts` exports `HERO_POWER_MANA_COST` and resolves hero power drops (`use-hero-power`, enemy hero always allowed). No other caller needed changes: the existing `payload.kind === "card" ? … : …` code compiled as is.
- [x] validation passed: build clean, lint clean, 1101 tests (97 files; +6 new). New tests cover each acceptance line (`dropRules.test.ts`: hero power drops and valid targets; `touchDrag.test.ts`: `"hero-power"` origin).
- Note: `components/dragInteractions.ts` was CRLF in the working tree (the committed version is LF); it was converted back to LF before editing so the commit diff stays small.
- commit: see Git history
