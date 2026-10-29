# Decisions: Pre-Interaction Music and UI Sounds

- Date: 2026-10-29
- Status: Confirmed

## D01. Background music start and autoplay fallback
- **Chosen**: After Entra sign-in completes and the game main menu appears, attempt to start the menu music before the player interacts with the game. If the browser rejects audible autoplay, show a small `화면을 눌러 음악 시작` hint next to the sound control. The first click or touch retries audio playback and hides the hint.
- **Rationale**: This starts music as early as browsers allow while explaining why it may remain silent until the first gesture.

## D02. Screen-specific music
- **Chosen**: Use one new, code-synthesized, tense pre-battle loop for both the main menu and expedition map. Keep the existing normal battle track for regular battles and the existing boss track for boss battles.
- **Rationale**: Menu and map get an identity separate from combat, while current battle music remains in use.

## D03. Shared interaction sound effects
- **Chosen**: Play one consistent hover sound on pointer entry and one different, consistent click sound on activation for interactive elements only, including buttons, cards, and selectable targets. Do not play these sounds for decorative elements. Use a short, subtle magical sparkle for hover and the existing UI click sound for clicks. On touch devices, play the click sound on tap; there is no hover sound.
- **Rationale**: The same two cues make interaction feedback predictable across screens without adding noise to decorative areas.

## D04. Hover sound repetition
- **Chosen**: Apply a short global cooldown to hover sound playback so quickly crossing a row of cards does not create overlapping sound.
- **Rationale**: Keep pointer feedback audible but not noisy when moving across many interactive elements.

## Repository facts and implementation constraints
- `apps/web/src/game/audio.ts` already owns music playback, effect playback, volume/mute settings, and a Web Audio context for a synthesized turn-start cue.
- Existing music kinds are `normal` and `boss`, backed by `/audio/bgm/normal.ogg` and `/audio/bgm/boss.ogg`.
- Existing `ui-click.ogg` is already mapped as the `ui-click` effect. The audio controller catches rejected `play()` calls, so autoplay fallback state will need to be exposed to the UI if the hint is to appear only when playback is denied.
- `App.tsx` currently attempts music based on encounter type and listens for `pointerdown` to unlock audio. The implementation should move the initial attempt to the authenticated main-menu state and retain the gesture-based unlock behavior.
- Preserve existing saved music/effect volume and mute preferences when adding the new track and cues.
- The new menu/map music and hover cue should be generated in code; the menu/map track should loop cleanly. Keep the audio-controller architecture rather than adding a parallel standalone `<audio>` implementation.
