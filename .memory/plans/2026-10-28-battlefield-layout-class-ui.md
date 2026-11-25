# Plan: Battlefield Layout and Class UI

## Goal
Fit the battle screen in one viewport, including mobile portrait, while giving the battlefield more room and keeping a compact readable hand. Move class powers beside the player hero portrait with clear costs, and give each class a distinct illustrated hero portrait in battle and at class selection.

## Phases
| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `done` | Add class hero portraits, class selection artwork, readable hero power control, and a no-vertical-scroll battle layout. | [P01](../phases/2026-10-28-battlefield-layout-class-ui/P01-battlefield-presentation/phase.md) |

## Dependencies
- P01 uses existing `PlayerClass`, class power definitions, and target selection behavior; no game-core rule changes are needed.
- P01-T02 uses the three portrait assets created in P01-T01.

## Planning Notes
- Keep the existing legacy-run fallback portrait when `RunState.playerClass` is absent.
- Hero power costs and effects stay as implemented: 2 mana for every class; Demonist also spends 3 soul shards; Assassin still enters enemy-target selection.
- The one-viewport constraint applies to the battle screen. On narrow portrait screens, the hand scrolls horizontally.
- This plan contains task blueprints only; implementation and validation happen during memory-execute.
