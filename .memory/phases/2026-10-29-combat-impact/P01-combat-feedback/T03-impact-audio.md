# Task: T03 Tiered Combat Sound Assets and Routing

## Status: in_progress

## Goal
Provide distinct light, medium, heavy, armor-block, direct minion-to-hero, and boss-area hit sounds by processing the game's existing attack and damage clips. Route each combat event to one matching sound while honoring the current effects-volume and mute settings.

## Decision Summary
- Create separate sound files derived from existing `attack.ogg` and `damage.ogg`; do not add external audio libraries or change the game's sound palette.
- Heavy and boss-area sounds are lower and weightier than light sounds. Minion retaliation uses the light sound regardless of damage. Lethal hits also play existing `death.ogg`.
- A zero-damage random result has no hit sound; its existing spell-cast sound remains. Full armor block uses a small separate block sound.

## Implementation

### I01. Produce deterministic derived sound clips
- Related Files:
  - `apps/web/public/audio/sfx/attack.ogg` :: source attack sound; read-only
  - `apps/web/public/audio/sfx/damage.ogg` :: source damage sound; read-only
  - `apps/web/public/audio/sfx/impact-light.ogg` :: light hit output; new
  - `apps/web/public/audio/sfx/impact-medium.ogg` :: medium hit output; new
  - `apps/web/public/audio/sfx/impact-heavy.ogg` :: heavy hit output; new
  - `apps/web/public/audio/sfx/impact-armor-block.ogg` :: armor-block output; new
  - `apps/web/public/audio/sfx/impact-hero-melee.ogg` :: minion-to-hero output; new
  - `apps/web/public/audio/sfx/impact-boss-area.ogg` :: boss-area output; new
  - `scripts/generate-combat-impact-audio.ps1` :: repeatable FFmpeg conversion; new

#### Details
- **Generation Contract**:
  - Require the FFmpeg CLI and verify `ffmpeg -version` before doing any work. If unavailable, stop with an actionable message; the script must not install software or download audio.
  - Use only the existing attack and damage OGGs as inputs. Render all six outputs to `.tmp/combat-impact-audio`; copy them into the public audio folder only after every conversion succeeds.
  - Encode all outputs as 48 kHz stereo OGG Vorbis using `libvorbis`, quality 4, peak at or below -1 dBFS, and duration at or below 1.5 seconds.
  - Use differentiated FFmpeg audio filters: light favors a short high-mid transient; medium keeps the source balance; heavy and boss-area add progressively stronger low-frequency weight and longer decay; armor-block emphasizes a brief metallic high-frequency transient; hero-melee layers a sharp attack transient over the damage source. Avoid clipping and keep all clips audible at the existing default effects volume.
  - Make the script deterministic and idempotent. Do not alter source `attack.ogg`, `damage.ogg`, or `death.ogg`.
- **Execution Flow / Logic**:
  1. Confirm both source files and FFmpeg exist before producing output.
  2. Render each output to the temp directory, check that it is non-empty and decodable, and only then copy outputs into `apps/web/public/audio/sfx`.
  3. A failed conversion must leave existing published output files untouched. Keep temporary files out of Git.

### I02. Route impact outcomes through the existing audio controller
- Related Files:
  - `apps/web/src/game/audio.ts` :: `SoundEffectKind`, `EFFECT_SOURCES`, `playEffect`; modify
  - `apps/web/src/App.tsx` :: combat event sound handler around `session.combatEffects`; modify
  - `apps/web/src/game/combatEffects.ts` :: event-to-impact sound selector; modify
  - `apps/web/src/game/audio.test.ts` :: mappings and settings behavior; modify
  - `apps/web/src/game/combatEffects.test.ts` :: selected sound for each event outcome; modify

#### Details
- **Signatures & Types**:
  ```typescript
  export type SoundEffectKind =
    | "hero-attack" | "minion-attack" | "spell" | "heal" | "damage" | "death"
    | "ui-click" | "turn-start" | "turn-end" | "summon" | "timer-warning"
    | "impact-light" | "impact-medium" | "impact-heavy"
    | "impact-armor-block" | "impact-hero-melee" | "impact-boss-area";

  export function combatImpactSounds(event: CombatEffectEvent): SoundEffectKind[];
  ```
- **Data & Schema Fields**:
  - Map each new sound kind to its corresponding `apps/web/public/audio/sfx/impact-*.ogg` path in `EFFECT_SOURCES`.
  - Keep `death` mapped to `/audio/sfx/death.ogg`.
  - Impact sounds are separate from cast/summon cues. One event may play `spell` plus one impact sound. Never play generic `damage` and a dedicated impact sound together for the same target.
- **Execution Flow / Logic**:
  1. Select boss-area for `event.bossArea`. Also add one armor-block cue if any `affectedTargets` entry has `outcome === "armor-block"`. For non-area events, select armor-block for `damage.outcome === "armor-block"`; hero-melee for a minion source hitting a hero; light for retaliation; otherwise select light/medium/heavy by amount. Return an empty array for miss and non-damage events.
  2. In `App.tsx`, preserve current one-time-per-event playback. Keep unrelated cues, filter generic `damage` when dedicated impact sounds are selected, then play each selected impact sound. Retain the separate `death` cue whenever `event.soundCues` includes `death`, including lethal hero hits.
  3. Route all new sounds through the existing `AudioController` so `setSettings`, effects volume, mute, and disposal continue to apply. Never play audio during render.
  4. Keep playback safe when browser audio is unavailable or a file fails to load.

### I03. Verify generated sound and routing
- Related Files:
  - `apps/web/src/game/audio.test.ts` :: sound source and settings tests; modify
  - `apps/web/src/game/combatEffects.test.ts` :: event routing tests; modify
#### Details
- Assert all six files exist and are referenced by `EFFECT_SOURCES`.
- Assert tier, retaliation, armor-block, direct hero hit, boss-area (including its armor-block target), miss, and lethal events select intended sounds without duplicate generic damage.
- Run the generator twice; verify outputs decode and meet duration/peak limits.

## Acceptance Criteria
- [ ] Six separate sound clips are derived from existing attack/damage sounds and reproducible with the script.
- [ ] Event routing plays the intended impact sound plus any required spell/death cues.
- [ ] Effects volume and mute apply to every new sound.
- [ ] Misses do not play hit sounds; armor blocks and retaliation use dedicated small sounds.

## Validation
- `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/generate-combat-impact-audio.ps1` — run after implementation; requires FFmpeg already installed.
- `npm.cmd test -- apps/web/src/game/audio.test.ts apps/web/src/game/combatEffects.test.ts` — run after implementation.
- `npm.cmd run build --workspace @board-game/web` — run after implementation.

## Commit Message
```text
feat(web): add damage-tier combat audio

Plan: 2026-10-29-combat-impact
Phase: P01-combat-feedback
Task: T03-impact-audio

- Derive distinct light, medium, heavy, armor, hero, and boss impact clips
- Route combat damage events through the user's audio settings
```

## Progress
- [ ] Implementation complete
- [ ] Validation passed
- commit: pending

