# Current Context

## Active Plan
[Unique Spell and Hero Power Effects (Visual and Sound)](./plans/2026-11-18-spell-and-hero-power-effects.md)

## Active Phase
[P02 Content](./phases/2026-11-18-spell-and-hero-power-effects/P02-content/phase.md)

## Active Task
[P02-T04 Boss Spells](./phases/2026-11-18-spell-and-hero-power-effects/P02-content/T04-boss-spells.md)

## Status
- Decision: [2026-11-18-spell-and-hero-power-effects](./decisions/2026-11-18-spell-and-hero-power-effects.md) confirmed.
- P01 Foundation complete. P02-T01 (12), T02 (7), T03 (8) complete: 27 of 35 effects registered; 940 tests pass.
- Content layout: each batch lives in `apps/web/src/game/spellEffects/<batch>.ts` (specs + sound recipes) and `<batch>Glyphs.tsx`. Register with `node <scratchpad>/batch-patch.mjs <UPPER_NAME> <fileBase> "<label>" '<idsJson>'` (line-based; edits the three registries and BATCHES in `spellEffectContent.test.ts`).
- IMPORTANT: Claude has no browser tool, so gallery (`/?effects-preview`) reviews are for the user; every content task records "gallery review: pending with the user". Only data and render integrity are verified automatically.
- Production serves v1.0.4 (these changes are not released).
- User instruction: continue executing tasks in order without asking for confirmation.

## Next Step (IMPORTANT)
Implement P02-T04: 8 boss-only spells (matron-thorn-prison, matron-wither-curse, grave-king-soul-tithe, grave-king-pit-gate, grave-king-harvest, void-titan-burning-mark, void-titan-inferno, void-titan-flame-legion), ALL `large` (<= 2000 ms, impactAtMs 600..1100), in `bossSpells.ts` + `bossSpellsGlyphs.tsx`, focusEffectKind: soul-tithe "summon", harvest "soulHarvest"; tuples stay unique. Tag tests for enemy cast records (multi-effect), then check that useEnemyTurnPlayback tests still pass. Run `npm run build` BEFORE `npm test`; commit; advance to P03-T01.
