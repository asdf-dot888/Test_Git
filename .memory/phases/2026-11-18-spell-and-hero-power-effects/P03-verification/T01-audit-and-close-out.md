# Task: T01 Audit and Close-out

## Status: todo

## Goal
Prove coverage and limits for all 35 effects, review the whole set once more in the gallery, update documentation, run all quality gates, and close the plan.

## Decision Summary
- D02: every hero power and spell card has a unique effect and sound. D05: normal <= 1200 ms, large <= 2000 ms. D06: no new audio files or dependencies. D08: nothing else changes.

## Implementation
### I01. Completeness audit (tests)
- `apps/web/src/game/spellEffectCatalog.test.ts`: assert that every id in `REQUIRED_SPELL_VISUAL_IDS` (35) has a spec and a sound recipe; no extra ids; unique glyphs, tuples, and recipe fingerprints across all 35; weights: large exactly for eclipse, soul-storm, meteor-shard and the 8 boss spells; timing and hit-tail invariants; total uniqueness of `palette.primary` is NOT required.
- `apps/web/src/game/combatEffects.test.ts`: for every player-castable spell card, simulate a cast and assert exactly one primary event; for every boss spell record, assert one primary event per record.
### I02. Review
- Gallery pass over all 35 on both cast sides and with slow motion; confirm no effect hides the hit result, no flicker when two effects overlap (play-all), and sound levels are comparable. Record findings and any fixes in the Progress log (fix small issues in this task; larger ones become follow-up decisions).
- Real battle smoke check with the `run` skill (or `npm run dev` with a signed-in account if available): cast one spell and one hero power per class and confirm the effect plays in the real battle screen and the enemy turn still advances.
### I03. Documentation
- `apps/web/public/audio/ASSETS.md`: add a short section stating the spell sound layer is synthesized at runtime with Web Audio (no new files, no external sources).
- `README.md`: one short paragraph in the development section about the `/?effects-preview` gallery (dev only) and where the effect registry lives (`apps/web/src/game/spellEffectCatalog.ts`, `soundRecipes.ts`).
- Check the in-game guide text (`GameGuideModal`) for statements about spell visuals; update only if wrong.
### I04. Quality gates and close-out
- `npm run build`, `npm test`, `npm run lint`; confirm `apps/web/dist` has no `effects-preview` / `EffectsPreview`.
- Mark this task, P03, and the plan `done`; set `.memory/current.md` to "No active task". Do not deploy; releasing is a separate request.

## Acceptance Criteria
- [ ] All 35 ids covered with unique glyphs, tuples, and sound recipes; caps enforced by tests.
- [ ] Gallery and real-battle checks recorded.
- [ ] Docs updated; tests, lint, build pass; preview absent from production bundle.

## Validation
- `npm run build`
- `npm test`
- `npm run lint`
- `grep -r "effects-preview" apps/web/dist` finds nothing

## Commit Message
```text
docs(effects): record spell and hero power effect verification

Plan: 2026-11-18-spell-and-hero-power-effects
Phase: P03-verification
Task: T01-audit-and-close-out
```

## Progress
- [ ] implementation complete
- [ ] validation passed
- commit: pending
