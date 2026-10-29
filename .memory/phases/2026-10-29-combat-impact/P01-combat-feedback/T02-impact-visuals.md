# Task: T02 Damage-Tier and Target-Specific Visuals

## Status: in_progress

## Goal
Make light, medium, and heavy hits visually distinct and render separate feedback for minion hits, hero hits, minion retaliation, armor blocks, misses, and lethal hits. Apply the confirmed effects on desktop and mobile, even when reduced motion is enabled.

## Decision Summary
- Tier mapping comes from `CombatEffectEvent.damage.amount`: 1–2 light, 3–4 medium, 5+ heavy. Amount is after armor and before health clamping.
- Heavy impacts must look dramatically stronger than light impacts. Scale impact size, flash, and shake; retain target-specific treatment.
- Minion retaliation is visually fixed at light. Minion victims get localized blood/impact; hero victims get red flash and scaled shake. A direct minion-to-hero attack gets a distinct short red slash around the hero portrait.
- A zero random result shows the cast and then small magical fragments dispersing near the target, with no hit flash/shake. Full armor absorption shows a small metallic spark at the hero.
- Boss area damage keeps one warning/cast/board-impact sequence for the event; use per-target results only for localized armor-block sparks, not repeated full-board flashes or ordinary hit tiers.
- Full effects play regardless of `prefers-reduced-motion`.

## Implementation

### I01. Render tiered impact and special outcomes
- Related Files:
  - `apps/web/src/game/combatEffects.ts` :: pure tier helper or event-derived visual selectors; modify
  - `apps/web/src/components/CombatEffectLayer.tsx` :: `EffectSprite`, `CombatEffectLayer`, and local visual subcomponents; modify
  - `apps/web/src/styles/board.css` :: `.combat-effect-*`, `.battle-board.is-hit-shaking`, and keyframes; modify
  - `apps/web/src/components/CombatEffectLayer.test.tsx` :: render/timing cases for intensity and special outcomes; modify

#### Details
- **Signatures & Types**:
  ```typescript
  export function combatImpactTier(amount: number): "light" | "medium" | "heavy" | null;
  // null means amount is zero or negative; `damage.outcome` distinguishes miss and armor-block.
  ```
- **Data & Schema Fields**:
  - Read T01 fields `event.damage.amount`, `event.damage.outcome`, `event.damage.retaliation`, `event.damage.armorBlocked`, `event.affectedTargets`, `event.bossArea`, `event.source`, and `event.target`.
  - Use deterministic CSS modifiers `impact-tier-light`, `impact-tier-medium`, `impact-tier-heavy`, `is-retaliation`, `is-direct-hero-melee`, `is-miss`, and `is-armor-block` as needed. Do not derive tiers for non-damage events.
- **Execution Flow / Logic**:
  1. Implement/export a pure tier helper and map 1–2/3–4/5+ to light/medium/heavy; zero returns null.
  2. Normal minion hits keep the current travel/impact sequence and render scaled impact and blood splatter at the target minion anchor. Light remains compact, medium is clearly larger, and heavy is dramatically larger with stronger sparks/glow. Preserve existing target geometry and effect completion order.
  3. Hero hits scale the red hit flash and board shake by tier. For `source.kind === "minion"`, `target.kind === "hero"`, and `!event.bossArea`, render a short red slash/impact localized at the target hero portrait. Boss area attacks never use this direct-melee slash.
  4. On `damage.retaliation`, override the impact visual to light regardless of amount; prevent the return strike from stacking another heavy impact.
  5. On `damage.outcome === "miss"`, preserve the spell travel/cast animation, then render small arcane fragments dispersing at the target. Suppress target blood, red hit flash, and shake. On `armor-block`, suppress health-hit visuals and render a small metallic spark at the hero portrait.
  6. For lethal events, retain current death visual anchors. Death audio is handled separately by T03; do not replace the death effect with a larger blood splatter.
  7. For boss-area events, play the board-level warning/cast/impact once. If an affected target is fully protected by armor, show only that target's small metallic block spark alongside the global impact; do not duplicate the global flash or shake per target.
  8. Ensure enhanced combat effects are not shortened or disabled by `prefers-reduced-motion: reduce`; preserve reduced-motion handling for unrelated UI animations.
  9. Add responsive sizing/positioning so mobile impact visuals remain in the viewport and do not cover board controls.
- **Error & Cleanup**: Keep overlay elements `aria-hidden` and `pointer-events: none`; retain existing timer cleanup and board-shake owner cleanup on unmount.

### I02. Verify visible behavior
- Related Files:
  - `apps/web/src/components/CombatEffectLayer.test.tsx` :: target anchors and tier/special classes; modify
  - `apps/web/src/game/combatEffects.test.ts` :: tier boundary behavior; modify
#### Details
- Assert amounts 0/1/2/3/4/5 map to null/light/light/medium/medium/heavy.
- Assert retaliation stays light even when its amount is 5 or higher.
- Assert miss and armor-block render distinct effects and neither renders health-hit flash/blood.
- Assert direct minion-to-hero hits use portrait slash and boss-area uses the board-level sequence path.
- Assert class assignment does not depend on `prefers-reduced-motion`.

## Acceptance Criteria
- [ ] Tier differences are obvious in impact size, flash, and shake; heavy is dramatically stronger than light.
- [ ] Minion, hero, retaliation, armor-block, miss, and death outcomes are visually distinguishable.
- [ ] Direct minion-to-hero feedback differs from boss area damage.
- [ ] Enhanced effects play when reduced motion is enabled.
- [ ] Desktop and mobile layouts keep board controls usable.

## Validation
- `npm.cmd test -- apps/web/src/components/CombatEffectLayer.test.tsx apps/web/src/game/combatEffects.test.ts` — run after implementation.
- `npm.cmd run lint --workspace @board-game/web` — run after implementation.

## Commit Message
```text
feat(web): scale combat impact visuals by damage

Plan: 2026-10-29-combat-impact
Phase: P01-combat-feedback
Task: T02-impact-visuals

- Add light, medium, and heavy hit visuals with distinct target feedback
- Show separate miss, armor-block, and minion-to-hero effects
```

## Progress
- [ ] Implementation complete
- [ ] Validation passed
- commit: pending

