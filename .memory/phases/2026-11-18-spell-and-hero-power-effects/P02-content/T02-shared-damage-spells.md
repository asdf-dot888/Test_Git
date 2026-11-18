# Task: T02 Shared Damage Spells

## Status: todo

## Goal
Add unique effects for the 7 shared damage spells.

## Decision Summary
- D02/D05: unique visual + sound each; `meteor-shard`, `soul-storm`, `eclipse` are `large` (<= 2000 ms), the other four are `normal` (<= 1200 ms).
- The enemy uses the same effects when it casts these spells.

## Implementation
### I01. Registry entries, glyphs, motifs
- Same files as P02-T01 (`spellEffectCatalog.ts`, `spellEffectMotifs.tsx`, `spellEffects.css`).
### I02. Sound recipes
- `soundRecipes.ts`: one per id, unique fingerprints, within limits.
### I03. Design briefs
| Id | Spell | Visual concept | Palette | Weight | Sound character |
| :-- | :-- | :-- | :-- | :-- | :-- |
| `shadow-bolt` | 1 mana, 2 to enemy hero | violet bolt streak with trailing wisps, shadow burst | violet / black | normal | fast descending saw zip, soft noise pop |
| `soul-lance` | 2 mana, 3 to a minion | spectral cyan lance thrusts, pierce line through target | cyan / white | normal | glassy rising triangle, sharp pierce tick |
| `fate-shard` | 2 mana, random 0-5 | tumbling prismatic shard splits into fragments; on a 0-damage miss the fragments scatter beside the target | prismatic | normal | randomly arpeggiated high sines, shatter noise |
| `reaper-cleave` | 4 mana, cleave 4 | crimson scythe sweeps an arc across the target and its neighbors (`effectKind: "cleave"` multi-target) | crimson / bone | normal | low sweeping saw, wide noise whoosh |
| `meteor-shard` | 5 mana, 5 to a minion | meteor falls from the sky with a fire trail, crater shock | orange / white | large | rising rumble, long falling sine, heavy noise impact tail |
| `soul-storm` | 6 mana, 4 to hero + draw 1 (`focusEffectKind: "damage"`) | spiraling storm of souls with lightning arcs; follow-up draw glows the hand | pale green / white / violet | large | layered howl noise, crackling squares, whoosh swell |
| `eclipse` | 8 mana, 8 to hero | black sun disc covers the target, corona flare, beam | black / gold / white | large | deep sub swell, bright corona sine sweep, long decay |
- The damage tier flash/shake and sounds for the resulting hit are unchanged (D09 of the combat impact decision still applies).

### I04. Tests
- Catalog/recipe presence for 7 ids; `large` weight for meteor-shard/soul-storm/eclipse; `focusEffectKind: "damage"` for soul-storm and the multi-effect tagging test (one primary, one follow-up).
- `CombatEffectLayer.test.tsx`: replace the `shadow-bolt` card-frame assertions (lines near 40 and 145) with spec-driven assertions (visual present, no card frame, hit delay equals `impactAtMs`).
- Cleave: the primary event keeps `affectedTargets` so neighbor hits still show.
### I05. Manual review (gallery)
- Play all 7; for fate-shard also review the miss case (damage 0); confirm cleave covers neighbors; verify the large ones stay <= 2 s; record a verdict per effect.

## Acceptance Criteria
- [ ] 7 effects registered with unique glyphs, tuples, recipes; large/normal weights correct.
- [ ] Old card-frame assertions for these spells replaced.
- [ ] Manual review recorded; tests, lint, build pass.

## Validation
- `npm run build` then `npm test -- apps/web/src/game apps/web/src/components`
- `npm test`, `npm run lint`, `npm run build`

## Commit Message
```text
feat(effects): unique effects for shared damage spells

Plan: 2026-11-18-spell-and-hero-power-effects
Phase: P02-content
Task: T02-shared-damage-spells
```

## Progress
- [ ] implementation complete
- [ ] validation passed
- [ ] gallery review: (one line per effect)
- commit: pending
