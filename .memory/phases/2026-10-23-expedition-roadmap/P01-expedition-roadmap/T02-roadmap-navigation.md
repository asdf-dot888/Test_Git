# Task: T02 Roadmap Navigation

## Status: done

## Goal

Integrate the roadmap as the entry point for a new expedition, an active-run continuation, and progression after rewards, while preserving pending victory/reward screens and saving the run when the player returns to the main menu.

## Decision Summary

- Add a local `map` screen state; no persisted route fields are needed. Start a new run on the roadmap, and use `RunState.encounters` to resume the active battle or advance to the next pending encounter.
- Pending victory acknowledgement and reward screens remain higher priority than the roadmap. Returning from the roadmap to the main menu preserves the run.

## Implementation

### I01. Connect screen navigation to existing run state

- Related Files:
  - `apps/web/src/App.tsx` :: `GameSessionView`, `startNewServerRun`, main-menu rendering and run outcome branches — modify.
  - `apps/web/src/components/ExpeditionRoadmap.tsx` :: `ExpeditionRoadmap` contract from T01 — read-only.

#### Details

- **Signatures & Types**:
  ```ts
  type GameScreen = "menu" | "map" | "game";

  function GameSessionView({ sync }: { sync: RunSyncController }): JSX.Element;
  ```
  The screen type may remain inline in `useState` if that matches the existing file style.
- **Data & Schema Fields**:
  - Use the existing `RunSyncController`, reducer actions `restore-run` and `continue-run`, and `RunState` fields `status`, `battle`, `encounters`, `pendingVictoryAcknowledgement`, and `pendingReward`.
  - Keep `RunState` storage schema and server persistence behavior unchanged. `useRunSync` continues persisting run changes.
- **Execution Flow / Logic**:
  1. Expand the current screen union from `"menu" | "game"` to include `"map"`.
  2. After `startNewServerRun` successfully creates and restores the server run, set screen to `map` (do not enter battle directly).
  3. On main-menu “continue” click: if `pendingVictoryAcknowledgement` or `pendingReward` is present, set screen to `game` so the existing victory/reward-first branches render. Otherwise set screen to `map`, including when an active battle exists or the previous battle is `playerWon` after reward resolution.
  4. Preserve render precedence: menu screen first; then active run’s pending victory acknowledgement; then pending reward; then, if screen is `map`, render `ExpeditionRoadmap`; then ordinary battle/gameplay branches. This ensures unresolved victory/reward state is never bypassed.
  5. In the roadmap’s `onSelectEncounter(index)` callback, inspect `run.encounters[index]`. For `status === "active"`, set screen to `game` without dispatching progression. For the sole selectable `status === "pending"` encounter, dispatch `{ type: "continue-run" }` and set screen to `game`. Ignore missing, completed, later-pending, or disabled selections defensively.
  6. After victory acknowledgement and reward choice/skip are resolved, render the roadmap rather than `EncounterContinueScreen`. The pending encounter’s phase, not only `run.phase`, determines which phase the roadmap displays after a boss.
  7. `onMainMenu` sets screen to `menu` only. Do not dispatch abandon, reset, or delete; leave `run` intact so `MainMenu` can offer continue and `useRunSync` can persist it.
  8. Keep timer and enemy playback paused while on the roadmap. Existing logic pauses for `screen !== "game"`; retain that invariant when adding `"map"`.
  9. Keep the existing behavior for a run with `status === "completed"` and for no active run; do not make a completed run’s map node enter combat.

### I02. Test complete route and resume flow

- Related Files:
  - `apps/web/src/App.roadmap.test.tsx` :: integration tests for roadmap routing and persistence; new.
  - `apps/web/src/App.menu.test.tsx` :: update `startGame` helper and menu continuation assertions to pass through map; modify if needed.
  - `apps/web/src/App.outcome.test.tsx` :: update post-reward continuation expectation from inter-battle confirmation to roadmap; modify if needed.

#### Details

- **Test setup**:
  - Follow existing App test setup for fake `Audio`, `RunSyncController`, and session restoration; provide a `RunState` with `encounters` covering current active and pending nodes.
  - Use the same run-sync fake to assert persisted mutations and keep tests isolated from real authentication/network access.
- **Required scenarios**:
  1. Starting a new run shows the roadmap and does not show the battle board before selecting the active first node.
  2. Clicking the active node enters the battle without advancing the encounter index.
  3. Continuing an active saved run opens the roadmap; selecting its active encounter resumes the same battle.
  4. Resolving saved victory acknowledgement and reward displays those screens first; after reward choice or skip, the roadmap appears.
  5. On the roadmap after reward, clicking the next pending node dispatches `continue-run`, advances to the next encounter through the existing engine action, and renders the next battle.
  6. After a boss reward is resolved, the roadmap shows the following phase’s four nodes (derived from the next pending encounter).
  7. Clicking “메인 메뉴” returns to the menu and retains the active run; continue remains available and reopens the roadmap.
  8. Opening the roadmap pauses the turn timer and enemy playback using the existing non-game screen pause behavior.
- Update existing tests only where the intentionally changed screen transition requires it; keep assertions for reward acknowledgement, save state, battle outcomes, and menu gating.

## Acceptance Criteria

- [x] New expedition opens the roadmap; battle starts only after clicking the active node.
- [x] Active run continuation opens the roadmap and resumes the same encounter from its active node.
- [x] Pending victory/reward UI is shown before the roadmap, and next encounter requires node selection after rewards.
- [x] Boss victory reveals the next phase route after reward resolution.
- [x] Returning to main menu preserves the run and continuing it returns to the roadmap.
- [x] Timer and enemy playback do not progress on the roadmap.
- [x] Existing run persistence and authentication behavior remain intact.

## Validation

- `npm.cmd test --workspace @board-game/web -- src/App.roadmap.test.tsx src/App.menu.test.tsx src/App.outcome.test.tsx` — roadmap navigation and affected existing integration tests pass.
- `npm.cmd run build --workspace @board-game/web` — web build passes.
- `npm.cmd run lint --workspace @board-game/web` — web lint passes.

## Commit Message
```text
feat(web): route expeditions through roadmap

Plan: 2026-10-23-expedition-roadmap
Phase: P01-expedition-roadmap
Task: T02-roadmap-navigation

- Gate new and next encounters behind roadmap node selection
- Preserve saved runs when returning to the main menu
```

## Progress
- [x] Implementation complete
- [x] Validation passed
- commit: created
