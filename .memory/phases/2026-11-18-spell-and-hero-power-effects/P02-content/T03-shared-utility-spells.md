# Task: T03 Shared Utility Spells

## Status: todo

## Goal
Add unique effects for the 8 shared non-damage spells (heal, buff, summon, draw, mana, theft, discard/temporary mana).

## Decision Summary
- D02/D05: unique visual + sound each, all `normal` weight (<= 1200 ms).
- Multi-effect spell `soul-bargain` (discard + temporary mana): one visual, the follow-up event plays only existing consequences.

## Implementation
### I01. Registry entries, glyphs, motifs
- Same files as P02-T01.
### I02. Sound recipes
- `soundRecipes.ts`: one per id.
### I03. Design briefs
| Id | Spell | Source -> target | Visual concept | Palette | Sound character |
| :-- | :-- | :-- | :-- | :-- | :-- |
| `healing-mist` | 2 mana, heal hero 4 | hand -> own hero | soft green mist rises with sparkles | green / white | breathy filtered noise swell, gentle rising sine pair |
| `life-thread` | 4 mana, heal minion 5 | hand -> friendly minion | golden thread weaves and stitches around the minion | gold / warm white | plucked triangle notes in a short scale |
| `mana-spring` | 0 mana, +1 mana | hand -> own hero (mana) | blue spring ripple with droplets into the mana crystals | blue / cyan | water-drop sine plinks, soft sweep |
| `soul-bargain` | 1 mana, discard + 3 temporary mana | hand -> hand | a card burns to embers while soul sparks turn into coins (`focusEffectKind: "gainTemporaryMana"`) | ember / gold | paper-burn crackle noise, coin-like high triangles |
| `raise-bones` | 3 mana, summon 2 bone rats | hand -> summon slot | bone hands push from the ground, dust ring | ivory / brown | dry knock squares, low earth sweep |
| `rune-surge` | 2 mana, +2/+1 to a minion | hand -> friendly minion | glowing rune circle brands onto the minion | orange-gold | resonant sine with fast tremolo, bright tick |
| `dark-insight` | 3 mana, draw 2 | hand -> hand | a purple eye opens and two cards fan out | purple / pale blue | eerie detuned sines swelling, two soft card whooshes |
| `stolen-fate` | 3 mana, steal a card from the enemy deck | enemy deck -> hand | a ghost hand pulls a glowing card along a magenta thread | magenta / white | whispering noise sweep, light pluck on catch |
- `healing-mist` and `life-thread` keep the existing heal cue as the base sample layer; summon spells keep the summon cue.

### I04. Tests
- Presence for 8 ids; `soul-bargain` tagging with `focusEffectKind`; weights all `normal`.
- `CombatEffectLayer.test.tsx`: adjust any assertion that expected the card frame for these spells.
### I05. Manual review (gallery)
- Play all 8 on the sensible targets; check the multi-effect case (`soul-bargain`) shows one visual only; record a verdict per effect.

## Acceptance Criteria
- [ ] 8 effects registered with unique glyphs, tuples, recipes.
- [ ] Manual review recorded; tests, lint, build pass.

## Validation
- `npm run build` then `npm test -- apps/web/src/game apps/web/src/components`
- `npm test`, `npm run lint`, `npm run build`

## Commit Message
```text
feat(effects): unique effects for shared utility spells

Plan: 2026-11-18-spell-and-hero-power-effects
Phase: P02-content
Task: T03-shared-utility-spells
```

## Progress
- [ ] implementation complete
- [ ] validation passed
- [ ] gallery review: (one line per effect)
- commit: pending
