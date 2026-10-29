# Task: T01 Menu and Map Background Music

## Status: done

## Goal
Create one deterministic, seamless-looping dark-fantasy pre-battle music track for the main menu, expedition map, class selection, and reward screens, and expose it as a first-class `MusicKind` without changing the existing normal/boss tracks.

## Decision Summary
- The new track is code-synthesized, tense and anticipatory, and shared by all non-combat screens.
- Existing normal and boss battle music and the controller's 400 ms crossfade remain in place.
- Existing saved music volume and mute settings apply to the new track.

## Implementation

### I01. Generate a deterministic local music asset
- Related Files:
  - `apps/web/scripts/generate-menu-bgm.mjs` :: new dependency-free generator that writes the menu/map loop.
  - `apps/web/public/audio/bgm/menu.wav` :: generated local asset consumed by Vite's public path.

#### Details
- **Output format**: mono PCM WAV, 22,050 Hz, signed 16-bit samples, exactly 24 seconds (eight 4/4 bars at 80 BPM). This keeps the loop compact and broadly playable by HTML audio.
- **Sound design**: D-minor tonal center; low sustained D/A drone, a sparse repeating minor-key pulse, and occasional high, soft accents. Keep it tense and anticipatory rather than percussive or triumphant. Peak-normalize below full scale to avoid clipping.
- **Loop seam**: synthesize a periodic 24-second cycle and apply a 50 ms end-to-start crossfade so the final sample region joins the first without a click.
- **Generator behavior**: use only Node built-in modules (`node:fs`, `node:path`); output to `apps/web/public/audio/bgm/menu.wav`; repeated runs with the same source must produce byte-identical output. Add a top-level comment documenting tempo, key, duration, sample format, and regeneration command (`node apps/web/scripts/generate-menu-bgm.mjs`).
- **No external dependencies or network access** are needed to generate or play this track.

### I02. Register the music kind with the existing controller
- Related Files:
  - `apps/web/src/game/audio.ts` :: `MusicKind`, `MUSIC_SOURCES`, `AudioController.playMusic`, `createAudioController`; modify.
  - `apps/web/src/game/audio.test.ts` :: `createAudioController` music tests; modify.

#### Details
- **Types**: expand `MusicKind` from `"normal" | "boss"` to `"menu" | "normal" | "boss"`. Keep `AudioController.playMusic(kind: MusicKind): void` for this task; autoplay result reporting is handled in T02.
- **Source map**: map `menu` to `/audio/bgm/menu.wav`; preserve `/audio/bgm/normal.ogg` and `/audio/bgm/boss.ogg` exactly.
- `playMusic("menu")` must use the same loop, current-track deduplication, settings volume, and 400 ms crossfade behavior as other music kinds.
- **Tests**: verify menu path and `loop === true`; calling the same kind twice does not restart; transitions menu→normal→boss crossfade and dispose stop every player.

## Acceptance Criteria
- [ ] Running the generator creates a valid 24-second local WAV and a second run produces byte-identical bytes.
- [ ] Menu music loops through the existing controller, respects volume/mute settings, does not restart when selected repeatedly, and crossfades to battle tracks.
- [ ] Existing normal and boss music paths and behavior remain intact.

## Validation
- `node apps/web/scripts/generate-menu-bgm.mjs` — generate the committed WAV.
- `node apps/web/scripts/generate-menu-bgm.mjs` — regenerate and compare SHA-256 with the previous output to verify determinism.
- `npm test --workspace @board-game/web -- src/game/audio.test.ts` — audio-controller tests.
- `npm run build --workspace @board-game/web` — TypeScript and Vite production build.

## Commit Message
```text
feat(audio): add synthesized menu and map music

Plan: 2026-10-29-menu-map-audio
Phase: P01-menu-audio
Task: T01-menu-map-bgm

- Generate a deterministic loopable menu/map track
- Register it with the existing crossfading audio controller
```

## Progress
- [x] Implementation complete
- [x] Validation passed
- commit: pending

