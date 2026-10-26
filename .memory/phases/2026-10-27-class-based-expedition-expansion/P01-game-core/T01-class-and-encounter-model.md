# Task: T01 Class and Encounter Model

## Status: done

## Goal
Create class-aware new runs with 30-card starter decks and class-aware rewards; ensure each phase's encounters use its own theme. Keep classless local saves playable.

## Decision Summary
- Classes: warrior, assassin, demonist. Each starter deck is 10 class cards plus 20 shared neutral cards.
- Each phase has exactly 3 themed normal enemies and its phase boss. Missing class metadata means legacy.

## Implementation

### I01. Add class and encounter data
- Related Files:
  - packages/game-core/src/types.ts :: add PlayerClass; extend CardDefinition, EnemyDefinition, RunState.
  - packages/game-core/src/catalog.ts :: CARD_CATALOG, starter lists, enemy lists, lookup maps.
  - packages/game-core/src/index.ts :: export public types/catalogs.
- Details
  - Define PlayerClass = "warrior" | "assassin" | "demonist". Add optional RunState.playerClass; absent means legacy. Add optional CardDefinition.classId and race tag "demon".
  - Export PLAYER_CLASS_DEFINITIONS with display name, archetype/power summary, and starter IDs.
  - Add 10 class-only cards per class, three token-only Demonist demon cards, and exactly 20 neutral starter IDs. Each class list totals 30 (10 class + 20 neutral) and card count per ID is <=2. Class cards are normal reward tier; token cards are never reward eligible.
  - Class cards fit archetypes: Warrior high health; Assassin low health with high attack or special effects; Demonist summons/demon interactions.
  - Define NORMAL_ENEMIES_BY_PHASE as three tuples of three IDs. Add 3 normal enemy definitions for each theme; retain one phase-specific boss per phase.

### I02. Make run creation and rewards class-aware
- Related Files:
  - packages/game-core/src/engine.ts :: rewardChoices, createRun, encounter generation.
  - packages/game-core/src/engine.test.ts :: run, encounter, reward coverage.
  - apps/web/src/game/localRunStorage.ts :: isRunState class validation; keep schemaVersion 1.
- Details
  - Change createRun signature to createRun(seed: number, playerClass: PlayerClass): RunState for new runs. Initialize deck/starterDeck from the selected list with deterministic unique instance IDs.
  - Generate each phase's normal encounters only from that phase's tuple, preserving seeded RNG and the existing 3+1 sequence.
  - rewardChoices filters by reward tier, selected class or neutral class tag, and the existing max-two-copies rule. Legacy runs receive neutral rewards only.
  - Continue to load classless schema-v1 saves without rebuilding or mutating their deck; reject invalid nonempty class IDs.

### I03. Add model invariant tests
- Related Files:
  - packages/game-core/src/engine.test.ts :: class deck, phase, reward tests.
  - apps/web/src/game/localRunStorage.test.ts :: legacy and class-aware save parsing.
- Details
  - Assert each class deck contains exactly 30 cards, exactly 10 matching class cards, 20 neutral cards, and no more than two copies.
  - Assert every phase contains 3 matching normal enemies then its boss.
  - Assert class and legacy reward filtering and save compatibility.

## Acceptance Criteria
- [x] Class run creation is deterministic and creates the agreed 30-card composition.
- [x] All phases use their own normal enemies and boss.
- [x] Existing classless schema-v1 saves remain playable and unchanged.
- [x] Rewards are class-aware and preserve tier/copy limits.

## Validation
- npm run test --workspace @board-game/game-core -- src/engine.test.ts
- npm run test --workspace @board-game/web -- src/game/localRunStorage.test.ts
- npm run build --workspace @board-game/game-core

## Commit Message
feat(game-core): add class-aware decks and phase encounters

Plan: 2026-10-27-class-based-expedition-expansion
Phase: P01-game-core
Task: T01-class-and-encounter-model

- Add three class starter decks and class-filtered rewards
- Keep phase encounters aligned with themes
- Preserve classless legacy saves

## Progress
- [x] Implementation complete
- [x] Validation passed
- commit: pending
