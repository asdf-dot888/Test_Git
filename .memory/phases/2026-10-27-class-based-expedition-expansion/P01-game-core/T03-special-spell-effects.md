# Task: T03 Special Spell Effects

## Status: done

## Goal
Add random damage, adjacent-minion cleave, and opponent-deck theft to the typed card model and deterministic battle engine.

## Decision Summary
- Random damage is inclusive 0 to 5 and can target any enemy minion or hero; zero still spends card/mana.
- Cleave targets an enemy minion; adjacent minions take floor(primary/2), minimum 1.
- Theft moves one random card from opponent draw pile to caster hand; full hand blocks use without cost.

## Implementation

### I01. Extend spell types, catalog, and engine
- Related Files:
  - packages/game-core/src/types.ts :: SpellEffect, EnemyCombatRecord.
  - packages/game-core/src/catalog.ts :: CARD_CATALOG, describeSpellEffects, spell.
  - packages/game-core/src/engine.ts :: applySpellEffect, castSpell, selectEnemySpellTarget, isEnemyCardPlayable, scoreEnemyCard, playEnemyCard.
- Details
  - Add variants { kind: "randomDamage"; min: 0; max: 5 }, { kind: "cleave"; amount: number; target: "enemyMinion" }, { kind: "stealFromOpponentDeck"; count: 1 }.
  - Add one normal-tier card per effect, each with Korean description stating actual target and amount. All are available according to neutral reward rules.
  - Use battle.rngState and current deterministic random helpers. Random damage selects integer 0..5. Zero is a successful cast and consumes card/mana.
  - Random damage accepts an enemy minion ID or "enemy-hero", including while enemy minions are alive.
  - Cleave requires a live minion target. Snapshot enemy board order, apply primary damage, then Math.max(1, Math.floor(amount / 2)) to immediate left/right minions. Remove dead minions after all damage so death effects resolve once.
  - Theft selects uniformly from opponent draw pile, removes that exact CardInstance, adds it to caster hand. Empty source deck is a successful cast with no transfer. A caster hand of 10 blocks action before any mutation. Mirror behavior for enemy caster.
  - Enemy AI must not select theft when its hand is full. Preserve effect and target details in EnemyCombatRecord.

### I02. Test spell boundaries and enemy selection
- Related Files:
  - packages/game-core/src/engine.test.ts :: spell, RNG, deck-zone, enemy choice tests.
- Details
  - Verify seeded repeatability, random endpoints, zero consumption, hero targeting, cleave at edges/middle and simultaneous deaths, theft pile removal and identity, empty deck, full-hand rollback, and symmetric enemy behavior.

## Acceptance Criteria
- [x] New spells have exact descriptions and seeded behavior.
- [x] Cleave hits only the chosen minion and adjacent minions using the agreed formula.
- [x] Theft moves one card without overfilling hands.
- [x] Enemy AI never selects an illegal theft action.

## Validation
- npm run test --workspace @board-game/game-core -- src/engine.test.ts
- npm run build --workspace @board-game/game-core

## Commit Message
feat(game-core): add random cleave and theft spells

Plan: 2026-10-27-class-based-expedition-expansion
Phase: P01-game-core
Task: T03-special-spell-effects

- Add random damage and adjacent cleave
- Add symmetric opponent-deck theft with hand validation

## Progress
- [x] Implementation complete
- [x] Validation passed
- commit: pending
