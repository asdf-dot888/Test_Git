# Task: T03 Sequential Enemy Turn Playback

## Status: done

## Goal

Render the enemy turn as a readable sequence of actions, with a one second pause after each complete action group. Keep the player unable to act during playback, pause playback while the Escape menu is open, and show defeat only after the lethal action and its final pause have finished.

## Decisions Applied

- Enemy card play and all effects caused by that card form one action group. An attack and a boss area attack are each their own action group.
- Wait 1000 ms after each group. The player's controls remain locked through the final wait.
- The Escape menu pauses both the current combat animation and the remaining inter-action wait; closing it resumes from the saved remainder.
- On lethal damage, show the last action against the presentation snapshot with zero hero health, then finish the wait before routing to defeat.
- Persist only the final authoritative `RunState`. Playback steps are transient client state and are not replayed after reload.

## Implementation

### I01. Session playback state and sequential presentation

Related files and symbols:

- `apps/web/src/game/gameActions.ts` :: `GameSession`, reducer actions, `end-turn` handling. Store `EnemyTurnResolution.steps` and a current playback index while retaining `resolution.run` as the authoritative `session.run`.
- `apps/web/src/game/combatEffects.ts` :: add `collectEnemyActionEffects(beforeRun, presentationRun, action, firstEventId)` to create effects for just one action. For a minion-versus-minion attack, emit both impact events (attacker and target) from the reciprocal damage result.
- `apps/web/src/components/GameBoard.tsx` :: render the current `presentationRun` while playback is active; disable all card, minion, hero, and end-turn interactions while preserving Escape menu access.
- `apps/web/src/App.tsx` :: route active playback before terminal status screens; persist only final `session.run`; include playback in timer pause and avoid firing the player-turn cue before playback completes.
- `apps/web/src/game/useEnemyTurnPlayback.ts` (new) :: advance action groups, enforce 1000 ms gaps, and retain exact remaining wait time while menu-paused.

Behavior and state contract:

```ts
interface EnemyTurnPlaybackState {
  steps: EnemyTurnPlaybackStep[];
  currentIndex: number;
}
```

- `session.run` is the final engine result; `session.enemyTurnPlayback` is optional, transient display state.
- For the active step, render `step.presentationRun` and effects derived from `step.beforeRun` plus the step action. Do not render the final run over the step snapshot.
- When the current action's effects finish, begin its 1000 ms inter-action delay. After the last action's delay, clear playback. A resolution with no visible action steps clears immediately.
- If a lethal action is the current step, its `presentationRun` remains visible during that action and the final delay. Then clear playback and show the existing defeat screen using `session.run`.
- Pause the action layer and delay while the menu is open; preserve animation progress and remaining delay. Resume the same step on close.
- Keep turn timer paused while playback is active. Do not generate duplicate effects or event IDs when a step resumes.

### I02. Pauseable combat effect animations

Related files and symbols:

- `apps/web/src/components/CombatEffectLayer.tsx` :: accept a `paused` prop; pause CSS animations and fallback completion timers, preserving remaining duration.
- `apps/web/src/components/CombatEffectLayer.test.tsx` :: cover pause/resume of animation completion and no duplicate completion.

### I03. Playback and integration tests

Related files and symbols:

- `apps/web/src/game/gameActions.test.ts` :: final run and transient steps are stored separately.
- `apps/web/src/game/combatEffects.test.ts` :: one-action events and mutual combat impacts.
- `apps/web/src/App.enemy-turn-playback.test.tsx` (new) :: verify sequencing, one second group gaps, input lock, menu pause/resume, terminal defeat ordering, and no early player-turn cue.
- `apps/web/src/game/useEnemyTurnPlayback.test.ts` (new) :: verify exact remaining delay after pause.

## Acceptance Criteria

- [ ] Enemy actions display one at a time in the engine-provided order, with all effects from one card play grouped together.
- [ ] A 1000 ms wait follows each action group, including the final group, and player controls stay locked until it ends.
- [ ] Opening the Escape menu pauses the active action and remaining delay; closing it resumes both without restarting or skipping.
- [ ] Lethal action presentation finishes before the defeat view appears.
- [ ] Player turn timer and turn-start cue do not begin before playback completes.
- [ ] Only the final authoritative run is persisted; reload during presentation restores that resolved state without replaying the queue.

## Validation

- `npm.cmd test --workspace @board-game/web -- src/game/gameActions.test.ts src/game/combatEffects.test.ts src/components/CombatEffectLayer.test.tsx src/App.enemy-turn-playback.test.tsx src/game/useEnemyTurnPlayback.test.ts`
- `npm.cmd run build --workspace @board-game/web`
- `npm.cmd run lint --workspace @board-game/web`

## Commit Message

```text
feat(web): play enemy turns as paced action groups

Plan: 2026-10-23-enemy-turn-pacing-and-combat-retaliation
Phase: P01-sequenced-enemy-turn-and-minion-combat
Task: T03-sequential-enemy-turn-playback

- Present enemy actions in order with one-second gaps
- Pause playback and input during the Escape menu
- Delay defeat routing until lethal action presentation finishes
```

## Progress

- [x] Implementation complete
- [x] Validation passed
- commit: `dc70f0f`

Note: The specified focused tests, web build, and lint passed. The full web suite has one unrelated existing failure in `useGameSession.test.ts`: that test skips a reward before acknowledging victory, while the engine rejects that sequence.
