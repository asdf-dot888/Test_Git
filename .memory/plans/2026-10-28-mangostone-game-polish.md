# Plan: Mango Stone Game Polish

## Goal

Implement the three confirmed, unplanned decisions together: add the shared 1-cost “영혼의 거래” spell with temporary mana and enemy AI support; give the battlefield more screen space, clearly mark attack-exhausted friendly minions, move the all-attack control, and expose audio settings outside combat; rename player-facing game branding to “망고스톤 / MANGO STONE”.

The measurable outcome is that all six tasks below pass their specified tests, lint, and build checks, with `.memory/current.md` advanced after each task.

## Decision Sources

- [Soul Bargain card](../decisions/2026-10-28-soul-bargain-card.md)
- [Battle layout and audio access](../decisions/2026-10-28-battle-layout-audio-access.md)
- [Game title — Mangostone](../decisions/2026-10-28-game-title-mangostone.md)

## Phases

| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `done ✅` | Add temporary mana and the shared spell, then teach enemy AI when to use it. | [P01](../phases/2026-10-28-mangostone-game-polish/P01-core-mechanics/phase.md) |
| P02 | `done` | Improve battlefield layout and controls, add audio settings entry points, and unify the game title. | [P02](../phases/2026-10-28-mangostone-game-polish/P02-player-experience/phase.md) |

