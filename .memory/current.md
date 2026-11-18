# Current Context

## Active Plan
[Unique Spell and Hero Power Effects (Visual and Sound)](./plans/2026-11-18-spell-and-hero-power-effects.md)

## Active Phase
[P01 Foundation](./phases/2026-11-18-spell-and-hero-power-effects/P01-foundation/phase.md)

## Active Task
[P01-T04 Effects Preview Gallery](./phases/2026-11-18-spell-and-hero-power-effects/P01-foundation/T04-effects-preview-gallery.md)

## Status
- Decision: [2026-11-18-spell-and-hero-power-effects](./decisions/2026-11-18-spell-and-hero-power-effects.md) confirmed.
- P01-T01 (registry + tagging), T02 (SVG renderer + layer integration), T03 (sound synthesis + playSpellCue + App wiring) complete; 868 tests pass. No spec or recipe is registered yet, so gameplay is unchanged.
- Production serves v1.0.4.
- User instruction: continue executing tasks in order without asking for confirmation.

## Next Step (IMPORTANT)
Implement P01-T04: dev-only `apps/web/src/dev/EffectsPreview.tsx` (fake board, effect list from REQUIRED_SPELL_VISUAL_IDS, Play/Play all, sound), gate in `main.tsx` with `import.meta.env.DEV` and the `effects-preview` query, tests, and confirm `apps/web/dist` has no preview code. Run `npm run build` BEFORE `npm test`, commit, then start P02-T01.
