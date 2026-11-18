# Current Context

## Active Plan
[Unique Spell and Hero Power Effects (Visual and Sound)](./plans/2026-11-18-spell-and-hero-power-effects.md)

## Active Phase
[P01 Foundation](./phases/2026-11-18-spell-and-hero-power-effects/P01-foundation/phase.md)

## Active Task
[P01-T02 Effect Renderer](./phases/2026-11-18-spell-and-hero-power-effects/P01-foundation/T02-effect-renderer.md)

## Status
- Decision: [2026-11-18-spell-and-hero-power-effects](./decisions/2026-11-18-spell-and-hero-power-effects.md) confirmed.
- P01-T01 complete: registry (`apps/web/src/game/spellEffectCatalog.ts`) and event tagging (`visualId`, `visualRole`, `spellEffectKind`) in `combatEffects.ts`; 806 tests pass. No spec registered yet, so gameplay presentation is unchanged.
- Production serves v1.0.4.
- User instruction: continue executing tasks in order without asking for confirmation.

## Next Step (IMPORTANT)
Implement P01-T02: `SpellEffectVisual.tsx`, `spellEffectMotifs.tsx`, `styles/spellEffects.css` (imported in `main.tsx`), integrate into `CombatEffectLayer.tsx` (replace the 930 ms constant with `spec.impactAtMs`, completion at `spec.totalMs`, suppress card flight for tagged events, `resolveSpec` prop), tests; run `npm run build` BEFORE `npm test`, commit, advance to P01-T03.
