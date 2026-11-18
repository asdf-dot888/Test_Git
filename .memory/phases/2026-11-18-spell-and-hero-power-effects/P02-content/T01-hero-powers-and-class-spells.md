# Task: T01 Hero Powers and Class Spells

## Status: done

## Goal
Add the first 12 unique effects (visual + sound): 3 hero powers and 9 class spells.

## Decision Summary
- D02: each has its own visual (unique glyph and motif tuple) and its own sound recipe.
- D05: all `normal` weight: `totalMs` <= 1200, `totalMs - impactAtMs >= 450`, `impactAtMs` 300..700.
- D04: the effect replaces the card flight; hit consequences still play after `impactAtMs`.

## Implementation
### I01. Registry entries and glyphs
- `apps/web/src/game/spellEffectCatalog.ts`: add a spec per id below (ids are card ids or `hero-power-<class>`).
- `apps/web/src/game/spellEffectMotifs.tsx`: add one unique glyph per id to `GLYPHS` (inline SVG, single color via `currentColor`/CSS variables, <= 24 nodes) and any new motif the brief needs.
- `apps/web/src/styles/spellEffects.css`: keyframes for any new motif; transform/opacity only.
### I02. Sound recipes
- `apps/web/src/game/soundRecipes.ts`: one recipe per id (<= 6 layers, total <= totalMs), id equal to the visual id.
### I03. Design briefs (the executor refines numbers, but keeps these identities and keeps tuples unique)
| Id | Source -> target | Visual concept | Palette | Sound character |
| :-- | :-- | :-- | :-- | :-- |
| `hero-power-warrior` (방패 다지기) | hero -> own hero | steel shards converge into a hex shield that locks around the hero; ring ward ripple | steel blue / gold | low metallic clank layered with a rising sine "lock" |
| `hero-power-assassin` (그림자 습격) | hero -> target | dark smoke dash with crossing slash marks at the target | violet / black / red | filtered noise whoosh, short high square ping on cross |
| `hero-power-demonist` (하급 악마 소환) | hero -> summon slot | ember sigil circle at the slot, fire pillar, imp silhouette rises | ember orange / magenta | sub rumble sweep up, crackle noise, detuned saw growl |
| `warrior-brace` (철벽 태세) | hand -> friendly minion | hex plates assemble over the minion | steel / white | two metallic hits, soft low sine thump |
| `warrior-hammerfall` (심판의 망치) | hand -> enemy minion | golden hammer falls from above; ground-crack shockwave | gold / brown | heavy low thud with gliding sine, stone-crack noise burst |
| `warrior-rally` (전장의 함성) | hand -> friendly minion | banner unfurls with horn-ring waves | gold / crimson | brass-like saw chord rising a fifth, short noise swell |
| `assassin-venom-coat` (맹독 칼날) | hand -> friendly minion | green venom drips along a blade, bubbles | toxic green / dark | bubbling filtered noise, sharp sine drip plinks |
| `assassin-shuriken` (그림자 수리검) | hand -> enemy minion | three spinning shurikens arc to the target, notch cuts | dark steel / violet | rapid triangle whirr, three short ticks |
| `assassin-smoke-step` (연막 보법) | hand -> own hero | smoke puff, ghost-step trail; `focusEffectKind: "draw"` | grey / violet | soft breathy noise burst, descending sine whisper |
| `demonist-dark-rite` (어둠의 의식) | hand -> summon slot | blood-red rune circle with candle flames; imp emerges | blood red / black | chant-like detuned sines, low drone, crackle |
| `demonist-hellfire` (지옥불 작렬) | hand -> enemy minion | hellfire column erupts under the target | orange / red | rising saw roar, fire noise body, thud on impact |
| `demonist-soul-bond` (영혼 결속) | hand -> friendly minion | two soul wisps chain together onto the minion | magenta / teal | two glassy triangles beating against each other, shimmer noise |
- Hero power events: `assassin` damage amount stays whatever the existing hit info reports; no gameplay change.

### I04. Tests
- `apps/web/src/game/spellEffectCatalog.test.ts`: all 12 ids exist in `SPELL_VISUAL_SPECS` and `SOUND_RECIPES`, invariants from P01-T01/T03 hold.
- `apps/web/src/game/combatEffects.test.ts`: a cast of `warrior-hammerfall`, a hero power use per class, and an enemy cast path produce primary events with the right visual ids.
- `apps/web/src/components/CombatEffectLayer.test.tsx`: update any assertion that expected a card frame for these ids.
### I05. Manual review (gallery, `npm run dev` then `/?effects-preview`)
- Play each of the 12 effects against enemy hero, enemy minion, and own minion/hero as applicable; confirm: distinct look, no overlap with the next action, hit flash lands on the impact, sound audible but not harsh, mute works. Record a one-line verdict per effect in the Progress log.

## Acceptance Criteria
- [ ] 12 effects registered with unique glyphs, tuples, and sound recipes.
- [ ] Timing caps and hit-tail invariants pass.
- [ ] Manual gallery review recorded.
- [ ] Tests, lint, build pass.

## Validation
- `npm run build` then `npm test -- apps/web/src/game apps/web/src/components`
- `npm test`, `npm run lint`, `npm run build`

## Commit Message
```text
feat(effects): unique hero power and class spell effects

Plan: 2026-11-18-spell-and-hero-power-effects
Phase: P02-content
Task: T01-hero-powers-and-class-spells
```

## Progress
- [x] implementation complete
- [x] validation passed: 903 tests, lint clean, build clean. 12 effects registered via game/spellEffects/heroAndClass.ts (specs + sound recipes) and heroAndClassGlyphs.tsx; new spellEffectContent.test.ts and SpellEffectVisual.registered.test.tsx cover every registered effect.
- [ ] gallery review: pending with the user (Claude has no browser tool; review at `/?effects-preview` after `npm run dev`). Automated checks cover data, limits, uniqueness, and rendering integrity only.
- commit: see Git history
