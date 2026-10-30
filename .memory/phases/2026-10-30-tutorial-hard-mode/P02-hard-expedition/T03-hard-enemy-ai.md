# Task: T03 Hard Enemy AI

## Status: done

## Goal

Make Hard-mode normal enemies and bosses substantially more threatening by increasing ordinary enemy-hero health and letting AI decisions account for the player's private hand and deck order, while keeping Normal-mode AI unchanged.

## Decision Summary

- Hard ordinary enemy hero health is base health +3; Hard boss hero health is base health +5.
- Hard-mode AI may read the player's hand and ordered draw pile. Normal-mode card weights, play selection, and targeting must remain unchanged.

## Implementation

### I01. Apply hard-mode hero health and enemy pressure

- Related Files:
  - `packages/game-core/src/engine.ts` :: `beginEncounter`, `createEnemyDeck`, `enemyCardWeight`; modify
  - `packages/game-core/src/engine.test.ts` :: encounter health and hard enemy composition; modify

#### Details

- Set `battle.enemyHero.maxHealth` to `enemy.maxHealth + 3` for Hard normal encounters and `enemy.maxHealth + 5` for Hard bosses. Set current health to the same value. In Normal, preserve `enemy.maxHealth` exactly.
- In Hard mode, bias normal enemy deck weights toward cards playable at current mana, damage spells when they can remove a player minion or finish the hero, summon effects when board slots are available, and minions that trade favorably into the player board. Keep generated decks at 30 cards and the existing per-card copy cap.
- Do not change initial mana, mana recovery, player health, rewards, deck composition, or encounter count.

### I02. Make Hard AI use hidden player hand and draw order

- Related Files:
  - `packages/game-core/src/engine.ts` :: `scoreEnemyCard`, `selectEnemyCard`, `selectEnemySpellTarget`, `resolveEnemyMinionAttacks`, `resolveEnemyTurnWithPlayback`; modify
  - `packages/game-core/src/engine.test.ts` :: hidden-information decisions and Normal parity; modify

#### Details

- **Data & Schema Fields**: No new persisted fields. The AI reads existing `BattleState.hand` and `BattleState.drawPile` in memory; `drawPile[0]` is the next player draw under `takeDraw`.
- **Hard scoring rules**:
  1. Score each playable card using its effect, cost, board state, player hero health, and opponent hand.
  2. If the player's hand contains a spell that can remove at least 3 total enemy-board health, add 4 points to direct player-hero damage or resilient minion plays, and subtract 6 points from summon effects that would add two or more minions. This makes the AI pressure while reducing vulnerability to the known board clear.
  3. If the next three player draws contain a minion costing 5 or more, add 3 points to Hard AI plays that keep at least one attacker able to trade into a 5-health minion; target the player hero only when no higher-value board trade is available.
  4. If the next three draws contain a damage spell that can remove the AI's highest-attack minion, add 4 points to Hard AI plays that protect or replace that minion, and subtract 3 points from low-health minions the spell would kill.
  5. Resolve ties with the existing deterministic seeded RNG so identical state and seed produce identical AI actions.
  6. In Normal, bypass all hidden-information scoring and preserve current selection and targeting behavior.
- **Targeting rules**:
  - Prefer a lethal hero attack when it wins the battle.
  - Otherwise prioritize killing a player minion that can attack next turn, then the highest-attack minion, then the lowest-health target.
  - Prefer a spell target that kills a minion over a non-lethal target; avoid wasting single-target removal on a minion with 1 attack when another minion can deal 3 or more.
- **Execution Flow / Logic**:
  1. Add a difficulty argument to private scoring/targeting helpers through the active `RunState`; do not expose player hidden data to UI playback events.
  2. Keep selected-card event records limited to the enemy's own action. Never serialize or render the player's hidden deck order in `EnemyCombatRecord`.
  3. Add deterministic tests where changing only the player's hidden hand or next-three draw order changes Hard AI choice, and equivalent Normal states preserve the previous choice.

## Acceptance Criteria

- [ ] Hard normal enemy health is exactly base +3; Hard boss health is exactly base +5; Normal values remain identical to current catalog values.
- [ ] Hard AI decisions respond to hidden hand and next-three draw order in the specified test situations.
- [ ] Normal-mode choices remain covered by regression tests and do not inspect hidden-information scoring.
- [ ] AI ties remain deterministic for a fixed battle seed.
- [ ] No private player hand/deck data is added to UI events or logs.

## Validation

- `npm run test --workspace @board-game/game-core -- src/engine.test.ts`
- `npm run build --workspace @board-game/game-core`
- `npm run build`

## Commit Message

```text
feat(game): make hard expedition enemies highly tactical

Plan: 2026-10-30-tutorial-hard-mode
Phase: P02-hard-expedition
Task: T03-hard-enemy-ai

- Increase hard-mode enemy hero health and tactical card weights
- Use hidden hand and ordered draw information for hard AI decisions
```

## Progress

- [x] Implementation complete
- [x] Validation passed
- commit: pending
