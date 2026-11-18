# Current Context

## Active Plan
[Unique Spell and Hero Power Effects (Visual and Sound)](./plans/2026-11-18-spell-and-hero-power-effects.md)

## Active Phase
[P02 Content](./phases/2026-11-18-spell-and-hero-power-effects/P02-content/phase.md)

## Active Task
[P02-T02 Shared Damage Spells](./phases/2026-11-18-spell-and-hero-power-effects/P02-content/T02-shared-damage-spells.md)

## Status
- Decision: [2026-11-18-spell-and-hero-power-effects](./decisions/2026-11-18-spell-and-hero-power-effects.md) confirmed.
- P01 Foundation complete. P02-T01 complete: 12 effects (3 hero powers + 9 class spells) registered; 903 tests pass.
- Content layout: each batch lives in `apps/web/src/game/spellEffects/<batch>.ts` (specs + sound recipes) and `<batch>Glyphs.tsx`; the registries in `spellEffectCatalog.ts`, `soundRecipes.ts`, `spellEffectMotifs.tsx` merge them. Add the new batch ids to BATCHES in `spellEffectContent.test.ts`.
- IMPORTANT: Claude has no browser tool, so gallery (`/?effects-preview`) reviews are for the user; every content task records "gallery review: pending with the user". Only data and render integrity are verified automatically.
- Motif tuples already used (start/travel/burst): see `spellEffects/heroAndClass.ts`; new effects must keep unique glyphs and tuples (tests enforce it).
- Production serves v1.0.4 (these changes are not released).
- User instruction: continue executing tasks in order without asking for confirmation.

## Next Step (IMPORTANT)
Implement P02-T02: 7 shared damage spells (shadow-bolt, soul-lance, fate-shard, reaper-cleave normal; meteor-shard, soul-storm, eclipse large) in new files `sharedDamage.ts` + `sharedDamageGlyphs.tsx`, with unique motif tuples per the task's design table, `focusEffectKind: "damage"` for soul-storm, update the old card-frame assertions for shadow-bolt in `CombatEffectLayer.test.tsx`, extend BATCHES. Run `npm run build` BEFORE `npm test`; commit; advance to P02-T03.
