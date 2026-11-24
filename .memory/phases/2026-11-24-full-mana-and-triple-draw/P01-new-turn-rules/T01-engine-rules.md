# Task: T01 Engine Rules

## Status: done

## Implementation (`packages/game-core/src/engine.ts`)
- `INITIAL_MANA = MAX_MANA` (10) for both sides at battle start; remove `playerManaRecovery`, `ENEMY_MANA_RECOVERY` and their `gameConstants` entries (add `turnDrawCount: TURN_DRAW_COUNT = 3`).
- `startPlayerTurn`: after `expireTemporaryMana`-style cleanup, `battle.playerMana = { current: MAX_MANA, max: MAX_MANA, temporary: 0 }`; draw `TURN_DRAW_COUNT` cards with overflow to the discard pile (new `drawCardsForTurn`), no `pendingDiscardBeforeDraw`.
- `resolveEnemyTurnWithPlayback`: from turn 2 refill `enemyMana` to 10 (turn 1 already 10) and draw 3 (the existing "hand full: discard the lowest-scoring card" step runs per draw while the hand is full).
- Keep `gainRegularMana` for the Mana Spring effect; normalize legacy runs (`max` forced to 10).

## Validation
- `npm run build`, `npm test`, `npm run lint`.

## Commit Message
```text
feat(core): refill mana to 10 every turn and draw 3 cards per turn

Plan: 2026-11-24-full-mana-and-triple-draw
Phase: P01-new-turn-rules
Task: T01-engine-rules
```

## Progress
- [x] Implemented in `engine.ts`: `manaCapForTurn`, mana refill per turn for both sides, 5 draws (`TURN_DRAW_COUNT`), Mana Spring as +1 temporary mana (cap 10), opening hand always holds a card with cost <= 1, enemy all-attack record and "never hold back" attack planning, wasted-spell filter; `catalog.ts` starter curve (Moon Stag x2, Thorn Brute x2, Plague Bearer, Shade Stalker; one Mana Spring; boss-tier cards stay out).
