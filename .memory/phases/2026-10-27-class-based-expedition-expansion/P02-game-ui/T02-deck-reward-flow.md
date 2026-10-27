# Task: T02 Deck Reward Flow

## Status: done

## Goal
Enforce the 35-card limit with warning, reward choice, and discard while allowing cancellation without changing the deck.

## Decision Summary
- At 35 cards show a warning. Confirm, choose a reward, then discard an existing card.
- Close at any step returns to roadmap with no reward and original deck unchanged.

## Implementation

### I01. Compose reward/discard flow
- Related Files:
  - apps/web/src/App.tsx :: victory/reward/map render branches and callbacks.
  - apps/web/src/components/RewardScreen.tsx :: props and component.
  - apps/web/src/components/DiscardPicker.tsx :: props and component.
  - apps/web/src/components/DeckLimitDialog.tsx :: new modal.
  - apps/web/src/game/gameActions.ts :: actions and reducer.
  - packages/game-core/src/engine.ts :: chooseReward, skipReward; add atomic operation if needed.
- Details
  - Below 35 cards keep current flow.
  - At 35, after victory acknowledgement show warning; confirm opens reward; close skips and returns to roadmap.
  - After card choice hold selected ID outside RunState without changing deck. Show all deck instances in DiscardPicker. Final discard action validates both choices and atomically adds reward/removes discard; final size is 35.
  - X at warning, reward, or discard calls skipReward, clears transient flow and returns to roadmap; deck remains identical. Prevent double submission while resolving.

### I02. Test capacity and cancel paths
- Related Files:
  - apps/web/src/components/RewardScreen.test.tsx.
  - apps/web/src/components/DiscardPicker.test.tsx.
  - apps/web/src/App.outcome.test.tsx.
  - packages/game-core/src/engine.test.ts.
- Details
  - Verify 34->35 without discard; 35->warning->reward->discard->35; cancellation at each stage preserves exact deck; success adds selected card and removes selected instance once.

## Acceptance Criteria
- [x] Completed reward never leaves deck above 35.
- [x] 35-card reward sequence is warning, reward, discard.
- [x] Closing any step returns to roadmap with no deck mutation.

## Validation
- npm run test --workspace @board-game/web -- src/App.outcome.test.tsx src/components/RewardScreen.test.tsx src/components/DiscardPicker.test.tsx
- npm run test --workspace @board-game/game-core -- src/engine.test.ts
- npm run build

## Commit Message
feat(web): cap expedition decks at 35 cards

Plan: 2026-10-27-class-based-expedition-expansion
Phase: P02-game-ui
Task: T02-deck-reward-flow

- Add warning and discard flow at deck capacity
- Make reward cancellation leave deck unchanged

## Progress
- [x] Implementation complete
- [x] Validation passed
- commit: pending
