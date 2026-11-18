# Task: T04 Boss Spells

## Status: todo

## Goal
Add unique effects for the 8 boss-only spells, themed by phase (cursed forest, demon abyss, ancient dragon).

## Decision Summary
- D02: boss spells included. D05: all `large` weight (<= 2000 ms).
- The existing boss area attack presentation (warning, cast, impact) is a different event type and is not changed.
- Boss spells are cast by the enemy; sources are the enemy hand/hero and targets the player's side. The same ids never appear on the player's side (`enemyOnly`).

## Implementation
### I01. Registry entries, glyphs, motifs
- Same files as P02-T01; large weights, `impactAtMs` 600..1100, `totalMs` <= 2000, hit tail >= 450 ms.
### I02. Sound recipes
- `soundRecipes.ts`: one per id; boss spells may use up to 6 layers and heavier low-frequency content, still within gain limits.
### I03. Design briefs
| Id | Spell | Visual concept | Palette | Sound character |
| :-- | :-- | :-- | :-- | :-- |
| `matron-thorn-prison` | 3 mana, root the strongest minion | thorny vines erupt and cage the target | green / dark brown | wooden creak squares, rustling noise, snap |
| `matron-wither-curse` | 4 mana, all player minions -2 attack | withering black-green mist sweeps across the player's board, leaves wilt (`areaImpact`-style wide layout) | black-green / ash | descending detuned saws, dry rustle noise |
| `grave-king-soul-tithe` | 1 mana, discard + temp mana + summon a demon (`focusEffectKind: "summon"`) | soul coins flare, a demon claw tears out of the ground | red / gold / black | coin ticks then a low growl sweep |
| `grave-king-pit-gate` | 6 mana, summon 2 demons | a huge hell gate opens at the summon slots, twin flames | deep red / orange | long sub rumble, rising choir-like detuned sines, burst |
| `grave-king-harvest` | 5 mana, 5 damage to the strongest minion/hero and heal 5 (`focusEffectKind: "soulHarvest"`) | a scythe slash; a stream of souls flows from the target to the enemy hero | purple-green / white | draining downward sweep then an upward heal shimmer |
| `void-titan-burning-mark` | 3 mana, burn the player hero 2 per turn for 2 turns | a dragon claw mark brands the hero with embers | orange / ember | crackle noise, short roar saw |
| `void-titan-inferno` | 6 mana, 4 damage to all player minions | a fire breath sweeps across the player's board (wide layout) | orange / white-hot | broad noise roar swelling then fading, low rumble |
| `void-titan-flame-legion` | 7 mana, summon 2 flame whelps | a dragon sigil ignites; two fire-egg cracks reveal whelps | gold / orange | rising horn-like saw, two crack ticks, flame whoosh |
- Wide effects (wither-curse, inferno) anchor on the center of the player's board using the existing board anchors (`minion:player:*` or the board center fallback).

### I04. Tests
- Presence for 8 ids; all `large`; `focusEffectKind` for soul-tithe (`summon`) and harvest (`soulHarvest`); enemy-cast tagging for each boss record path (including multi-effect records) with one primary per record.
- `useEnemyTurnPlayback` tests (if affected by shorter or longer completion) still pass; the enemy turn does not stall.
### I05. Manual review (gallery, enemy cast side)
- Play all 8 with side = enemy cast; confirm they read as bigger than normal spells but stay <= 2 s; record a verdict per effect.

## Acceptance Criteria
- [ ] 8 boss effects registered; all large and within the 2000 ms cap.
- [ ] Enemy-turn playback tests pass.
- [ ] Manual review recorded; tests, lint, build pass.

## Validation
- `npm run build` then `npm test -- apps/web/src/game apps/web/src/components`
- `npm test`, `npm run lint`, `npm run build`

## Commit Message
```text
feat(effects): unique boss spell effects

Plan: 2026-11-18-spell-and-hero-power-effects
Phase: P02-content
Task: T04-boss-spells
```

## Progress
- [ ] implementation complete
- [ ] validation passed
- [ ] gallery review: (one line per effect)
- commit: pending
