# Task: T01 Attack Legality in the UI and Removal of the All-Attack Button

## Status: done

## Goal
The web UI lets the player attack exactly what the engine allows (taunt first; otherwise any minion or the hero) and the player's all-attack button is gone, including `attackAllReadyMinions` in the engine.

## Decision Summary
D03 and D05 (A: remove the player's button and function; keep the enemy's all-attack record and intent text).

## Implementation
### I01. Legality helper
- Add to `packages/game-core/src/engine.ts` and export from `index.ts`: `getLegalAttackTargets(battle: BattleState, attackerSide: PlayerSide): { minionIds: string[]; heroAllowed: boolean }` built on the T02 `legalAttackTargets` (so UI and engine share one rule). Test it in `engine.test.ts`.
### I02. `apps/web/src/game/dropRules.ts`
- `resolveMinionDrop`: an attack on an enemy minion is allowed only if its id is in `minionIds`; an attack on the enemy hero only if `heroAllowed` (remove `battle.enemyBoard.length > 0`). `getValidDropTargets` follows. Update `dropRules.test.ts` (taunt blocks others, hero attackable past non-taunt minions, assassin hero power unchanged).
### I03. Attack target mode (`GameBoard.tsx`, `MinionLane.tsx`, `gameActions.ts`)
- `GameBoard.tsx` line ~109: the enemy hero is a valid attack target when `legal.heroAllowed` (replace `battle.enemyBoard.length === 0`). `MinionLane.tsx`: in attack mode an enemy minion that is not legal gets `disabled` plus the `is-blocked-target` class (the styling comes in T02); the tap on it shows the error text `도발 하수인을 먼저 공격해야 합니다.`.
- `gameActions.ts`: the `attack` action keeps working (the engine validates); delete the `all-attack` and `finish-all-attack` actions, `autoEndTurnAfterAllAttack` and their handling in `App.tsx` (search for `autoEndTurnAfterAllAttack`, `finish-all-attack`, `onAllAttack`).
### I04. Remove the button
- Delete `components/AllAttackButton.tsx` (and its test if any), remove it from `GameBoard.tsx` (`allAttackDisabled`, `readyMinionCount` if unused, the `leading` prop of `TurnControls` if only used for it; keep `TurnControls` layout so the end-turn button stays where it is on PC; on phones the compact end-turn stays in the hero panel). Delete `attackAllReadyMinions` from `engine.ts`/`index.ts` and its tests; `combatEffects.test.ts` and `gameActions.test.ts` references are removed or rewritten.
- `EnemyIntentPreview.tsx` and `combatEffects.ts` keep the enemy `all-attack` text/events. `GameGuideModal.tsx`/`README.md` wording about the button is handled in T04 but remove obviously wrong strings here if a test pins them.
- CSS: remove the all-attack rules from `styles/board.css`; check the toolbar spacing at PC width and at <= 760px (the end-turn button position must not move).
### I05. Tests
- `GameBoard.test.tsx`, `GameBoard.touch.test.tsx`, `App.interactions.test.tsx`, `App.touch.test.tsx`, `App.test.tsx`: no all-attack button; attack hero past a non-taunt minion works end to end; attacking a non-taunt minion while a taunt exists shows the message and does nothing; the first-run tutorial attack step still completes.

## Acceptance Criteria
- [ ] No `AllAttackButton`, `all-attack` player action or `attackAllReadyMinions` remain (the enemy `all-attack` record stays).
- [ ] UI target highlights equal the engine's legal targets (property-style test over a few boards).
- [ ] `npm run build`, `npm test`, `npm run lint` pass.

## Validation
- `npm run build`
- `npm test -- apps/web/src`
- `npm test`, `npm run lint`
- `grep -rn "AllAttackButton\|attackAllReadyMinions\|autoEndTurnAfterAllAttack" apps packages --include="*.ts" --include="*.tsx"` returns nothing.

## Commit Message
```text
feat(web): attack by taunt rules and remove the all-attack button

Plan: 2026-11-24-hearthstone-rules-and-taunt
Phase: P02-web-ui
Task: T01-attack-targets-and-remove-all-attack
```

## Progress
- [x] done. Engine: `attackAllReadyMinions` removed; `getLegalAttackTargets` (shared by engine and UI). Web: `AllAttackButton`, the all-attack/finish-all-attack actions, autoEnd effect and CSS removed; `TurnControls` lost its `leading` slot; `dropRules` and `GameBoard` use the legal targets (hero attackable past plain minions, blocked enemy minions get `is-blocked-target` via the new `blockedTargetIds`/`blocked` props); the attack action answers a blocked target with 도발 하수인을 먼저 공격해야 합니다. The enemy all-attack record and its text stay. Tests updated/added (gameActions, dropRules, GameBoard, App.interactions, combat tests). 1246 tests (101 files), lint and build pass.
- commit: see Git history
