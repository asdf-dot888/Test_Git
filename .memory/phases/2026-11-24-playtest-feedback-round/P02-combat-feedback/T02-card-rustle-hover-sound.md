# Task: T02 Card Rustle Hover Sound

## Status: todo

## Goal
Replace the sharp two-note hover sparkle with a soft card rustle ("사락") so it can no longer be confused with the timer warning, and let the user listen to it on `/?effects-preview`.

## Decision Summary
D04. A very short band-filtered noise burst, quieter than today. `timer-warning.ogg` is unchanged. Claude cannot hear it: the constants below are a starting point and the user makes the final call.

## Implementation
### I01. Synthesis (`apps/web/src/game/audio.ts`)
- Rewrite `playHoverCue` (keep the rate limit `now - lastHoverAt < 120` and the `effectVolume(...) === 0` / disposed guards, the call site `playEffect("ui-hover")` and the `SoundEffectKind` union):
  - Noise: a cached mono `AudioBuffer` of 0.12 s of white noise created once per `AudioContext` (reuse it for later cues); play it with an `AudioBufferSourceNode`.
  - Filter: one `BiquadFilterNode`, `type: "bandpass"`, `Q = 0.9`, frequency swept from 1800 Hz to 4200 Hz over 90 ms (`frequency.setValueAtTime` then `exponentialRampToValueAtTime`), which gives the "swish" of a card.
  - Envelope: gain `0.0001` -> `0.9` in 8 ms (linear), then exponential decay to `0.0001` by 100 ms; master gain `effectVolume(0.12)` (the old cue used `0.22`).
  - Stop the source at about 0.11 s and disconnect the nodes in `onended`.
- `hoverCues` currently stores oscillators (`{ master, oscillators }`) and is used by the volume update (`setValueAtTime(effectVolume(0.22)...)`) and by dispose: change the entry type to `{ master: GainNode; sources: AudioScheduledSourceNode[] }` and update those three places (use the new master volume constant `HOVER_CUE_VOLUME = 0.12` everywhere instead of the literal `0.22`).
- Keep the constants (`HOVER_NOISE_SECONDS`, `HOVER_FILTER_START_HZ`, `HOVER_FILTER_END_HZ`, `HOVER_CUE_VOLUME`) at the top of the file so they are easy to retune.
### I02. Preview button (`apps/web/src/dev/EffectsPreview.tsx`)
- Add a "호버 소리 (카드 사락)" button next to the existing sound controls that calls `ensureAudio()?.playEffect("ui-hover")`. Keep the existing sound on/off setting; the button respects it.
### I03. Tests
- `apps/web/src/game/audio.test.ts`: replace the "two-note hover sparkle" test (around line 293) and the dispose/volume/rate-limit tests (around lines 310-330) with versions for the noise cue: one buffer source plus one bandpass filter is created per cue, the source starts and stops within 0.15 s, nodes disconnect after `onended`, mute and effect volume 0 create nothing, the 120 ms rate limit still applies, dispose clears active nodes. Extend the existing `AudioContext` test double with `createBuffer`, `createBufferSource` and `createBiquadFilter` if it lacks them.

## Acceptance Criteria
- [ ] Hovering a card plays the new cue (no oscillators in the cue), at most once per 120 ms, silent when muted or at effect volume 0.
- [ ] Dispose and volume changes still work with the new cue entries.
- [ ] The preview page has a working hover sound button.
- [ ] Build, lint and tests pass.

## Validation
- `npm run build`
- `npm test -- apps/web/src/game/audio.test.ts apps/web/src/dev/EffectsPreview.test.tsx`
- `npm test`, `npm run lint`
- Manual (user): `npm run dev`, open `/?effects-preview`, press the hover button and also hover cards in a battle; report if it should be softer, shorter, lower or quieter and the constants are retuned in a follow-up commit.

## Commit Message
```text
feat(web): replace the hover cue with a soft card rustle

Plan: 2026-11-24-playtest-feedback-round
Phase: P02-combat-feedback
Task: T02-card-rustle-hover-sound
```

## Progress
- [ ] implementation complete
- [ ] validation passed
- commit: pending
