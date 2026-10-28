# Task: T03 Audio Settings Entry Points

## Status: done

## Goal

Let players open the existing audio settings from the upper-right of both the main menu and expedition roadmap, while reusing the same persisted settings and modal controls used during combat.

## Decision Summary

- Source: `.memory/decisions/2026-10-28-battle-layout-audio-access.md`.
- Use a speaker/settings button in the upper-right of both screens; clicking opens an audio-settings modal.
- `App.tsx` already owns `audioSettings`, applies changes through `audioController.setSettings`, and persists them through `saveAudioSettings`; retain this single source of truth.

## Implementation

### I01. Extract or reuse an audio-only modal

- Related Files:
  - `apps/web/src/components/GameMenu.tsx` :: settings rendering and `AudioSettings` controls — reuse or extract controls without changing pause/menu choices; modify.
  - `apps/web/src/components/AudioSettingsModal.tsx` :: new reusable audio modal if extraction is selected — create.
  - `apps/web/src/components/GameMenu.test.tsx` and new modal tests — preserve existing settings behavior and verify the reusable modal; modify/create.
  - `apps/web/src/styles/board.css` :: `.game-menu-backdrop`, `.game-menu-panel`, `.audio-settings-*` — apply the existing visual language to the reusable modal; modify.

#### Details

- Reuse the existing fields exactly: `musicVolume: number`, `effectsVolume: number`, `muted: boolean`; preserve slider and checkbox labels, values, and `onSettingsChange` updates.
- The modal must have `role="dialog"`, `aria-modal="true"`, an accessible title, and a clear close button. Closing it returns to the same main menu/roadmap screen.
- The in-combat `GameMenu` must continue to show its choices/settings/back-to-choices flow and must use the same settings component rather than maintain a second settings implementation.

### I02. Add top-right entry buttons and App state wiring

- Related Files:
  - `apps/web/src/App.tsx` :: `GameSessionContent` screen state and render branches — own one `audioSettingsOpen` state and render the shared modal with existing settings; modify.
  - `apps/web/src/components/MainMenu.tsx` :: `MainMenuProps`, upper-right settings button — add callback and button; modify.
  - `apps/web/src/components/ExpeditionRoadmap.tsx` :: `ExpeditionRoadmapProps`, top-right action buttons — add callback/button beside leaderboard; modify.
  - `apps/web/src/components/MainMenu.test.tsx`, `apps/web/src/components/ExpeditionRoadmap.test.tsx`, `apps/web/src/App.test.tsx` — test callbacks, modal rendering/close, and shared settings updates; modify.
  - `apps/web/src/styles/board.css` :: menu and roadmap top-right button groups and mobile rules — style; modify.

#### Details

- Add required `onAudioSettings()` props and invoke them from an icon button with a visible/accessible “음향 설정” name and title.
- Main menu: position the button at the screen's upper-right without moving or obscuring the centered menu card.
- Roadmap: position it upper-right alongside the existing leaderboard crown button; preserve leaderboard and main-menu actions.
- Reuse the existing `audioSettings` React state; updates must continue to trigger both the audio controller and `saveAudioSettings` effect. Closing the modal must not reset values.
- Test that settings opened from each route reflect current values, update persisted state through existing `setAudioSettings`, and close back to the same route.

## Acceptance Criteria

- [x] Main menu and roadmap each show an upper-right audio settings button.
- [x] Both buttons open the same audio settings modal and changes apply immediately.
- [x] Audio settings persist across screen changes and remain the same in the combat menu.
- [x] Modal controls and adjacent leaderboard control remain usable on mobile sizes.

## Validation

- `npm test -- apps/web/src/components/GameMenu.test.tsx apps/web/src/components/MainMenu.test.tsx apps/web/src/components/ExpeditionRoadmap.test.tsx apps/web/src/App.test.tsx` — modal, navigation, and persistence tests pass.
- `npm run lint -- apps/web/src/App.tsx apps/web/src/components/GameMenu.tsx apps/web/src/components/MainMenu.tsx apps/web/src/components/ExpeditionRoadmap.tsx` — lint passes.
- `npm run build --workspace @board-game/web` — web build succeeds.

## Commit Message

Validation note: targeted ESLint passed on all changed TS/TSX files. The workspace-wide lint command still reports four existing errors in `gameActions.ts` and `useLocalRun.ts`. The web build passed with existing bundle-size and MSAL dynamic-import warnings.

```text
feat(web): expose audio settings from menu and roadmap

Plan: 2026-10-28-mangostone-game-polish
Phase: P02-player-experience
Task: T03-audio-settings-entry-points

- Reuse persisted audio settings in a shared modal
- Add upper-right settings entry points outside combat
```

## Progress

- [x] Implementation complete
- [x] Validation passed
- commit: pending

