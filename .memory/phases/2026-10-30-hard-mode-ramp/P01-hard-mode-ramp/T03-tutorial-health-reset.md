# Task: T03 Tutorial Health Reset

## Status: done

## Goal

Restore player-side battle health when the first-run tutorial ends normally or is skipped, so tutorial damage does not carry into regular play.

## Decision Summary

- Heal the player's hero and all friendly board minions to their current `maxHealth` on first-run tutorial completion and skip.
- Keep the battle and enemy state as played; do not apply this reset to tutorial replay, which already restores its saved snapshot.

## Implementation

### I01. Add a pure tutorial health restoration helper

- Related Files:
  - `apps/web/src/game/tutorialHealth.ts` :: `restoreTutorialPlayerHealth`; create and export a function accepting a `RunState` and returning a cloned `RunState`.
  - `apps/web/src/game/tutorialHealth.test.ts` :: `restoreTutorialPlayerHealth` tests; new.

#### Details

- Signature: `restoreTutorialPlayerHealth(run: RunState): RunState`.
- Clone the input with `structuredClone`; do not mutate the caller's run.
- If `run.battle` is non-null, set `battle.playerHero.health = battle.playerHero.maxHealth` and set `health = maxHealth` for every entry in `battle.playerBoard`.
- Preserve enemy hero/minion health, board contents, statuses, cards, mana, turns, difficulty, rewards, and all other run fields.
- If the battle is null, return the cloned run without modification.

### I02. Apply the helper to first-run tutorial completion and skip

- Related Files:
  - `apps/web/src/App.tsx` :: `finishTutorial`; before setting first-run tutorial mode to inactive, dispatch `{ type: "restore-run", run: restoreTutorialPlayerHealth(session.run) }` when `tutorialMode === "first-run"` and an active run exists.
  - `apps/web/src/App.tutorial.test.tsx` :: `first battle tutorial lifecycle`; add completion and skip recovery assertions.

#### Details

- Import `restoreTutorialPlayerHealth` in `App.tsx`.
- Apply health restoration only in `first-run` mode. Do not apply it in `replay`; replay must continue restoring `tutorialReplaySnapshot.current` exactly as before.
- Both the normal completion path (`second-turn-end`) and Skip button already call `finishTutorial`, so use that shared path and avoid separate healing code.
- Dispatch the cloned run through the existing `restore-run` action so the healed state follows the normal session persistence/synchronization flow.
- Keep tutorial completion storage semantics unchanged: a first-run skip still marks completion, while replay does not update that record.
- In the App test, create a first-run starting battle whose player hero and one friendly minion have reduced health; test both skip and normal finish, wait for session persistence/render update, and assert full player-side health while enemy health and battle identity remain unchanged.

## Acceptance Criteria

- [ ] First-run completion restores player hero and friendly minion health to maximum.
- [ ] First-run skip performs the same restoration and still records tutorial completion.
- [ ] Tutorial replay restores its pre-replay snapshot and does not heal or persist the sandbox run.
- [ ] The helper does not mutate its input or alter enemy/turn/card state.

## Validation

- `npm run test --workspace @board-game/web -- src/game/tutorialHealth.test.ts src/App.tutorial.test.tsx` — helper and tutorial lifecycle tests pass.
- `npm run build --workspace @board-game/web` — TypeScript and Vite build pass.

## Commit Message

```text
fix(web): restore health after first-run tutorial

Plan: 2026-10-30-hard-mode-ramp
Phase: P01-hard-mode-ramp
Task: T03-tutorial-health-reset

- Heal the player's hero and minions on tutorial finish or skip
- Preserve the tutorial replay snapshot behavior
```

## Progress

- [x] Implementation complete
- [x] Validation passed
- commit: pending
