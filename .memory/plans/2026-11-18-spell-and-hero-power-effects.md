# Plan: Unique Spell and Hero Power Effects (Visual and Sound)

- Date: 2026-11-18
- Decisions: [2026-11-18-spell-and-hero-power-effects](../decisions/2026-11-18-spell-and-hero-power-effects.md)
- Status: planned (no code written yet)

## Goal
Give each of the 35 effects below its own procedural CSS/SVG visual and its own synthesized sound layer, replacing the card-art flight for spells and hero powers: 3 hero powers, 24 player spells (15 shared + 9 class), 8 boss-only spells.

## Current state (verified in code)
- `apps/web/src/game/combatEffects.ts`: `collectCombatEffectEvents` (player actions) and `collectEnemyTurnEvents` (enemy records) build one `CombatEffectEvent` per spell effect (`effectKind`, `assetCardId`, `soundCues`, `source`, `target`, `damage`, ...). Hero powers are `effectKind: "hero-power"` with `assetCardId` null (warrior, assassin) or the summoned minion (demonist). A multi-effect spell (soul-storm, soul-bargain, grave-king-soul-tithe) yields several events.
- `apps/web/src/components/CombatEffectLayer.tsx`: draws a flying card-art frame (`.combat-effect-card-frame`) from the hand to the target for 930 ms, then a generic impact box and hit consequences (blood splatter, hero flash, deaths, armor spark, miss fragments), all delayed by the constant 930 ms; the event completes after `max(1400, 1010 + profile.durationMs)` (about 2 s).
- `apps/web/src/game/audio.ts`: `AudioController.playEffect(kind)` plays CC0 samples; Web Audio oscillators already exist for the turn-start and hover cues. `App.tsx` plays `combatEventSounds(event)` for each new event.
- No effect depends on `prefers-reduced-motion` and none should (decision D07).

## Design
- **Registry** (`apps/web/src/game/spellEffectCatalog.ts`, new): `SpellVisualSpec` per effect id (card id, or `hero-power-warrior|assassin|demonist`) with weight (`normal` <= 1200 ms, `large` <= 2000 ms), `impactAtMs`, `totalMs`, palette, motif tuple (`start`, `travel`, `burst`), a unique `glyph`, and the effect kind that anchors the visual for multi-effect spells (`focusEffectKind`).
- **Events**: add optional `visualId`, `visualRole` (`primary` | `follow-up`), and `spellEffectKind` to `CombatEffectEvent`. The primary event of a cast plays the whole visual; follow-up events keep only the existing hit consequences (no flying card, no second visual).
- **Renderer**: new `SpellEffectVisual` component (inline SVG + CSS keyframes, transform/opacity only) driven by the spec; `CombatEffectLayer` uses it for primary events that have a spec, replaces the 930 ms constant with `spec.impactAtMs` for hit consequences, and completes the event after `spec.totalMs`. Events without a spec keep today's presentation (fallback).
- **Sound**: new `soundRecipes.ts` (layers of oscillators/noise with envelope and filter) and `AudioController.playSpellCue(id, volumeScale)`; `App.tsx` plays it for primary events in addition to the existing sample cues. It respects mute/volume, stays silent when sound is off, and cleans up on dispose.
- **Preview**: a dev-only effects gallery (`?effects-preview`) renders every effect on a fake board so visuals and sounds can be reviewed without playing a battle or signing in.
- **Uniqueness rule**: every effect id has a unique glyph and a unique (start, travel, burst, glyph) tuple, and a unique sound recipe.

## Phases
| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `done` | Foundation: registry and event tagging, SVG renderer integration, sound synthesis, preview gallery | [P01](../phases/2026-11-18-spell-and-hero-power-effects/P01-foundation/phase.md) |
| P02 | `todo` | Content: 35 effects in four batches (hero powers + class spells, shared damage, shared utility, boss spells) | [P02](../phases/2026-11-18-spell-and-hero-power-effects/P02-content/phase.md) |
| P03 | `todo` | Verification, documentation, close-out | [P03](../phases/2026-11-18-spell-and-hero-power-effects/P03-verification/phase.md) |

## Risks
- Visuals cannot be judged by unit tests. Mitigation: the preview gallery (P01-T04) plus timing/uniqueness/data tests; each content task ends with a manual gallery review recorded in its progress log.
- Mobile performance. Mitigation: animate only `transform` and `opacity`, cap simultaneous particles per effect (<= 24 DOM nodes), no filters on large areas.
- Event timing changes could desynchronize the enemy-turn playback. Mitigation: events still complete through the same `onComplete`; completion time is only shortened (<= 1200/2000 ms plus stagger), and a spec-less fallback keeps the old timing.
- 35 distinct sounds from oscillators can sound alike or harsh. Mitigation: recipe uniqueness test, gain ceilings, and gallery audio review.
- Existing layer tests assert the card frame for spells (`shadow-bolt`). They change when that spell gets its visual (P02-T02).
