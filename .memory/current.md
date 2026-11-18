# Current Context

## Active Plan
[Unique Spell and Hero Power Effects (Visual and Sound)](./plans/2026-11-18-spell-and-hero-power-effects.md)

## Active Phase
[P02 Content](./phases/2026-11-18-spell-and-hero-power-effects/P02-content/phase.md)

## Active Task
[P02-T01 Hero Powers and Class Spells](./phases/2026-11-18-spell-and-hero-power-effects/P02-content/T01-hero-powers-and-class-spells.md)

## Status
- Decision: [2026-11-18-spell-and-hero-power-effects](./decisions/2026-11-18-spell-and-hero-power-effects.md) confirmed.
- P01 Foundation complete: registry + tagging, SVG renderer + layer integration, sound synthesis, dev-only gallery (`npm run dev` then `/?effects-preview`); 884 tests pass. No effect is registered yet, so gameplay presentation is unchanged.
- Content tasks now add specs (`spellEffectCatalog.ts`), glyphs and motifs (`spellEffectMotifs.tsx`, `spellEffects.css`) and recipes (`soundRecipes.ts`).
- Production serves v1.0.4 (these changes are not released).
- User instruction: continue executing tasks in order without asking for confirmation.

## Next Step (IMPORTANT)
Implement P02-T01: the 12 effects (3 hero powers + 9 class spells) per the design briefs: spec + glyph + sound recipe each, unique motif tuples, `normal` weight (<= 1200 ms, tail >= 450 ms), tests (presence, tagging, layer assertions), and a gallery review note. Run `npm run build` BEFORE `npm test`; commit; advance to P02-T02.
