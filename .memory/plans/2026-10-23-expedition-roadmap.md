# Plan: Expedition Roadmap

## Goal

Add an atmospheric expedition roadmap that presents the four encounters in the current phase, shows completed and active encounter states clearly, and lets the player deliberately enter or resume battles while preserving their run when they return to the main menu.

## Phases
| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `done` | Build the roadmap screen and connect new-run, continue-run, post-reward, and main-menu navigation to saved encounter state. | [P01](../phases/2026-10-23-expedition-roadmap/P01-expedition-roadmap/phase.md) |

## Scope Notes

- Keep the current fixed encounter order and existing `RunState.encounters` schema; do not add route-choice or route-status fields.
- Display only the four encounters belonging to the phase containing the active or next pending encounter.
- New expeditions and active-run continuation open the roadmap. Selecting the active encounter resumes it; selecting the next pending encounter advances the run and starts that battle.
- A pending victory acknowledgement or reward screen takes precedence when continuing a saved run. Once resolved, return to the roadmap before the next battle.
- Completed portraits are grayscale. The active encounter has a green portrait border and distinct highlight. Future encounters remain unavailable.
- The map uses a generated dark rock-and-black-mist background, with the red winding route and encounter nodes rendered by UI. Existing enemy portraits are reused; boss portraits are larger.
- The roadmap’s main-menu button returns to the menu while keeping the saved run available to continue.
- No authentication, game-core progression rules, reward contents, enemy balance, or persisted data schema changes are in scope.

## Task Sequence

1. Create the roadmap visual component, status-driven encounter nodes, background art asset, responsive styling, and component tests.
2. Integrate the roadmap into the application navigation and test new-run, continue-run, reward, encounter-start, and return-to-menu flows.
