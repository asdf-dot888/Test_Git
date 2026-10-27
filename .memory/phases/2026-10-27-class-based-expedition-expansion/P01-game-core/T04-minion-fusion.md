# Task: T04 Minion Fusion

## Status: done

## Goal
Implement nine class-associated fusion pairs. A valid fusion consumes two friendly minions and 1 mana, then summons their predefined upgraded replacement.

## Decision Summary
- Launch with 9 fixed pairs, 3 per class; drag a compatible minion onto the other to fuse.
- Each result has unique stats, effect, and art; both source minions are consumed.

## Implementation

### I01. Define recipes and fusion API
- Related Files:
  - packages/game-core/src/types.ts :: add FusionRecipe.
  - packages/game-core/src/catalog.ts :: add result cards and FUSION_RECIPES.
  - packages/game-core/src/engine.ts :: add fuseMinions; use assertPlayerTurn, ensureMana, createMinion, triggerMinionEffect.
  - packages/game-core/src/index.ts :: export fuseMinions and FUSION_RECIPES.
- Details
  - Recipe fields: id, classId, sourceCardIds (readonly pair), resultCardId.
  - Define exactly 3 recipes per class from unique same-class minions. Add 9 result minions with unique IDs, class tags, stats, descriptions/effects, normal reward tier, and art keys. Results are stronger than either input and match class archetype.
  - Signature: fuseMinions(run: RunState, firstMinionId: string, secondMinionId: string): RunState.
  - Validate active player turn, distinct live friendly minions, matching unordered recipe, 1 mana, and board capacity after consuming both. Failure leaves original state unchanged.
  - Remove both sources and place result at lower source index; spend 1 mana; allocate unique ID; set summonedTurn to current turn and hasAttacked true. Trigger result battlecry after insertion. Enemy fusion is invalid.

### I02. Test fusion data and transitions
- Related Files:
  - packages/game-core/src/engine.test.ts :: recipe and action tests.
- Details
  - Assert 9 recipes/3 per class, valid IDs, order-independent matching, insufficient mana, wrong turn, invalid pair, same instance, capacity, placement, attack lock, unique ID, battlecry, and rollback.

## Acceptance Criteria
- [x] Exactly 9 recipes exist, 3 per class.
- [x] Valid fusion atomically spends 1 mana, consumes two inputs, and places one result at lower source index.
- [x] Invalid fusion does not mutate run.

## Validation
- npm run test --workspace @board-game/game-core -- src/engine.test.ts
- npm run build --workspace @board-game/game-core

## Commit Message
feat(game-core): add class minion fusion recipes

Plan: 2026-10-27-class-based-expedition-expansion
Phase: P01-game-core
Task: T04-minion-fusion

- Define nine class fusion recipes
- Apply fusion atomically for one mana

## Progress
- [x] Implementation complete
- [x] Validation passed
- commit: pending
