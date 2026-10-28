# Task: T01 Six-Minion Capacity

## Status: done

## Goal

Allow exactly six minions on each side of the battlefield. Playing a seventh minion or attempting a player-side summon that requires an open slot must retain the existing `MAX_BOARD` error behavior. Enemy card-play eligibility and all card/hero-power summons must use the same shared limit. Render six field slots and anchor combat effects to valid slots 0 through 5.

## Decision Summary

- Both player and enemy fields have a maximum capacity of six minions.
- Minions played from hand and created by battlecries, spells, death effects, enemy actions, and the Demonist hero power all count toward that capacity.
- Keep the existing behavior for full fields; this task changes the number from five to six only.
- `BattleState` already stores each field as a minion array, so no persisted state or schema migration is required.

## Implementation

### I01. Update shared game-engine capacity and regression cases

- Related Files:
  - `packages/game-core/src/engine.ts` :: `MAX_BOARD`, `summonOnBoard`, `isEnemyCardTargetPlayable`, `useHeroPower`, `playMinion`, `castSpell`, `fuseMinions`, and `gameConstants`; modify.
  - `packages/game-core/src/engine.test.ts` :: board-capacity, hero-power, minion-play, summon, and constant tests; modify.

#### Details

- **Shared limit**: Change `const MAX_BOARD = 5` to `const MAX_BOARD = 6`. Keep all engine capacity checks connected to this constant rather than adding new side-specific values.
- **Enemy behavior**: `isEnemyCardTargetPlayable` must allow a seventh attempted card only when the enemy board currently has fewer than six minions. `summonOnBoard` already stops at `MAX_BOARD`; verify that a six-slot field can fill its final slot and that additional summons are skipped as before.
- **Player behavior**: `playMinion`, `castSpell` summon validation, and the Demonist branch in `useHeroPower` must accept a board of five and reject a board of six with `GameRuleError` code `MAX_BOARD`, preserving non-mutation on rejection.
- **Fusion**: Preserve the existing replacement rule: fusing two minions removes both and inserts one in their place, so a full six-minion board becomes five minions. Do not alter its mana cost or insertion behavior.
- **Public constant**: `gameConstants.maxBoard` must expose `6` through the existing exported `gameConstants` object.
- **Regression coverage**:
  - Replace five-full-board setup cases with `gameConstants.maxBoard` or six entries.
  - Change the current “sixth minion” rejection test to prove a sixth minion is accepted on a five-minion board and a seventh is rejected on a six-minion board.
  - Update full-board hero-power and summon-spell cases to use six minions.
  - Update the summon-cap test description and verify summons can fill a board to six but never exceed six.
  - Retain a full-board fusion test and assert six minions become five after two materials are replaced by one.

### I02. Align game UI capacity, six visible slots, and combat-effect anchors

- Related Files:
  - `apps/web/src/components/HandPanel.tsx` :: `HandPanel`; modify.
  - `apps/web/src/components/HeroPowerControl.tsx` :: `HeroPowerControl`; modify.
  - `apps/web/src/components/MinionLane.tsx` :: `MinionLane`; modify.
  - `apps/web/src/components/CombatEffectLayer.tsx` :: `fallbackPoint`; modify.
  - `apps/web/src/styles/board.css` :: `.minion-lane`; modify.
  - `apps/web/src/game/gameActions.ts` :: `ERROR_MESSAGES.MAX_BOARD`; modify.
  - `apps/web/src/game/combatEffects.ts` :: summon anchor creation and hand-play summon anchors; modify.
  - `apps/web/src/components/GameBoard.test.tsx` :: field slot rendering test; modify.
  - `apps/web/src/components/MinionLane.test.tsx` :: six-slot rendering test; modify.
  - `apps/web/src/components/CombatEffectLayer.test.tsx` :: fallback position for slot 5; modify.
  - `apps/web/src/game/useGameSession.test.ts` :: full-lane action test; modify.
  - `apps/web/src/components/HeroPowerControl.test.tsx` :: Demonist full-board test; modify if present or add the six-capacity case.
  - `apps/web/src/game/combatEffects.test.ts` :: slot-5 summon anchor coverage; modify or add.

#### Details

- **Use shared constant in controls**: Import `gameConstants` from `@board-game/game-core` in `HandPanel.tsx` and `HeroPowerControl.tsx`; replace hardcoded `boardSize >= 5`, `boardSize < 5` checks with comparisons against `gameConstants.maxBoard`. Keep existing card-cost, targeting, and resource rules unchanged.
- **Field rendering**: In `MinionLane.tsx`, render `gameConstants.maxBoard` slots instead of five. Update the accessible lane count from `/ 5` to `/ 6`.
- **Layout**: Change `.minion-lane` from `repeat(5, minmax(0, 1fr))` to `repeat(6, minmax(0, 1fr))`, retaining responsive gap and existing card styling.
- **User-facing error**: Change the `MAX_BOARD` Korean message from five to six minions.
- **Combat anchors**: Replace every fixed `Math.min(4, ...)` used to cap minion anchor slots in `combatEffects.ts` with the shared last valid slot, `gameConstants.maxBoard - 1`. This includes player and enemy summon targets and played-minion/battlecry source anchors. In `CombatEffectLayer.tsx`, divide fallback slot position by `gameConstants.maxBoard` instead of five so slot 5 is centered in the sixth column. Keep hand slot clamping at 9 unchanged.
- **Regression coverage**:
  - `GameBoard.test.tsx` must expect twelve `.lane-slot` elements total, six per side.
  - The session action test should establish six friendly minions, attempt to play another from hand, and assert the action is rejected without changing the run and reports the six-minion message.
  - The Demonist hero-power control must be disabled at six minions and enabled at five when mana, shards, and turn state allow it.
  - Combat-effect tests must confirm a summon targeting the sixth occupied position resolves with slot index 5 rather than 4.

## Acceptance Criteria

- [x] `gameConstants.maxBoard` is 6 and every engine path uses the shared capacity.
- [x] Player and enemy fields can each render six minions, including the sixth slot.
- [x] Direct play, spells, hero powers, enemy AI, and summon effects respect six slots and preserve current overflow behavior.
- [x] Capacity UI and error text say six, and combat effect anchors correctly reach slot 5.
- [x] Existing full-board fusion remains functional without exceeding six minions.

## Validation

- `npm test --workspace @board-game/game-core -- src/engine.test.ts` — engine capacity, summons, and fusion behavior.
- `npm test --workspace @board-game/web -- src/components/GameBoard.test.tsx src/components/MinionLane.test.tsx src/components/HeroPowerControl.test.tsx src/components/CombatEffectLayer.test.tsx src/game/useGameSession.test.ts src/game/combatEffects.test.ts` — six-slot UI and combat anchors.
- `npm run build` — TypeScript compilation and production build across workspaces.

## Commit Message

```text
feat(game): expand battlefield capacity to six minions

Plan: 2026-10-28-six-minion-field-limit
Phase: P01-six-slot-battlefield
Task: T01-six-minion-capacity

- Allow six minions for each side and all summon paths
- Render six field slots and align UI and effect anchors
```

## Progress

- [x] Implementation complete
- [x] Validation passed
- commit: completed
