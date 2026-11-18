# Task: T03 Sound Synthesis

## Status: todo

## Goal
Add a Web Audio synthesis layer that can play one unique sound recipe per effect, mixed with the existing sample cues, and wire it to primary effect events.

## Decision Summary
- D06: mix the existing CC0 samples with a real-time synthesis layer; no external library, no new audio files, no FFmpeg.
- D07: existing audio settings control the new sounds (mute and effects volume), including live changes while a cue plays.

## Implementation
### I01. Recipe schema and renderer
- `apps/web/src/game/soundRecipes.ts` (new)
  ```ts
  export type SynthWave = "sine" | "triangle" | "sawtooth" | "square" | "noise";
  export interface SynthFilter { type: "lowpass" | "highpass" | "bandpass"; fromHz: number; toHz?: number; q?: number }
  export interface SynthLayer {
    wave: SynthWave;
    startMs: number; durationMs: number;
    fromHz: number; toHz?: number;     // pitch glide (ignored for noise)
    gain: number;                       // 0..0.6 peak before master volume
    attackMs?: number;                  // default 12
    filter?: SynthFilter;
    detuneCents?: number;
  }
  export interface SoundRecipe { id: string; totalMs: number; layers: readonly SynthLayer[] }  // 1..6 layers
  export const SOUND_RECIPES: Readonly<Record<string, SoundRecipe>>; // empty in this task
  export function getSoundRecipe(id: string | null | undefined): SoundRecipe | undefined;
  export function recipeFingerprint(recipe: SoundRecipe): string; // stable string of layer params for uniqueness checks
  export const SYNTH_LIMITS: { maxLayers: 6; maxGain: 0.6; maxTotalMs: 2000 };
  ```
- `apps/web/src/game/audio.ts`
  - `AudioController` gains `playSpellCue(id: string, volumeScale?: number): void`.
  - Implementation mirrors `playTurnStartCue`/`playHoverCue`: build a master `GainNode` at `effectVolume(0.5 * scale)`, one `OscillatorNode` (or a looped noise `AudioBufferSourceNode`, generated once per context and cached) plus envelope `GainNode` (+ optional `BiquadFilterNode`) per layer, schedule with `context.currentTime + startMs/1000`, frequency/filter glides via `exponentialRampToValueAtTime`, clean up on `onended`, skip entirely when `effectVolume(...) === 0`, the context is unavailable, or the recipe is unknown.
  - Track active spell cues in a `spellCues` set so `setSettings` updates their master gain and `dispose` stops and disconnects them (same pattern as `turnCues`/`hoverCues`).
  - Cap concurrent spell cues at 4 (drop the oldest) so rapid spell sequences cannot stack unboundedly.
### I02. App wiring
- `apps/web/src/App.tsx` (the effect near line 207): after the existing `combatEventSounds(event)` loop, `if (event.visualId && event.visualRole === "primary") audioController.playSpellCue(event.visualId);`. Existing sample cues keep playing unchanged (the sample stays as the base layer).
### I03. Tests
- `apps/web/src/game/soundRecipes.test.ts` (new): invariants over `SOUND_RECIPES` (vacuous now): 1..6 layers, `gain <= 0.6`, every `startMs + durationMs <= totalMs <= 2000`, positive frequencies in 20..16000 Hz, unique fingerprints, recipe ids equal registry spec ids once content lands.
- `apps/web/src/game/audio.test.ts`: with the fake `AudioContext` used by the turn-start tests and an injected test recipe: `playSpellCue` creates the expected node graph, schedules layers at their offsets, is silent when muted or volume is 0, ignores unknown ids, applies volume changes through `setSettings`, cleans up on end and on `dispose`, and drops the oldest cue beyond 4 concurrent.
- `apps/web/src/App.*.test.tsx` (the existing audio/effects test file for combat sounds): a tagged primary event triggers `playSpellCue` once; follow-up events and untagged events do not.

## Acceptance Criteria
- [ ] A recipe can be played through `playSpellCue` and respects mute/volume/dispose.
- [ ] Primary events trigger exactly one synth cue in addition to the existing sample cues.
- [ ] No new asset files or dependencies.
- [ ] Tests, lint, build pass.

## Validation
- `npm run build` then `npm test -- apps/web/src/game/soundRecipes.test.ts apps/web/src/game/audio.test.ts`
- `npm test`, `npm run lint`, `npm run build`

## Commit Message
```text
feat(audio): add synthesized spell sound cues

Plan: 2026-11-18-spell-and-hero-power-effects
Phase: P01-foundation
Task: T03-sound-synthesis
```

## Progress
- [ ] implementation complete
- [ ] validation passed
- commit: pending
