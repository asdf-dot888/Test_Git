# Task: T01 Phase-Themed Art

## Status: done

## Goal
Give normal enemies, bosses, new class cards, fusion results, and Demonist summon candidates art matching phase themes and the adult dark-fantasy direction.

## Decision Summary
- Phase 1: corrupted elves and cursed forest. Phase 2: demons. Phase 3: ancient dragons and fire legion.
- Theme all 3 normal encounters and the boss in every phase, including portraits and boss art.

## Implementation

### I01. Create and connect illustrations
- Related Files:
  - apps/web/public/art/enemies/ :: 9 normal and 3 boss portraits.
  - apps/web/public/art/cards/ :: 30 class cards, 9 fusion results, 3 Demonist tokens.
  - apps/web/public/art/effects/ :: matching effect images.
  - apps/web/public/art/heroes/ :: class portraits if used in class chooser/player panel.
  - packages/game-core/src/catalog.ts :: CardDefinition and EnemyDefinition artKey values.
- Details
  - Generate raster art with the existing crop/aspect expectations and dark UI palette. Phase 1 has 3 corrupted elf/forest foes and corrupted elven sovereign boss; phase 2 has 3 demons and demon ruler; phase 3 has 3 fire legion/dragon foes and ancient dragon boss.
  - Class art communicates Warrior durability, Assassin agility, Demonist summoning. Fusion art visually combines its recipe. Demon tokens read as summon-only.
  - Characters depict adults in alluring, provocative dark-fantasy style. Keep distinct silhouettes and crop-safe focal subjects.
  - Ensure every catalog artKey resolves under the expected public directory; add/repair fallback as needed.

### I02. Verify art-key and phase coverage
- Related Files:
  - packages/game-core/src/engine.test.ts :: catalog/phase invariants.
  - apps/web/src/components/ExpeditionRoadmap.test.tsx :: themed portrait rendering.
- Details
  - Assert three normal definitions and one boss per phase, each with unique nonempty artKey. Assert new card art keys match generated asset manifest. Visually inspect cards, effects, roadmap portraits, bosses, and class chooser.

## Acceptance Criteria
- [ ] All 12 encounters have phase-appropriate illustrations.
- [ ] New class, fusion, and demon-token cards have art.
- [ ] Adult dark-fantasy direction and crop readability are consistent.

## Validation
- npm run test --workspace @board-game/game-core -- src/engine.test.ts
- npm run test --workspace @board-game/web -- src/components/ExpeditionRoadmap.test.tsx
- npm run build

## Commit Message
feat(art): add phase-themed enemy and class illustrations

Plan: 2026-10-27-class-based-expedition-expansion
Phase: P03-presentation
Task: T01-phase-themed-art

- Theme normal enemies and bosses by phase
- Add class, fusion, and demon token art

## Progress
- [x] Implementation complete
- [x] Validation passed
- commit: feat(art): add phase-themed enemy and class illustrations
