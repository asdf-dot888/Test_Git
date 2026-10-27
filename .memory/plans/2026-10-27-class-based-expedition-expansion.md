# Plan: Class-Based Expedition Expansion

## Goal
Add three selectable classes, class powers and decks, new card interactions and fusion, a 35-card reward limit, enemy action previews, and phase-specific dark-fantasy presentation. New runs use a 30-card deck (10 class cards plus 20 shared cards); preserve the existing three phases of three normal battles and one boss.

## Phases
| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `done` | Add class, phase encounter, hero-power, spell, and fusion rules to game-core. | [P01](../phases/2026-10-27-class-based-expedition-expansion/P01-game-core/phase.md) |
| P02 | `done` | Add class selection, power UI, reward/deck flow, mouse interactions, and enemy intent preview. | [P02](../phases/2026-10-27-class-based-expedition-expansion/P02-game-ui/phase.md) |
| P03 | `in_progress` | Apply phase art and distinct combat/death effects, then widen the board layout. | [P03](../phases/2026-10-27-class-based-expedition-expansion/P03-presentation/phase.md) |

## Dependencies
- P02 uses the game-core types and APIs from P01.
- P03 uses the phase and card identifiers established in P01.
- Enemy opening-hand, mana, and deck improvements remain governed by [2026-10-26-enemy-opening-stability.md](../decisions/2026-10-26-enemy-opening-stability.md).

## Planning Notes
- Saved runs without class metadata remain playable as legacy runs.
- New card identities, stats, text, fusion recipes, and demon tokens are defined in their task implementation.
- This step creates planning documents only; it does not modify implementation code or run validation.
