# Task: T02 Render Attack and Hit Effects

## Status: done

## Goal
Render an easy-to-read minion lunge with a card-themed weapon trail, then show target-specific damage feedback: blood splatter and board shake for minion hits; a red screen flash and board shake for hero hits.

## Decision Summary
- Apply the lunge and trail to player and enemy minion attacks. Keep a single shared animation and use the existing card visual profile theme (`steel`, `shadow`, `ember`, `bone`, or `rune`) for its color.
- Show blood only when a minion is directly hit. Hero damage uses a red full-screen flash and shake without blood.
- Preserve the current attack pacing, event ordering, pause/resume, and reduced-motion behavior. Boss area effects retain their current area treatment.

## Implementation

### I01. Render the attack and target feedback

- Related Files:
  - `apps/web/src/components/CombatEffectLayer.tsx` :: `EffectSprite`, `CombatEffectLayer`; modify
  - `apps/web/src/styles/board.css` :: combat effect selectors and keyframes around `.combat-effect-layer`, `.combat-effect-sprite`, `.combat-effect-impact`, and reduced-motion rules; modify

#### Details
- **Signatures & Types**:
  ```typescript
  interface EffectSpriteProps {
    event: CombatEffectEvent;
    index: number;
    paused: boolean;
    onComplete(id: number): void;
  }
  ```
- Use the existing `event.source`, `event.target`, `CARD_COMBAT_VISUAL_PROFILES[event.assetCardId]`, and computed `EffectGeometry`; do not change combat resolution or timing.
- For `event.effectKind === "attack"` with a minion source, render one compact attacker portrait that travels from source to target. Avoid simultaneously rendering the current duplicate large card-frame sprite for this attack. Add a weapon-trail element that follows the same source-to-target vector and a bright impact flash at the target. Use the visual profile theme for trail/particle color.
- When `event.damageTarget === "minion"`, render a blood-splatter element centered on `geometry.target`; use CSS gradients/pseudo-elements or equivalent CSS-native shapes, not a new external image asset. Keep it attached to the target impact and make it visible for direct minion damage from attacks and spells.
- When `event.damageTarget === "hero"`, render a brief red viewport flash without blood. Direct hit feedback also shakes `.battle-board`; keep boss area effects on their existing `areaImpact` path.
- Make the feedback elements non-interactive and `aria-hidden`. Apply `paused` to every new animation using the same `animationPlayState` behavior as existing sprites; ensure timers/classes clear after completion and overlapping hit events do not cancel each other's board shake early.
- Respect the existing reduced-motion behavior: shorten or suppress motion and screen shake while keeping a brief static impact signal visible.
- **Execution flow**: derive coordinates and theme from the event; render the attacker lunge/trail; trigger target flash and optional blood at the resolved target; trigger board shake for the duration of direct hit feedback; clear transient effects through the existing event completion/pause lifecycle.

### I02. Add component regression coverage

- Related Files:
  - `apps/web/src/components/CombatEffectLayer.test.tsx` :: `CombatEffectLayer` tests; modify

#### Details
- Verify an attack renders one attacking portrait, a weapon trail, a themed impact, and source-to-target animation coordinates.
- Verify a minion hit renders blood splatter and a hero hit renders the red screen flash without blood.
- Verify player and enemy attack events use the same visual classes and that a themed profile is exposed to the trail.
- Verify a direct hit triggers board shake, two overlapping direct hits leave the shake active until both finish, and cleanup removes temporary classes/elements.
- Verify pausing freezes new feedback animations and resumes them, and reduced-motion mode avoids the board shake while keeping an impact cue.
- Keep existing area impact, boss warning, death, and generic spell-art expectations passing.

## Acceptance Criteria
- [ ] Minion attacks visibly lunge, leave a themed weapon trail, and finish with an impact flash for either side.
- [ ] Direct damage to a minion produces blood splatter and board shake.
- [ ] Direct damage to a hero produces a red screen flash and board shake with no blood.
- [ ] Pausing and reduced-motion handling remain coherent, and simultaneous hits clean up safely.
- [ ] Existing spell, summon, boss-area, and death effects continue to work.

## Validation
- `npm test -- apps/web/src/components/CombatEffectLayer.test.tsx`
- `npm test -- apps/web/src/game/combatEffects.test.ts`
- `npm run build`

## Commit Message
```text
feat(combat): add themed minion attack feedback

Plan: 2026-10-28-minion-attack-effects
Phase: P01-attack-and-hit-feedback
Task: T02-render-attack-hit-effects

- Add a minion lunge, themed weapon trail, and impact flash
- Add blood feedback for minion hits and red flash for hero hits
```

## Progress
- [x] Implementation complete
- [x] Validation passed
- commit: pending
