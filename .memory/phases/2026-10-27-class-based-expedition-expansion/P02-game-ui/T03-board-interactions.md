# Task: T03 Board Interactions

## Status: done

## Goal
Support click and drag/drop card/minion actions, All Attack, fusion gestures, and field-minion ability tooltips.

## Decision Summary
- Keep click interactions; add drag/drop for card play, slot placement, and attacks.
- All Attack requires an empty enemy board and at least one attack-ready friendly minion.

## Implementation

### I01. Add drag/drop and All Attack
- Related Files:
  - apps/web/src/components/CardView.tsx :: CardViewProps and CardView.
  - apps/web/src/components/HandPanel.tsx :: card drag sources.
  - apps/web/src/components/MinionCard.tsx :: MinionCardProps and MinionCard.
  - apps/web/src/components/MinionLane.tsx :: MinionLaneProps and slot targets.
  - apps/web/src/components/GameBoard.tsx :: target validation, toolbar, All Attack.
  - apps/web/src/game/gameActions.ts :: add all-attack and fuse-minions actions.
  - packages/game-core/src/engine.ts :: add attackAllReadyMinions using attackWithMinion.
- Details
  - Use native drag events, no dependency. Drag minion to empty friendly slot; targeted spell to legal target; ready minion to enemy minion/hero. Click path remains unchanged.
  - Drag compatible friendly minion onto its partner to call fuseMinions. Invalid drops cancel without state change.
  - All Attack disabled when enemyBoard is nonempty, player turn inactive, resolving, or no ready minion. On activation snapshot ready IDs in board order, call attackWithMinion sequentially, recheck state, stop on battle end.
  - MinionCard tooltip displays only CARD_BY_ID description, on hover/focus, in a small accessible tooltip.

### I02. Test interaction paths
- Related Files:
  - apps/web/src/App.interactions.test.tsx.
  - apps/web/src/components/MinionCard.test.tsx.
  - apps/web/src/components/MinionLane.test.tsx.
  - packages/game-core/src/engine.test.ts.
- Details
  - Cover click regression, legal/illegal drops, All Attack availability/order/lethal stop, fusion dispatch, and ability-only tooltip.

## Acceptance Criteria
- [x] Click and drag/drop dispatch equivalent validated actions.
- [x] All Attack follows exact readiness conditions and resolves sequentially.
- [x] Compatible fusion drops work; invalid drops do not alter state.
- [x] Ability description is available on hover and focus.

## Validation
- npm run test --workspace @board-game/web -- src/App.interactions.test.tsx src/components/MinionCard.test.tsx src/components/MinionLane.test.tsx
- npm run test --workspace @board-game/game-core -- src/engine.test.ts
- npm run build

## Commit Message
feat(web): add drag play all attack and minion tooltips

Plan: 2026-10-27-class-based-expedition-expansion
Phase: P02-game-ui
Task: T03-board-interactions

- Add drag interactions alongside click controls
- Add sequential All Attack and fusion gestures
- Explain minion abilities on hover and focus

## Progress
- [x] Implementation complete
- [x] Validation passed
- commit: 0000000
