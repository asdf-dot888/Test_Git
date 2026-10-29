# Task: T03 Shared Interactive Hover and Click Sounds

## Status: done

## Goal
Give consistent audio feedback to interactive controls, cards, and selectable targets: a short synthesized magical sparkle on desktop pointer entry and the existing `ui-click.ogg` on activation, without sound for decorative or disabled elements.

## Decision Summary
- Reuse the existing click effect and use one global hover effect for every interactive element.
- Hover sound is subtle and magical; touch devices have no hover and receive click feedback on tap.
- Apply a short global hover cooldown so fast pointer movement does not stack the cue.

## Implementation

### I01. Add the synthesized hover cue to the audio controller
- Related Files:
  - `apps/web/src/game/audio.ts` :: `SoundEffectKind`, `AudioController.playEffect`, `playTurnStartCue`, `createAudioController`; modify.
  - `apps/web/src/game/audio.test.ts` :: synthesized cue, settings, cooldown, and cleanup tests; modify.

#### Details
- Add `"ui-hover"` to `SoundEffectKind`. Do not add an audio-file entry for this kind; synthesize it with the existing Web Audio context.
- Implement `playHoverCue()` as a brief, soft upward two-note sparkle using triangle oscillators and short gain envelopes. Scale gain by `effectsVolume` and honor `muted`, matching `playTurnStartCue`'s no-throw behavior.
- Store `lastHoverAt` inside the controller and suppress `ui-hover` if invoked within 120 ms of the last accepted hover cue. Do not throttle click or combat sounds.
- Track created oscillators/gain nodes until their `onended` cleanup; disconnect all remaining nodes in `dispose()`.
- **Tests**: creates two notes and cleans up; mute/zero effect volume does not create audible cue; calls inside 120 ms produce one cue; call after cooldown plays; dispose clears cue nodes and closes context.

### I02. Delegate hover and activation events to interactive elements
- Related Files:
  - `apps/web/src/App.tsx` :: document event effect that currently unlocks audio and plays `ui-click`; modify.
  - `apps/web/src/App.interactions.test.tsx` :: click, pointer, disabled-control, and target interaction sound cases; modify.
  - `apps/web/src/App.audio.test.tsx` :: pointer unlock integration; modify if needed.

#### Details
- Define one module-level `INTERACTIVE_AUDIO_SELECTOR` used by both delegated handlers:
  `button, a[href], input, select, textarea, label[for], [role='button'], [role='option'], [data-pointer-interaction]`.
- Keep document capture `pointerdown` solely for `audioController.unlock()` and autoplay-hint dismissal; do not play the click cue from `pointerdown` to avoid duplicate sound.
- Add a document capture `click` handler. Resolve the closest matching interactive element; skip when it or an ancestor matching the control is natively disabled or has `aria-disabled="true"`; otherwise call `playEffect("ui-click")`. This covers pointer click, mobile tap-generated click, and keyboard-generated native click activation.
- Add a document capture `pointerover` handler for `pointerType === "mouse"` only. Resolve the nearest interactive element and ignore disabled/aria-disabled controls. Compare the nearest matching `relatedTarget` element with the destination control; play `playEffect("ui-hover")` only when entering a different interactive control, not while moving between its descendants.
- Register and remove listeners in the same `useEffect`, with `audioController` as the dependency. Keep noninteractive decorative surfaces silent.
- **Tests**: one click cue for a button/card/selectable target activation; no cue for decorative content or disabled controls; keyboard click produces one cue; pointerover from outside to an interactive element plays hover; moving among nested children does not retrigger; crossing controls within 120 ms respects controller cooldown; touch pointerover does not produce hover.

## Acceptance Criteria
- [x] Interactive elements use the same hover cue and click cue regardless of screen or element type.
- [x] Only desktop mouse pointer entry plays hover; touch activation plays click only.
- [x] Disabled controls and decorative objects remain silent.
- [x] Rapid pointer movement cannot cause overlapping hover cues; all cues respect existing volume and mute settings.
- [x] Existing combat, turn-start, timer, and spell sound behavior is unchanged.

## Validation
- `npm test --workspace @board-game/web -- src/game/audio.test.ts src/App.interactions.test.tsx src/App.audio.test.tsx` — passed (20 tests).
- `npm run build --workspace @board-game/web` — passed (TypeScript and Vite production build).
- `npm run lint --workspace @board-game/web` — full lint reports 7 existing errors in unrelated files (`CardView.test.tsx`, `EnemyHeroDefeatEffect.tsx`, `gameActions.ts`, `useLocalRun.ts`); targeted lint for changed source/test files passed.

## Commit Message
```text
feat(audio): add shared interactive hover and click cues

Plan: 2026-10-29-menu-map-audio
Phase: P01-menu-audio
Task: T03-interaction-sounds

- Synthesize a rate-limited magical hover cue
- Route activation sounds through shared interactive event handling
```

## Progress
- [x] Implementation complete
- [x] Validation passed (with unrelated full-lint baseline noted above)
- commit: `b96e5dd`

