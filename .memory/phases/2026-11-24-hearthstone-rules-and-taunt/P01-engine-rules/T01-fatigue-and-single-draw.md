# Task: T01 One Draw per Turn, Fatigue, No Reshuffle

## Status: done

## Goal
Each side draws exactly 1 card at the start of its own turn; when the draw pile is empty the drawer's hero takes fatigue damage (1, 2, 3, ...) instead of the discard pile being reshuffled.

## Decision Summary
D01 (1 draw per turn, hand limit 10, board 6) and D02 (fatigue). Applies to both sides, to turn-start draws and to spell draws.

## Implementation
### I01. `packages/game-core/src/types.ts`
- `BattleState` gets `playerFatigue?: number` and `enemyFatigue?: number` (number of empty draws so far this battle; missing = 0).
### I02. `packages/game-core/src/engine.ts`
- `TURN_DRAW_COUNT = 1` (update its comment). Remove `refillDrawPile` and `refillEnemyDrawPile` (and any now-unused recycle helpers).
- New `function drawCard(run: RunState, battle: BattleState, side: PlayerSide, deferDefeat = false): { run: RunState; card: CardInstance | null }`: takes the first card of the side's draw pile; if the pile is empty, increments `playerFatigue`/`enemyFatigue` and deals that amount of damage to the side's hero with the existing helpers (`dealDamageToPlayerHero(run, amount, deferDefeat)` for the player so armor absorbs it; `dealDamageToEnemyHero(run, amount)` for the enemy, which ends the battle in victory). Check how those helpers return the run (clone or same object) and keep `battle` references valid after the call.
- Replace `takeDraw` / `takeEnemyDraw` and their callers: `drawForPlayerTurn` (now 1 card; overflow beyond hand size 10 goes to the discard pile), the enemy draw loop in `resolveEnemyTurnWithPlayback` (1 card; use `deferDefeat = true` and return `finishDefeat` when the player's hero dies), and `drawForSpell` (the `draw` spell effect; it must now return the possibly new run, so make `applySpellEffect`'s `draw` case use the returned run).
- `startPlayerTurn` keeps its order (burn damage, turn counter, mana, draw); a fatigue death in the draw ends the run through `finishDefeat`. Remove the dead `pendingDiscardBeforeDraw` assignment if it is no longer set (keep the field and the `discardBeforeDraw` export for saved runs).
- `hydrateRunForCurrentBattle`: add `playerFatigue ??= 0`, `enemyFatigue ??= 0` and include them in the early-return check.
- `gameConstants.turnDrawCount` now 1.
### I03. API schema `apps/api/src/routes/runRoutes.ts`
- `battleSchema`: add `playerFatigue` and `enemyFatigue` as `z.number().int().min(0).max(1000).optional()`. Add a case to `runRoutes.test.ts` that a saved run keeps both fields after a round trip.
### I04. Tests (`engine.test.ts`)
- Each side draws exactly 1 card per turn (player turn 1 draw is added in T03; here assert turn >= 2 and the enemy turn).
- Empty draw pile: fatigue 1, 2, 3 on consecutive draws for the player and for the enemy; the discard pile is never reshuffled; armor absorbs player fatigue; fatigue at 1 health ends the battle (defeat for the player, victory for the enemy); a `draw` spell on an empty pile causes fatigue.
- Remove or rewrite the tests that expected 5 draws or a reshuffle ("draws five", "recycles the starter deck", ...). Re-capture the 11 golden hashes and note it.
- Saved battle without fatigue fields: `hydrateRunForCurrentBattle` sets both to 0.

## Acceptance Criteria
- [ ] 1 card per turn for both sides; fatigue works as specified; no code path reshuffles the discard pile.
- [ ] Saved runs without the new fields still load; the API keeps the new fields.
- [ ] `npm run build`, `npm test`, `npm run lint` pass.

## Validation
- `npm run build`
- `npm test -- packages/game-core/src/engine.test.ts apps/api/src/routes/runRoutes.test.ts`
- `npm test`, `npm run lint`

## Commit Message
```text
feat(core): draw one card per turn and add fatigue instead of reshuffling

Plan: 2026-11-24-hearthstone-rules-and-taunt
Phase: P01-engine-rules
Task: T01-fatigue-and-single-draw
```

## Progress
- [x] done. Draw pile empty means fatigue (applyFatigue/drawIntoHand/drawForSpell in engine.ts), TURN_DRAW_COUNT 1, no reshuffle, fatigue fields in BattleState, hydrate defaults and the API battleSchema; tests rewritten (fatigue 1/2/3, armor, lethal fatigue, draw spell fatigue, one draw per turn); `asEnemyTurn` starts the enemy fatigue counter at -1 so scenarios with an empty enemy pile stay at full health; 11 golden hashes re-captured. 1204 tests (101 files), lint and build pass.
- commit: see Git history
