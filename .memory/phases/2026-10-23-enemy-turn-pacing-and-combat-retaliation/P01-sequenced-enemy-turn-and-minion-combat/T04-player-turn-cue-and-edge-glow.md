# Task: T04 Player Turn Cue and Edge Glow

## Status: done

## Goal

After the enemy sequence and its final one-second wait finish, clearly signal that the player's turn has started with a short distinct sound and a subtle gold glow around the full screen edge for about one second.

## Decisions Applied

- Use a brief, distinct synthesized sound and a full-viewport gold edge glow; do not show a banner.
- Trigger once after enemy playback ends, not when the engine computes the final run.
- The cue is informational and must not block card play or extend the turn timer.

## Implementation

### I01. Distinct turn-start sound

Related files and symbols:

- `apps/web/src/game/audio.ts` :: `AudioController`, turn-start playback. Replace the current reuse of `/audio/sfx/timer-warning.ogg` with a short rising two-note WebAudio cue; respect effects mute/volume and audio unlock behavior.
- `apps/web/src/game/audio.test.ts` :: verify turn-start cue uses the dedicated synthesis path, respects mute and effects volume, and gracefully handles unavailable WebAudio.

Implementation constraints:

- Do not add a new audio asset; no dedicated turn-start file currently exists.
- Use the existing audio controller and pointer-based `unlock()` lifecycle. Stop/disconnect oscillator nodes and clean scheduled nodes on controller disposal.
- Keep the cue short (under one second), clearly distinguishable from the timer warning, and avoid changing background music behavior.

### I02. Full-screen edge glow

Related files and symbols:

- `apps/web/src/components/TurnStartGlow.tsx` (new) :: portal a decorative, aria-hidden overlay to `document.body` so the `.game-shell` overflow cannot clip it.
- `apps/web/src/components/TurnStartGlow.test.tsx` (new) :: verify visible lifecycle and no interaction capture.
- `apps/web/src/styles/board.css` :: fixed full-viewport gold edge glow, one-second fade/pulse, reduced-motion rule, and z-index below the Escape menu but above the board.

Implementation constraints:

- The glow uses `pointer-events: none`, does not move or resize the board, and does not cover menu controls.
- Follow the existing gold palette. With reduced motion enabled, use a static or very brief low-motion treatment.

### I03. Trigger after playback exactly once

Related files and symbols:

- `apps/web/src/App.tsx` :: trigger sound and glow only when the enemy playback state transitions from active to complete and the authoritative battle is on the player's turn.
- `apps/web/src/App.enemy-turn-playback.test.tsx` :: assert the signal occurs once after the last action delay, not on initial load, enemy turn, menu resume, or repeated render.

Use a stable identity such as `battleId:turnNumber` to suppress duplicate signals across rerenders. A resumed in-progress playback should not fire the cue until it actually finishes.

## Acceptance Criteria

- [x] Player turn start plays a short sound distinct from the timer warning and honoring effects mute and volume.
- [x] A subtle gold edge glow appears across the viewport for about one second without intercepting input or covering the menu.
- [x] Sound and glow occur exactly once after the final enemy action delay and do not appear on initial player turn or during enemy playback.
- [x] Reduced-motion preference avoids a strong animated flash.

## Validation

- `npm.cmd test --workspace @board-game/web -- src/game/audio.test.ts src/components/TurnStartGlow.test.tsx src/App.enemy-turn-playback.test.tsx`
- `npm.cmd run build --workspace @board-game/web`
- `npm.cmd run lint --workspace @board-game/web`

## Commit Message

```text
feat(web): signal player turns with sound and edge glow

Plan: 2026-10-23-enemy-turn-pacing-and-combat-retaliation
Phase: P01-sequenced-enemy-turn-and-minion-combat
Task: T04-player-turn-cue-and-edge-glow

- Add a distinct synthesized player-turn cue
- Show a subtle full-screen gold edge glow after enemy playback
```

## Progress

- [x] Implementation complete
- [x] Validation passed
- commit: created (see git history)
