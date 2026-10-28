# Task: T01 Hero Power Illustrations

## Status: done

## Goal
Replace the Warrior, Assassin, and Demonist text glyphs in their hero-power buttons with distinct generated illustrations that visually communicate each ability, while preserving costs, disabled state, target flow, and the existing detail popover.

## Decision Summary
- Keep the existing compact ability button beside the player hero portrait and replace only its glyph with artwork.
- Use the established dark-fantasy art direction and class presentation: adult male Warrior, adult female Assassin, adult female Demonist.
- Illustrate the action itself: shield defense for Warrior, shadow strike for Assassin, and imp summoning for Demonist.

## Implementation

### I01. Generate and wire class ability illustrations
- Related Files:
  - `apps/web/public/art/hero-powers/warrior.png` :: new square image for Warrior's shield-defense ability.
  - `apps/web/public/art/hero-powers/assassin.png` :: new square image for Assassin's shadow-strike ability.
  - `apps/web/public/art/hero-powers/demonist.png` :: new square image for Demonist's imp-summoning ability.
  - `apps/web/src/components/HeroPowerControl.tsx` :: `HeroPowerControl`; replace `.hero-power-glyph` text with the class-specific decorative image.
  - `apps/web/src/styles/board.css` :: `.hero-power-button`, `.hero-power-glyph`, class-specific button selectors; size and crop the image to the existing circular control.
- Details:
  - Use one 1:1 image per class at the paths above. Generate high-contrast, close-up dark-fantasy action illustrations designed to remain recognizable in a 40px circle: Warrior shield absorbing a blow with a brief defensive glow; Assassin's adult elven woman delivering a fast shadow-blade strike; Demonist's adult woman opening a demonic rift as a small imp emerges. No lettering, UI, borders, or embedded symbols.
  - In `HeroPowerControl`, derive `src` from the already selected `playerClass`: `/art/hero-powers/${playerClass}.png`.
  - Render `<img className="hero-power-illustration" ... alt="" aria-hidden="true" />` inside the existing button; the existing button `aria-label`, cost marks, readiness state, click behavior, and popover remain authoritative.
  - Make the image fill the 40px desktop and 34px mobile circular button using `width:100%`, `height:100%`, `object-fit:cover`, and a circular clip. Keep mana and soul-shard badges above the image using their existing stacking order.

### I02. Verify the three class illustrations and preserve ability behavior
- Related Files:
  - `apps/web/src/components/HeroPowerControl.test.tsx` :: `HeroPowerControl` tests; extend.
- Details:
  - For each class, assert the button contains the matching `/art/hero-powers/{warrior|assassin|demonist}.png` decorative image.
  - Assert clicking still invokes `onActivate`, the Warrior/Assassin mana cost remains 2, the Demonist shard cost remains 3, the current shard counter remains visible, and insufficient resources still disable the button.

## Acceptance Criteria
- [x] Each class ability button shows its own ability-matched illustration instead of a text glyph.
- [x] Ability art uses the established class genders and dark-fantasy style and remains legible at the existing compact button size.
- [x] Costs, ability descriptions, disabled state, target selection, and activation behavior remain unchanged.

## Validation
- `npm.cmd run test --workspace @board-game/web -- src/components/HeroPowerControl.test.tsx` — all class-art and existing ability-control tests pass.
- `npm.cmd run build --workspace @board-game/web` — production build passes.

## Commit Message
```text
feat(web): add class-specific hero power art

Plan: 2026-10-28-hero-power-and-hand-card-presentation
Phase: P01-ability-and-hand-ui
Task: T01-hero-power-illustrations

- Replace ability glyphs with three dark-fantasy action illustrations
- Preserve the existing costs and ability interaction behavior
```

## Progress
- [x] Implementation complete
- [x] Validation passed
- commit: pending
