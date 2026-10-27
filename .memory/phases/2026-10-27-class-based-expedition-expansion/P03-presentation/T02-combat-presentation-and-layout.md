# Task: T02 Combat Presentation and Layout

## Status: done

## Goal
Make every card's combat effect visually distinct, add bloody minion-death and dangerous boss-AOE effects, and use nearly the full viewport width.

## Decision Summary
- Every card uses its existing illustration with distinct color, motion, and particles.
- Minion death cracks/tears with blood-stain emphasis. Board is nearly full-width.

## Implementation

### I01. Add card effects, death, and boss AOE presentation
- Related Files:
  - apps/web/src/game/combatEffects.ts :: CombatEffectEvent, collectCombatEffectEvents, collectEnemyActionEffects.
  - apps/web/src/components/CombatEffectLayer.tsx :: EffectSprite, CombatEffectLayer.
  - apps/web/src/styles/board.css :: effect classes and keyframes.
  - apps/web/public/art/effects/ :: effect assets.
- Details
  - Map every card ID to a stable visual profile (color, particles, motion class, duration), render source card art in the effect sprite/frame.
  - Distinguish attack, damage, heal, buff, summon, mana, draw, cleave, theft, hero powers, and fusion; also give every individual card a unique accent/profile.
  - On minion death use its last board anchor for a brief crack/tear overlay with visible blood-stain particles. Preserve effect lifecycle and pause behavior.
  - For boss-area action show ominous windup/edge pulse, board shake, red impact field, and damage feedback; trigger after card actions only.
  - Keep effects readable at 320px and preserve CombatEffectLayer pause callbacks.

### I02. Widen board and verify responsive layout
- Related Files:
  - apps/web/src/styles/board.css :: .battle-board, .player-controls, responsive media queries.
- Details
  - Set board and controls to width min(calc(100% - 32px), 1800px), centered. At <=600px use 12px horizontal gutter.
  - Use clamp-based padding so hero panels, five minion slots, and hand remain usable at 1280px, 1920px, and mobile widths. Preserve vertical order and prevent horizontal overflow.

### I03. Test visual event mapping
- Related Files:
  - apps/web/src/game/combatEffects.test.ts :: profile and death/AOE cases.
  - apps/web/src/components/CombatEffectLayer.test.tsx :: render, pause, completion.
- Details
  - Assert every CARD_CATALOG ID maps to one visual profile; death/AOE use correct classes and callbacks.

## Acceptance Criteria
- [ ] Every card has a distinct recognizable combat presentation.
- [ ] Minion death visibly cracks/tears with blood-stain emphasis.
- [ ] Boss AOE feels dangerous and resolves after card actions.
- [ ] Board/controls use near-full width without mobile overflow.

## Validation
- npm run test --workspace @board-game/web -- src/game/combatEffects.test.ts src/components/CombatEffectLayer.test.tsx
- npm run build

## Commit Message
feat(web): expand combat effects and board layout

Plan: 2026-10-27-class-based-expedition-expansion
Phase: P03-presentation
Task: T02-combat-presentation-and-layout

- Add card-specific combat and death effects
- Emphasize boss area attacks
- Expand board width

## Progress
- [x] Implementation complete
- [x] Validation passed
- commit: feat(web): expand combat effects and board layout
