# Task: T01 Run Difficulty

## Status: pending

## Goal

Let the player choose Normal or Hard before choosing a class, persist the choice on the run, and interpret existing run data without a difficulty field as Normal.

## Decision Summary

- `normal` preserves all existing rules. `hard` applies to the whole run and cannot be changed mid-run.
- The run model and local/API validation use the same literal union: `"normal" | "hard"`.

## Implementation

### I01. Add difficulty to the game-core run model and constructor

- Related Files:
  - `packages/game-core/src/types.ts` :: `RunDifficulty`, `RunState`; modify
  - `packages/game-core/src/engine.ts` :: `createRun`, `gameConstants`; modify
  - `packages/game-core/src/engine.test.ts` :: run construction and default compatibility; modify

#### Details

- **Signatures & Types**:
  ```typescript
  export type RunDifficulty = "normal" | "hard";

  export function useGameSession(): {
    session: GameSession;
    dispatch(action: GameAction): void;
    startNewRun(playerClass?: PlayerClass, seed?: number, difficulty?: RunDifficulty): void;
  };

  export interface RunState {
    // Existing fields remain unchanged.
    difficulty: RunDifficulty;
  }

  export function createRun(seed: number, playerClass?: PlayerClass, difficulty?: RunDifficulty): RunState;
  ```
- **Execution Flow / Logic**:
  1. Default omitted difficulty to `"normal"` to preserve every existing caller and test fixture.
  2. Store the chosen difficulty on the returned `RunState`; preserve it in `cloneRun`, `beginEncounter`, rewards, and `advanceRun` by retaining the current spread-copy behavior.
  3. Do not change enemy or player mana values in this task.

### I02. Add the pre-expedition difficulty choice and thread it into run storage

- Related Files:
  - `apps/web/src/components/ClassSelectionScreen.tsx` :: `ClassSelectionScreen`, `ClassSelectionScreenProps`; modify
  - `apps/web/src/components/ClassSelectionScreen.test.tsx` :: difficulty selection and confirm callback; modify
  - `apps/web/src/App.tsx` :: `startNewLocalRun`, `beginRun`, `abandonIntoClassSelection`, class-selection render; modify
  - `apps/web/src/game/useLocalRun.ts` :: `LocalRunController.createRun`, `replaceRun`; modify
  - `apps/web/src/game/gameActions.ts` :: `GameAction` `start-run` and reducer; modify
  - `apps/web/src/game/useGameSession.ts` :: `startNewRun`; modify
  - `apps/web/src/game/localRunStorage.ts` :: `isRunState`, `load`; modify
  - `apps/web/src/game/localRunStorage.test.ts` :: current and legacy run documents; modify
  - `apps/api/src/routes/runRoutes.ts` :: `runSchema`, `seedBody`, `createRunRouter`; modify
  - `apps/api/src/routes/runRoutes.test.ts` :: API run creation and schema compatibility; modify
  - `apps/web/src/api/runClient.ts` :: `RunClient.createRun`; modify
  - `apps/web/src/api/runClient.test.ts` :: create request payload; modify

#### Details

- **Signatures & Types**:
  ```typescript
  onConfirm(playerClass: PlayerClass, difficulty: RunDifficulty): void;
  createRun(seed: number, playerClass: PlayerClass, difficulty: RunDifficulty): Promise<RunState>;
  replaceRun(reason: "completed" | "abandoned", seed: number, playerClass: PlayerClass, difficulty: RunDifficulty): Promise<RunState>;
  RunClient.createRun(seed: number, ownerId: string, difficulty?: RunDifficulty): Promise<RunSaveResponse>;
  ```
- **Data & Schema Fields**:
  - New runs store `RunState.difficulty` as `"normal"` or `"hard"`.
  - Older local and API payloads missing the field normalize to `"normal"`.
  - Invalid non-missing values are rejected by API request validation; local-storage invalid runs load as empty.
- **Execution Flow / Logic**:
  1. Place a Normal/Hard radio group on `ClassSelectionScreen`, defaulting to Normal. Confirmation passes both selected class and difficulty to `App`.
  2. Keep the choice fixed by storing it in the newly created run; resuming or continuing never shows a selector.
  3. Thread difficulty through `useLocalRun.createRun` and `replaceRun` into `createRun`.
  4. Extend API run creation to accept `{ seed, difficulty? }`; omitted difficulty defaults to Normal. The route calls `createRun(seed, "warrior", difficulty)`. `RunClient.createRun` serializes the optional difficulty in the request body, defaulting to Normal; update its payload test.
  5. Add `difficulty: RunDifficulty` to the existing `GameAction` `start-run` variant; have the reducer call `createRun(seed, playerClass, difficulty)`. Extend `useGameSession.startNewRun(playerClass?, seed?, difficulty?)` and default its omitted difficulty to Normal.
  6. Normalize absent legacy `difficulty` in `localRunStorage.load` and the API Zod `runSchema` to Normal before returning a `RunState`; reject present values other than `normal`/`hard`.
  7. Preserve all other existing run fields and run-storage envelope schema version 1.

## Acceptance Criteria

- [ ] New run creation from either fresh start or confirmed abandonment uses the selected difficulty.
- [ ] Existing saved runs without the field load as Normal and remain playable.
- [ ] The class screen defaults to Normal and exposes an accessible Normal/Hard choice.
- [ ] Continuing an existing run does not offer a difficulty change.

## Validation

- `npm run test --workspace @board-game/game-core -- src/engine.test.ts`
- `npm run test --workspace @board-game/web -- src/components/ClassSelectionScreen.test.tsx src/game/localRunStorage.test.ts src/App.menu.test.tsx`
- `npm run test --workspace @board-game/api -- src/routes/runRoutes.test.ts`
- `npm run build`

## Commit Message

```text
feat(game): persist expedition difficulty

Plan: 2026-10-30-tutorial-hard-mode
Phase: P02-hard-expedition
Task: T01-run-difficulty

- Add normal and hard run difficulty with legacy normal defaults
- Let players choose difficulty before class selection
```

## Progress

- [x] Implementation complete
- [x] Validation passed
- commit: pending
