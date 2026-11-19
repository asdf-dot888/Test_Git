# Plan: Public Azure Presentation

## Goal
Publish the completed 12-slide HTML deck publicly at the existing Mango Stone Azure Static Web Apps site while preserving the game and leaderboard API.

## Decision
[Public Azure Presentation](../decisions/2026-11-20-public-azure-presentation.md)

## Phases
| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `done` | Add the static deck, deploy the existing app, and verify the public route. | [P01](../phases/2026-11-20-public-azure-presentation/P01-publication/phase.md) |

## Boundaries
- Preserve the existing game at `/`, managed leaderboard API, and all unrelated untracked files.
- Never print or commit deployment credentials.
- Report the former private Sites deployment's actual deletion state separately.
