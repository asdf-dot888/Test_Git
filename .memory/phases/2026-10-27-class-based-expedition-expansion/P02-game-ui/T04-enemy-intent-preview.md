# Task: T04 Enemy Intent Preview

## Status: done

## Goal
Show enemy card/action, effect text, and target for one second before resolution; explain the boss area-attack pattern at battle start.

## Decision Summary
- Preview every enemy action for one second with card art/name/effect and target highlight.
- Show boss AOE cadence at battle start; boss card actions resolve before AOE.

## Implementation

### I01. Add preview and effect playback stages
- Related Files:
  - apps/web/src/game/gameActions.ts :: GameSession.enemyTurnPlayback, sessionForEnemyTurn, reduceGameAction.
  - apps/web/src/game/useEnemyTurnPlayback.ts :: useEnemyTurnPlayback and ACTION_GAP_MS.
  - apps/web/src/App.tsx :: playbackStep, displayRun, playback handlers.
  - apps/web/src/components/EnemyIntentPreview.tsx :: new action preview.
  - apps/web/src/components/GameBoard.tsx :: overlay and target highlight.
  - apps/web/src/game/combatEffects.ts :: collectEnemyActionEffects.
- Details
  - Give each playback step explicit intent/effect stage. Start at intent; after 1000ms enter effect, render presentationRun, play effect. Keep existing 1000ms post-effect gap.
  - During intent render beforeRun. Preview minion/spell card image, exact name/description and target; attack preview shows attacker and target. Highlight the target.
  - Prevent player input during intent and effect.
  - Show boss pattern panel at battle start and throughout boss fight: all player minions and player hero take 1 damage on boss turns 3, 6, 9. Preserve existing card-actions-before-AOE order.
  - Menu, hidden tab, or active effect pauses countdown; resume remaining time.

### I02. Test timing and playback
- Related Files:
  - apps/web/src/game/useEnemyTurnPlayback.test.ts.
  - apps/web/src/App.enemy-turn-playback.test.tsx.
  - packages/game-core/src/engine.test.ts.
- Details
  - Fake timers verify no result before 1000ms; pauses retain remaining time; preview uses beforeRun and effect stage uses presentationRun; highlighted target matches record; player inputs remain locked; boss panel and action order are visible.

## Acceptance Criteria
- [x] Each enemy action is shown for one second before its result.
- [x] Preview target matches the action record.
- [x] Boss pattern and timing are shown; cards precede AOE.
- [x] Pauses retain timing and inputs remain locked.

## Validation
- npm run test --workspace @board-game/web -- src/game/useEnemyTurnPlayback.test.ts src/App.enemy-turn-playback.test.tsx
- npm run test --workspace @board-game/game-core -- src/engine.test.ts
- npm run build

## Commit Message
feat(web): preview enemy actions before resolution

Plan: 2026-10-27-class-based-expedition-expansion
Phase: P02-game-ui
Task: T04-enemy-intent-preview

- Show enemy card, effect and target before each action
- Pause preview with combat playback
- Explain boss area attack cadence

## Progress
- [x] Implementation complete
- [x] Validation passed
- commit: 0000000
