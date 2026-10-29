# Task: T02 Music Routing and Autoplay Fallback

## Status: done

## Goal
Start the menu track only after Entra authentication and main-menu readiness, route music correctly across non-combat and combat screens, and tell the player when the browser requires an interaction before audible playback.

## Decision Summary
- Main menu, map, class selection, and rewards use `menu`; active normal/boss encounters and their victory presentation use their respective existing battle track.
- A rejected autoplay attempt shows a small hint by the audio-settings control; a successful first pointer gesture retries playback and dismisses the hint.
- If muted or music volume is zero, do not show an autoplay hint; preserve persisted settings.

## Implementation

### I01. Report whether a music playback attempt succeeded
- Related Files:
  - `apps/web/src/game/audio.ts` :: `AudioController`, `attemptPlay`, `createAudioController().unlock`, `createAudioController().playMusic`; modify.
  - `apps/web/src/game/audio.test.ts` :: blocked-playback and unlock tests; modify.

#### Details
- Change `AudioController.playMusic(kind)` to return `Promise<boolean>`: resolve `true` when the selected current track's `HTMLAudioElement.play()` succeeds, and `false` when it rejects or throws. Keep stale/fading track results from changing the current track's state.
- Change `AudioController.unlock()` to return `Promise<boolean>`: resume suspended `AudioContext` if present, retry the current track if it has not started, then report whether current music is playing. Do not throw on browser audio-policy rejection.
- Preserve loop, same-track deduplication, crossfade, cleanup, mute, and volume behavior. Update all call sites to handle or explicitly ignore the Promise.
- **Tests**: resolve/reject/throw playback paths; blocked menu attempt followed by successful `unlock()`; muted/zero-volume state; switching tracks while an earlier playback Promise is pending.

### I02. Select track from authenticated screen and present fallback hint
- Related Files:
  - `apps/web/src/App.tsx` :: `GameSessionContent`, music `useEffect`, document `pointerdown` effect, menu/map/class-selection/reward render branches; modify.
  - `apps/web/src/components/MainMenu.tsx` :: `MainMenuProps`, audio-settings button; add optional autoplay-hint rendering beside audio settings.
  - `apps/web/src/components/ExpeditionRoadmap.tsx` :: `ExpeditionRoadmapProps`, audio-settings button; add optional autoplay-hint rendering beside audio settings.
  - `apps/web/src/styles/board.css` :: menu/map audio-button and responsive rules near `.menu-audio-settings-button` and `.expedition-roadmap__audio-button`; add hint styles.
  - `apps/web/src/App.audio.test.tsx` :: authenticated menu audio lifecycle cases; modify.
  - `apps/web/src/components/MainMenu.test.tsx` and `apps/web/src/components/ExpeditionRoadmap.test.tsx` :: hint visibility/accessibility cases; modify.

#### Details
- **State**: add `autoplayHintVisible: boolean` in `GameSessionContent`, initially false. Keep the hint local to this app session; do not persist it.
- **Track selection**:
  1. After `audioController` exists and `sync.loaded` is true, attempt `playMusic("menu")` when `screen` is `menu`, `map`, or `class-selection`, or when the run is in its reward flow.
  2. While `screen === "game"` and a battle is active or its victory presentation is in progress, select `boss` if the current encounter enemy kind is boss; otherwise select `normal`.
  3. After victory acknowledgement transitions to map, return to `menu`; screens with no active battle and no reward use `menu`.
  4. Avoid restarting a track for unrelated React state changes; rely on controller's same-kind deduplication and constrain effect dependencies to the effective track kind and controller.
- **Autoplay status**: only set hint true when a `menu` playback attempt returns false and `audioSettings.muted === false` and `audioSettings.musicVolume > 0`. Hide the hint when playback succeeds, audio is muted, or volume is zero.
- **Gesture retry**: retain the document capture `pointerdown` audio unlock. When `unlock()` resolves true, hide the hint. The first pointerdown must still unlock audio before the ensuing click sound/action. Do not play menu music on the auth configuration, authentication loading, or sign-in screen.
- **UI**: pass a boolean hint prop to both `MainMenu` and `ExpeditionRoadmap`; show accessible status text `화면을 눌러 음악 시작` adjacent to the sound-settings button only while visible. Use a compact, readable, non-blocking label with a subtle pulse; ensure it does not cover the button or route controls at desktop or mobile breakpoints.
- **Tests**: with fake audio rejecting before a gesture, assert no music before `sync.loaded`, menu track is attempted after readiness, hint appears on menu, pointerdown unlock retries and hides it, map/class-selection/reward keep menu music, active normal/boss encounter selects correct existing tracks, and mute/zero music volume suppress hint.

## Acceptance Criteria
- [ ] No music attempt occurs while authentication or local-run loading screens are visible.
- [ ] Menu/map/class-selection/reward use the menu track; active normal/boss battles use the correct existing track; victory presentation completes on its battle track.
- [ ] A rejected audible autoplay attempt displays the small adjacent hint; a successful user-gesture retry hides it.
- [ ] Saved mute and volume preferences remain authoritative and are not overridden.

## Validation
- `npm test --workspace @board-game/web -- src/game/audio.test.ts src/App.audio.test.tsx src/components/MainMenu.test.tsx src/components/ExpeditionRoadmap.test.tsx` — playback lifecycle and hint behavior.
- `npm run build --workspace @board-game/web` — TypeScript and Vite production build.
- `npm run lint --workspace @board-game/web` — lint.

## Commit Message
```text
feat(audio): start menu music with autoplay fallback

Plan: 2026-10-29-menu-map-audio
Phase: P01-menu-audio
Task: T02-autoplay-lifecycle

- Route menu and battle music by application state
- Show and dismiss a browser autoplay hint
```

## Progress
- [x] Implementation complete
- [x] Validation passed for this task's changed files.
- Note: the full web lint command still reports seven pre-existing issues in `CardView.test.tsx`, `EnemyHeroDefeatEffect.tsx`, `gameActions.ts`, and `useLocalRun.ts`; targeted lint on T02 files passes.
- commit: pending

