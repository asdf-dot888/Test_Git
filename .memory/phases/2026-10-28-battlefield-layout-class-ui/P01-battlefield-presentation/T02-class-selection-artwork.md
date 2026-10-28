# Task: T02 Class Selection Artwork

## Status: done

## Goal
Make class selection feel visual by showing all three class portraits on their choice cards and retaining the selected class's ability summary below the choices.

## Decision Summary
- Reuse the portrait assets from T01 on the corresponding Warrior, Assassin, and Demonist cards.
- Keep all three choices visible together; selecting a card continues to update the existing ability preview below.

## Implementation

### I01. Add portraits to class choice cards
- Related Files:
  - `apps/web/src/components/ClassSelectionScreen.tsx` :: `ClassSelectionScreen` and `class-choice-grid`; modify.
  - `apps/web/src/styles/board.css` :: `.class-choice-grid`, `.class-choice`, `.class-choice-icon`, responsive `@media` rules; modify.
  - `apps/web/src/components/ClassSelectionScreen.test.tsx` :: class portrait and selected ability assertions; modify.
- Details
  - For each `PLAYER_CLASS_DEFINITIONS` entry, render an image with `src=/art/heroes/${option.id}.png`, `alt=${option.name} 초상화`, and a class-specific portrait CSS class. Remove the decorative Unicode class icon once the portrait is present.
  - Keep the accessible radio group semantics, selected state, `disabled`, confirm, and cancel behavior unchanged.
  - Keep class name and archetype readable over or below the portrait. Keep `.class-power-preview` below the three-card grid and update it from the selected definition.
  - On desktop, retain three cards in one row. On narrow screens, retain a usable portrait-first layout and allow the class-selection page itself to scroll if its content exceeds a short viewport; the battle-only no-vertical-scroll rule does not apply here.
- Required data shape: `PLAYER_CLASS_DEFINITIONS` entries already expose `id: PlayerClass`, `name: string`, `archetype: string`, `heroPowerName: string`, and `heroPowerDescription: string`; do not change the game-core schema.

## Acceptance Criteria
- [x] All three class options display their matching T01 portrait assets at the same time.
- [x] Selecting another class changes the selected outline and the ability preview below.
- [x] Existing radio selection, cancellation, disabled state, and confirmation behavior remain intact.
- [x] Text remains legible over portrait art at desktop and mobile widths.

## Validation
- `npm run test --workspace @board-game/web -- src/components/ClassSelectionScreen.test.tsx` — class selection behavior and image paths pass.
- `npm run build --workspace @board-game/web` — production build passes.

## Commit Message
```text
feat(web): show class portraits during expedition selection

Plan: 2026-10-28-battlefield-layout-class-ui
Phase: P01-battlefield-presentation
Task: T02-class-selection-artwork

- Add class art to all three selection cards
- Preserve the selected class ability preview
```

## Progress
- [x] Implementation complete
- [x] Validation passed
- commit: pending
