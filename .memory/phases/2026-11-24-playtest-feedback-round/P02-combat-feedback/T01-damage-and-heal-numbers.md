# Task: T01 Floating Damage and Heal Numbers

## Status: todo

## Goal
Every time a hero or minion takes damage a red `-N` floats up from it; every heal shows a green `+N`. Boss area damage shows one number per affected target. Damage absorbed by hero armor shows a shield mark. Hit effects (impact, shake, blood splatter) already exist and do not change.

## Decision Summary
D03 (option A: all sources, damage red, heal green, per-target numbers for area damage, armor mark; no extra marker on the attacker).

## Implementation
### I01. Event data (`apps/web/src/game/combatEffects.ts`)
- Audit every `pushEvent` call and every place events are built (player actions: `attack`, `all-attack`, `play-card` spells, `use-hero-power`, `end-turn` burn and impact; enemy turn: `collectEnemyTurnEvents` for minion attacks, retaliation, spells, boss area). Write a table of sources in the task Progress notes. Each source that damages must end up with `event.damage` (amount, armorBlocked, outcome, retaliation) or `event.affectedTargets`; add the missing ones (for example spell damage that today has no `damage` info, minion burn ticks if they have an event, enemy hero burn).
- Heal: add `healAmount?: number` to `CombatEffectEvent` (the healed target is `event.target`). Fill it where `effect.kind === "heal"` is turned into an event (player side near line 243 and enemy side near line 217) from the before and after battle states (`min(effect amount, missing health)` is not required; show the effect amount actually applied: health after minus health before, clamped at 0). If a spell effect heals several targets (check the `SpellEffect` kinds in `packages/game-core/src/types.ts`), add `affectedHeals?: Array<{ target: CombatAnchor; amount: number }>` instead of overloading `affectedTargets`.
- New pure function `combatFloatNumbers(event: CombatEffectEvent): CombatFloatNumber[]` where `interface CombatFloatNumber { key: string; anchor: CombatAnchor; text: string; tone: "damage" | "heal" | "armor"; }`:
  - `affectedTargets` present: one `damage` number per target with `damage.amount > 0` (text `-${amount}`); for a hero target with `armorBlocked > 0` also an `armor` number (text `⬟ -${armorBlocked}`).
  - otherwise `event.damage`: `amount > 0` -> one `damage` number at `event.target` (retaliation events already target the attacker's anchor); `armorBlocked > 0` -> an extra `armor` number at the same anchor; `outcome === "miss"` with no armor -> no number.
  - `healAmount > 0` (or `affectedHeals`) -> `heal` numbers (text `+${amount}`).
  - `key` is stable (`${event.id}-${index}`).
  - The amount is the engine's amount after armor, before clamping to remaining health (the existing `CombatDamageInfo` meaning); do not change it.
### I02. Rendering (`apps/web/src/components/CombatEffectLayer.tsx`, `apps/web/src/styles/board.css` or the layer's stylesheet)
- For each event render its float numbers with the same anchor position helper that positions `combat-effect-impact` (reuse the existing `targetStyle`/anchor lookup for `data-effect-anchor`), delayed by the same `hitDelayMs` plus the event delay (so the number appears when the hit lands), as `<span className={`combat-float-number is-${tone}`} aria-hidden="true">{text}</span>`.
- CSS: font 800, size `clamp(18px, 2.4vw, 30px)` (smaller on mobile), `damage` `#ff5c67`, `heal` `#5fe08a`, `armor` `#9fb4d6`; thick dark text-shadow/outline for readability; animation `combat-float-rise` 900 ms (rise about 28px, fade out at the end); several numbers on one anchor are offset horizontally by their index so they do not overlap; `pointer-events: none`. `prefers-reduced-motion`: no rise, fade only.
- Respect the layer's `paused` and `onComplete` behavior: an event is complete only after its numbers have finished (extend the existing duration calculation if needed), and numbers must not extend the minimum time between sequential events.
- The effects preview (`dev/previewEvents.ts` and `EffectsPreview.tsx`) already has a damage input; make it produce `damage.amount` so the numbers can be previewed there.

## Acceptance Criteria
- [ ] `combatFloatNumbers` returns the expected numbers for: a minion attack on a minion (target `-N`) and the retaliation (`-N` on the attacker), an attack on the enemy hero, an all-attack (one number per attacker), each spell damage effect kind, the assassin hero power (`-2`), enemy attacks and spells, burn damage on the player hero, boss area damage (one per player minion and the hero), a heal on a minion and on a hero, damage fully blocked by armor (armor number only), a miss (nothing).
- [ ] `CombatEffectLayer` renders the numbers at the right anchors with the right tones and removes them when the event completes.
- [ ] No source of damage listed in the audit table is left without a number.
- [ ] Existing combat effect tests (including hit delay tests) still pass. Build, lint and tests pass.

## Validation
- `npm run build`
- `npm test -- apps/web/src/game/combatEffects.test.ts apps/web/src/components/CombatEffectLayer.test.tsx apps/web/src/components/CombatEffectLayer.hitDelay.test.tsx apps/web/src/dev/previewEvents.test.ts apps/web/src/dev/EffectsPreview.test.tsx`
- `npm test`, `npm run lint`
- Manual (user): `npm run dev`, play a battle and check each source; the checklist is added in P05-T01.

## Commit Message
```text
feat(web): show floating damage and heal numbers on every hit

Plan: 2026-11-24-playtest-feedback-round
Phase: P02-combat-feedback
Task: T01-damage-and-heal-numbers
```

## Progress
- [ ] implementation complete (include the audit table of damage and heal sources)
- [ ] validation passed
- commit: pending
