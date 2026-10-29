# Task: T04 End Turn After All-Attack

## Status: done

## Goal
Make all-attack end the player's turn after every sequential attack effect has finished, except when those attacks defeat the enemy hero.

## Decision Summary
- Apply equally on desktop and mobile.
- Do not end the turn until all all-attack effect events complete.
- If the enemy hero is defeated, proceed to victory without ending the turn.

## Implementation

### I01. Track the deferred end-turn follow-up
- Related Files:
  - `apps/web/src/game/gameActions.ts` :: `GameSession`, internal action union, and `reduceGameAction`; modify.
  - `apps/web/src/App.tsx` :: dispatch follow-up after the effect queue empties; modify.
  - `apps/web/src/game/gameActions.test.ts` :: auto-end state transitions; modify.

#### Details
- Add `autoEndTurnAfterAllAttack: boolean` to `GameSession`, default false and reset by run start/restore/clear.
- After successful all-attack, set the flag only if the result still has an active battle and the enemy hero has positive health. Lethal attacks do not set it.
- In `App.tsx`, watch for the flag with `combatEffects.length === 0`, `resolving === false`, no enemy playback, an active player battle, and surviving enemy hero; dispatch an internal `finish-all-attack` action.
- That action consumes the flag before invoking existing `endPlayerTurnWithPlayback`/`sessionForEnemyTurn`, preventing duplicate end-turn dispatch across rerenders.
- Do not change existing button availability; it remains disabled when no ready minion exists or the enemy board is occupied.

### I02. Verify sequencing and victory safety
- Related Files:
  - `apps/web/src/game/gameActions.test.ts` :: last-effect-before-turn transition and lethal case; modify.
  - `apps/web/src/components/GameBoard.test.tsx` :: all-attack availability; modify only if a regression appears.

#### Details
- Assert pending auto-end remains while any effect is active and is consumed once the queue empties.
- Assert enemy playback begins only after the final effect clears.
- Assert lethal all-attack leaves the flag false and keeps the victory presentation intact.
- Assert invalid/empty all-attack never schedules an end turn.

## Acceptance Criteria
- [x] A surviving enemy hero causes one automatic end turn after the final attack animation.
- [x] A lethal attack skips enemy-turn playback and continues to victory.
- [x] Existing all-attack availability and behavior are unchanged on both devices.

## Validation
- `npm test -- apps/web/src/game/gameActions.test.ts apps/web/src/components/GameBoard.test.tsx` — sequence and button tests pass.
- `npm run build --workspace @board-game/web` — production build passes.

## Commit Message
```text
feat(game): end turn after all-attack resolves

Plan: 2026-10-29-mobile-card-ux-opening-redraw-victory
Phase: P01-mobile-and-battle-polish
Task: T04-all-attack-auto-end

- Wait for all attack effects before ending the player's turn
- Skip automatic turn end when attacks defeat the enemy hero
```

## Progress
- [x] Implementation complete
- [x] Validation passed
- commit: `feat(game): end turn after all-attack resolves`
