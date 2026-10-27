# Task: T01 Class Selection and Power UI

## Status: done

## Goal
Require class choice for new expeditions and show active class power, armor, and Demonist shards on the board.

## Decision Summary
- New expeditions choose Warrior, Assassin, or Demonist before run creation.
- Powers are manually activated for 2 mana once per turn. Classless saved runs continue without a power.

## Implementation

### I01. Class choice before run creation
- Related Files:
  - apps/web/src/App.tsx :: GameSessionContent, screen state, new-run handlers.
  - apps/web/src/components/MainMenu.tsx :: MainMenuProps and MainMenu.
  - apps/web/src/components/ClassSelectionScreen.tsx :: new component.
  - apps/web/src/game/useLocalRun.ts :: LocalRunController.createRun.
  - apps/web/src/game/gameActions.ts :: start-run action and reducer.
- Details
  - New expedition opens ClassSelectionScreen; continue bypasses it.
  - Change controller signature to createRun(seed: number, playerClass: PlayerClass), delegate to game-core and persist.
  - Show name, archetype, exact power text, deck summary; confirm starts, cancel returns to menu without replacing saved progress.

### I02. Show and activate powers
- Related Files:
  - apps/web/src/game/gameActions.ts :: GameAction/reducer; add use-hero-power.
  - apps/web/src/App.tsx :: dispatch and callbacks.
  - apps/web/src/components/GameBoard.tsx :: GameBoardProps and toolbar.
  - apps/web/src/components/HeroPanel.tsx :: player armor.
  - apps/web/src/components/HeroPowerControl.tsx :: new component.
  - apps/web/src/styles/board.css :: class and resource styles.
- Details
  - Display power name, cost, exact description, readiness. Warrior dispatches no target; Assassin enters enemy targeting including hero; Demonist requires 3 shards and board space.
  - Disable for insufficient mana, used power, non-player turn, resolution, or missing Assassin target. Display armor beside health and shards as current/6. Legacy runs omit class controls.
  - Reducer calls game-core useHeroPower and feeds resulting effect through combat-effects pipeline.

### I03. Test selection and control states
- Related Files:
  - apps/web/src/components/MainMenu.test.tsx.
  - apps/web/src/components/ClassSelectionScreen.test.tsx.
  - apps/web/src/components/GameBoard.test.tsx.
  - apps/web/src/App.test.tsx.
- Details
  - Verify cancel preserves old run, selected class passes through, continue bypasses chooser, target mode and disabled states, resource display, and legacy rendering.

## Acceptance Criteria
- [x] New runs require and persist one class; continue does not prompt again.
- [x] Classless saves remain playable.
- [x] Power UI reflects targets, mana, once-per-turn state, armor, and shards.

## Validation
- npm run test --workspace @board-game/web -- src/components/MainMenu.test.tsx src/components/ClassSelectionScreen.test.tsx src/components/GameBoard.test.tsx src/App.test.tsx
- npm run build --workspace @board-game/web

## Commit Message
feat(web): add class selection and hero power controls

Plan: 2026-10-27-class-based-expedition-expansion
Phase: P02-game-ui
Task: T01-class-selection-and-power-ui

- Choose class before creating a new run
- Show class powers and battle resources

## Progress
- [x] Implementation complete
- [x] Validation passed
- commit: pending
