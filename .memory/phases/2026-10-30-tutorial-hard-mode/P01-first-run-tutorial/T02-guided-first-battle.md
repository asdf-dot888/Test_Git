# Task: T02 Guided First Battle

## Status: pending

## Goal

Automatically guide an account with no tutorial completion record through the first actual battle, temporarily allow only the prompted action, and let the player skip or replay the guide from the main-menu game guide.

## Decision Summary

- Teach hand/mana awareness, playing a card, attacking, and ending a turn in the actual first battle.
- The guide is skippable at any point; both skip and successful completion persist completion through `markTutorialCompleted`.
- The main-menu game guide is the replay entry and must not replace, delete, or advance the player's saved expedition.

## Implementation

### I01. Create the tutorial overlay and step model

- Related Files:
  - `apps/web/src/components/FirstRunTutorial.tsx` :: `FirstRunTutorial`, tutorial step definitions; new
  - `apps/web/src/components/FirstRunTutorial.test.tsx` :: overlay, step, skip, and replay behavior; new
  - `apps/web/src/styles/board.css` :: `.first-run-tutorial-*` overlay and spotlight styles; modify

#### Details

- **Signatures & Types**:
  ```typescript
  export type TutorialStepId = "inspect-hand" | "play-card" | "end-first-turn" | "attack" | "end-second-turn";
  export type TutorialAction = "continue" | "play-card" | "end-turn" | "attack";

  export interface FirstRunTutorialProps {
    step: TutorialStepId;
    onAction(action: TutorialAction): void;
    onSkip(): void;
  }
  ```
- **Execution Flow / Logic**:
  1. Render a dialog with one short instruction, current step count, and an always-visible “건너뛰기” button.
  2. `inspect-hand` uses a continue action; `play-card` accepts a legal card play; `end-first-turn` and `end-second-turn` accept end turn; `attack` accepts an attack by an attack-ready friendly minion.
  3. The step sequence is `inspect-hand → play-card → end-first-turn → attack → end-second-turn`. Advance only after the corresponding game action succeeds; errors leave the current step visible.
  4. If the enemy removes every available friendly attacker before the attack step, change the instruction to ask the player to play another affordable minion and end that turn; repeat until an attack-ready friendly minion exists. Never block the player on an impossible attack.
  5. Maintain keyboard access and mobile viewport fit. Do not place instructional content over the hand card's name/cost/art.

### I02. Integrate tutorial lifecycle and action gating

- Related Files:
  - `apps/web/src/App.tsx` :: `GameSessionContent`, `beginRun`, `startNewLocalRun`, `selectCard`, `selectTarget`, `handleDropInteraction`, `onEndTurn`, `onAllAttack`; modify
  - `apps/web/src/components/GameBoard.tsx` :: action availability props for tutorial mode; modify
  - `apps/web/src/components/HandPanel.tsx` :: enabled-card selection gating; modify
  - `apps/web/src/components/GameGuideModal.tsx` :: menu replay action; modify
  - `apps/web/src/components/MainMenu.tsx` :: pass the replay callback; modify
  - `apps/web/src/App.tutorial.test.tsx` :: first-run detection, guided actions, skip, and replay isolation; new

#### Details

- **State & Signatures**:
  - Add UI-only state `tutorialMode: "inactive" | "first-run" | "replay"` and `tutorialStep: TutorialStepId` to `GameSessionContent`; do not add tutorial completion to the persisted `RunState`.
  - Add optional `tutorial` props to `GameBoard` describing the current step and the permitted action. Keep core card rules in `@board-game/game-core` unchanged.
  - Add `onReplayTutorial(): void` to `GameGuideModal` and `MainMenu` callback flow.
- **Execution Flow / Logic**:
  1. When entering the game screen for encounter 0 of an active run, read progress for `auth.userId`; start `first-run` tutorial only if there is no completed record. This must also work when the browser reloads during encounter 0 before the tutorial is completed. If progress is complete, enter the game normally.
  2. During tutorial mode, gate App event handlers as well as disabled UI controls so click, keyboard, and drag/drop cannot execute an action outside the current step.
  3. Allow the guide's own continue/skip controls at every step. Skip immediately writes completion, clears tutorial UI state, and returns control to the current game without changing run state.
  4. On the final successful action, persist completion and remove the overlay. A storage failure shows a non-blocking message and does not trap the player; the user may finish the battle.
  5. “게임 방법 다시보기” opens the guide. Its tutorial replay action creates a disposable sandbox run using the saved run's class when available, or Warrior when there is no saved run; use a fixed tutorial seed `20261030`, set the sandbox difficulty to Normal, and set the opening tutorial step to `inspect-hand`.
  6. Snapshot the current `RunState` and screen before entering replay. Suppress `saveRun` and leaderboard submission while replay is active. On replay completion or skip, discard the sandbox and restore the exact snapshot and screen; if there was no saved run, clear the sandbox and return to the main menu.
  7. Do not mark a tutorial complete merely because the account changes; scope all progress reads/writes to the current `auth.userId`.

## Acceptance Criteria

- [ ] First-time signed-in user is guided during the actual first battle; a completed user is not auto-guided on later expeditions.
- [ ] Only the action for the current step can mutate the battle; failed game actions do not advance the guide.
- [ ] Skip and completion both persist for the signed-in user; another account remains eligible for its own first tutorial.
- [ ] Menu replay does not replace, mutate, or submit progress for the active expedition.
- [ ] An enemy-killed tutorial minion cannot deadlock the player at the attack step.

## Validation

- `npm run test --workspace @board-game/web -- src/App.tutorial.test.tsx src/components/FirstRunTutorial.test.tsx src/components/GameGuideModal.test.tsx`
- `npm run build --workspace @board-game/web`

## Commit Message

```text
feat(tutorial): guide players through the first battle

Plan: 2026-10-30-tutorial-hard-mode
Phase: P01-first-run-tutorial
Task: T02-guided-first-battle

- Guide hand, card, attack, and turn actions with temporary input gating
- Add skip, per-user completion, and safe menu replay
```

## Progress

- [x] Implementation complete
- [x] Validation passed
- commit: pending

