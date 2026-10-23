# Task: T01 Player Mana Curve

## Status: done

## Goal

Change player turn-start mana recovery to scale with the incoming player turn while preserving carried mana and the 10-mana maximum. This gives the player more options in later turns without changing enemy mana rules.

## Decision Summary

- Start each battle at 5/10. At player turn starts 2–3, add 1 mana; turns 4–6, add 2; turn 7 onward, add 3. Add to current unspent mana and cap at 10. Enemy recovery remains +1.

## Implementation

### I01. Player turn-start mana formula

- Related Files:
  - `packages/game-core/src/engine.ts` :: `startPlayerTurn` — apply the tier based on the incremented incoming `battle.turnNumber`; modify.

#### Details

- **Signatures & Types**:
  ```ts
  function startPlayerTurn(run: RunState): RunState
  ```
- **Data & Schema Fields**:
  - Use existing `BattleState.turnNumber: number` and `BattleState.playerMana: { current: number; max: number }`. Do not change persisted schema.
- **Execution Flow / Logic**:
  1. Keep the current preconditions: return unchanged when there is no active battle.
  2. Increment `battle.turnNumber`, set `activeSide` to `player`, and keep `playerMana.max = MAX_MANA`.
  3. Select recovery from the incoming turn: `turnNumber <= 3 ? 1 : turnNumber <= 6 ? 2 : 3`.
  4. Set `playerMana.current = Math.min(MAX_MANA, playerMana.current + recovery)`.
  5. Keep attack refresh and player draw behavior unchanged.
  6. Do not edit the separate enemy mana recovery in `resolveEnemyTurnWithPlayback`.

### I02. Regression tests for thresholds and carry-over

- Related Files:
  - `packages/game-core/src/engine.test.ts` :: player mana recovery tests — replace the old constant +1 expectation and add boundary assertions; modify.

#### Details

- Keep battle start at `{ current: 5, max: 10 }` on turn 1.
- For incoming turns 2, 3, 4, 6, and 7, set a fresh active battle's `turnNumber` to the preceding turn, set player current mana to 0, suppress enemy plays, and call `endPlayerTurn`; assert gains 1, 1, 2, 2, and 3 respectively. This isolates each threshold so the cap does not hide the turn-7 amount.
- Verify carry-over from partial mana, cap at 10, and a legacy max normalization (`max` becomes 10). Verify enemy mana still follows its existing +1 recovery.

## Acceptance Criteria

- [x] Player mana follows the selected thresholds exactly and never exceeds 10.
- [x] Unspent mana is preserved and added to the new recovery amount.
- [x] Enemy mana recovery remains unchanged.

## Validation

- `npm.cmd test --workspace @board-game/game-core -- src/engine.test.ts` — all game-core engine tests pass.
- `npm.cmd run build --workspace @board-game/game-core` — TypeScript build passes.
- `npm.cmd run lint --workspace @board-game/game-core` — game-core lint passes.

## Commit Message

```text
feat(game-core): scale player mana recovery by turn

Plan: 2026-10-23-player-mana-curve-and-menu-guide
Phase: P01-player-balance-and-menu-guide
Task: T01-player-mana-curve

- Recover one, two, then three mana across turn tiers
- Preserve unspent mana and the ten-mana cap
```

## Progress

- [x] Implementation complete
- [x] Validation passed
- commit: created
