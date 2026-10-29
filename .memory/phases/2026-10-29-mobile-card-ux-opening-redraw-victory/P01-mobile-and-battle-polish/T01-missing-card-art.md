# Task: T01 Missing Card Artwork

## Status: done

## Goal
Remove broken image icons from every catalog card by adding four missing illustrations and making asset coverage verifiable.

## Decision Summary
- Add `fate-shard`, `reaper-cleave`, `soul-bargain`, and `stolen-fate` art in the established dark-fantasy style, matching each composition to its effect.
- Preserve catalog art keys and the existing `/art/cards/{artKey}.png` URL contract.

## Implementation

### I01. Generate missing illustrations
- Related Files:
  - `apps/web/public/art/cards/fate-shard.png` :: random-damage spell art; new.
  - `apps/web/public/art/cards/reaper-cleave.png` :: cleave spell art; new.
  - `apps/web/public/art/cards/soul-bargain.png` :: discard-for-temporary-mana spell art; new.
  - `apps/web/public/art/cards/stolen-fate.png` :: steal-from-opponent-deck spell art; new.

#### Details
- `fate-shard`: unstable falling arcane shard impacting a dark battlefield, suggesting variable damage.
- `reaper-cleave`: grim reaper's oversized curved blade sweeping through adjacent foes, suggesting one central strike hitting both sides.
- `soul-bargain`: a human offers a cold blue-white soul fragment into a gigantic demon hand framed by red fire, matching the agreed soul-trade concept.
- `stolen-fate`: a shadowy hand pulls a glowing card or fate sigil from an enemy deck, clearly communicating theft.
- Match neighboring card files' painterly detail, palette, contrast, crop, aspect ratio, and PNG format. Depict adult characters only. Do not include typography or UI.

### I02. Guard catalog asset coverage
- Related Files:
  - `apps/web/src/components/ExpeditionRoadmap.test.tsx` :: existing public-art existence test; modify.

#### Details
- Extend its card assertion to verify `existsSync(resolve(cardArtDirectory, `${card.artKey}.png`))` for every `CARD_CATALOG` entry; the catalog currently uses a PNG path for token cards as well.
- Preserve the existing enemy-art and class-card checks.

## Acceptance Criteria
- [ ] All four image paths exist and match the game's dark-fantasy art direction.
- [ ] Every catalog art key resolves to an existing PNG.
- [ ] Existing card renderers keep their current URL contract.

## Validation
- `npm test -- apps/web/src/components/ExpeditionRoadmap.test.tsx` — all card and enemy asset assertions pass.
- `npm run build --workspace @board-game/web` — production web bundle builds.

## Commit Message
```text
feat(art): add missing spell illustrations

Plan: 2026-10-29-mobile-card-ux-opening-redraw-victory
Phase: P01-mobile-and-battle-polish
Task: T01-missing-card-art

- Add four dark-fantasy card illustrations for missing art keys
- Assert that every card art key resolves to a public PNG
```

## Progress
- [x] Implementation complete
- [x] Validation passed
- commit: included in the T01 commit
