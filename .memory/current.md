# Current Context

## Active Plan
[Unique Spell and Hero Power Effects (Visual and Sound)](./plans/2026-11-18-spell-and-hero-power-effects.md)

## Active Phase
[P02 Content](./phases/2026-11-18-spell-and-hero-power-effects/P02-content/phase.md)

## Active Task
[P02-T03 Shared Utility Spells](./phases/2026-11-18-spell-and-hero-power-effects/P02-content/T03-shared-utility-spells.md)

## Status
- Decision: [2026-11-18-spell-and-hero-power-effects](./decisions/2026-11-18-spell-and-hero-power-effects.md) confirmed.
- P01 Foundation complete. P02-T01 (12 effects) and P02-T02 (7 shared damage spells) complete; 909 tests pass. 19 of 35 effects registered.
- Content layout: each batch lives in `apps/web/src/game/spellEffects/<batch>.ts` (specs + sound recipes) and `<batch>Glyphs.tsx`. To register a batch run `node <scratchpad>/batch-patch.mjs <UPPER_NAME> <fileBase> "<label>" '<idsJson>'` (it edits the three registries and BATCHES in `spellEffectContent.test.ts`), or edit those four places by hand.
- IMPORTANT: Claude has no browser tool, so gallery (`/?effects-preview`) reviews are for the user; every content task records "gallery review: pending with the user". Only data and render integrity are verified automatically.
- Already used motif tuples (start/travel/burst) are in `spellEffects/heroAndClass.ts` and `sharedDamage.ts`; unique glyphs and tuples are enforced by tests.
- Production serves v1.0.4 (these changes are not released).
- User instruction: continue executing tasks in order without asking for confirmation.

## Next Step (IMPORTANT)
Implement P02-T03: 8 shared utility spells (healing-mist, life-thread, mana-spring, soul-bargain, raise-bones, rune-surge, dark-insight, stolen-fate), all normal weight, in `sharedUtility.ts` + `sharedUtilityGlyphs.tsx` per the task's design table (soul-bargain `focusEffectKind: "gainTemporaryMana"`; raise-bones `startAt: "target"`); tuples must stay unique. Add tagging tests for soul-bargain. Run `npm run build` BEFORE `npm test`; commit; advance to P02-T04.
