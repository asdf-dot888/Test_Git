# Plan: Menu, Map, and Interaction Audio

## Goal
Start background music as soon as the authenticated game menu is shown, explain browser-blocked autoplay and retry it on the first user gesture, give non-combat screens their own synthesized looping music, retain the existing normal and boss battle tracks, and add consistent hover/click feedback to interactive elements.

Source decision: [Pre-Interaction Music and UI Sounds](../decisions/2026-10-29-preinteraction-music.md)

## Phases
| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `done` | Add the menu/map loop, route music by game screen, handle autoplay fallback, and wire shared interaction cues. | [P01](../phases/2026-10-29-menu-map-audio/P01-menu-audio/phase.md) |

## Scope and constraints
- Play menu/map music on the main menu, expedition map, class-selection screen, and reward flow. Play normal or boss music while the corresponding encounter and its victory presentation are active.
- Attempt menu music only after Entra authentication and after local run loading allows the main menu to appear. If audible autoplay is rejected while audio is enabled, show `화면을 눌러 음악 시작` beside the sound control; hide it after a successful first-gesture retry.
- Generate the new menu/map BGM with deterministic code and no external music libraries or runtime network requests. Keep the existing `AudioController` and its volume, mute, and crossfade behavior.
- Use the existing `ui-click.ogg` for activation. Synthesize a short, subtle magical sparkle hover cue with Web Audio. Apply both cues to interactive elements only; ignore disabled controls and decorative elements. On touch, activation has a click cue and there is no hover cue.
- Add a short global cooldown to hover playback so pointer movement across a row does not stack many cues.
- Preserve the user's saved audio preferences. Do not force sound when muted or music volume is zero.

