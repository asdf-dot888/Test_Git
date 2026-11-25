# Plan: Hero Power and Hand Card Presentation

## Goal
Replace the class ability glyphs with clear class-specific illustrations, enlarge hand cards vertically without changing their width, display card art without cropping, and let players inspect a complete enlarged card on hover without changing click-to-play behavior.

## Phases
| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `done` | Add ability art, improve hand card proportions, and implement the non-interfering hover preview. | [P01](../phases/2026-10-28-hero-power-and-hand-card-presentation/P01-ability-and-hand-ui/phase.md) |

## Dependencies
- P01-T01 uses the existing `PlayerClass` IDs and `PLAYER_CLASS_DEFINITIONS`; it does not change ability cost or gameplay behavior.
- P01-T02 uses the existing card artwork assets and preserves the current hand card width at every breakpoint.
- P01-T03 preserves click selection and drag payload behavior while moving the inspection preview outside the horizontally scrolling hand container.

## Planning Notes
- The game already uses adult dark-fantasy character art: male Warrior, female Assassin, and female Demonist. Ability images follow that established class presentation.
- Source card art includes square and portrait images. The hand art area must show the complete image with `object-fit: contain`.
- A selected card remains selected for the existing play/targeting flow but does not open a detail popup. The enlarged inspection preview is hover-triggered only.
