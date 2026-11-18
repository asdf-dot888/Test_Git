# Task: T01 Registry and Event Tagging

## Status: done

## Goal
Introduce the data model for per-effect visuals and tag combat effect events with the visual they should play, without changing what the player sees yet.

## Decision Summary
- D02: 35 effects (3 hero powers, 24 player spells, 8 boss spells), keyed by card id (same effect when the enemy casts the same spell) or hero power class.
- D05: normal effects <= 1200 ms, large (eclipse, soul-storm, meteor-shard, all boss spells) <= 2000 ms.
- Fallback: any event without a registry entry keeps today's presentation.

## Implementation
### I01. Registry types and API
- `apps/web/src/game/spellEffectCatalog.ts` (new)
  ```ts
  export type SpellVisualWeight = "normal" | "large";
  export type StartMotif = string;   // motif ids are defined by the renderer (P01-T02) and extended by content tasks
  export type TravelMotif = string;
  export type BurstMotif = string;
  export interface SpellVisualSpec {
    id: string;                 // card id, or "hero-power-warrior" | "hero-power-assassin" | "hero-power-demonist"
    weight: SpellVisualWeight;
    impactAtMs: number;         // hit consequences (blood, flash, deaths) start here
    totalMs: number;            // whole event duration
    palette: { primary: string; secondary: string; glow: string };
    motifs: { start: StartMotif; travel: TravelMotif; burst: BurstMotif };
    glyph: string;              // key of the unique SVG glyph in the glyph map (P01-T02)
    focusEffectKind?: SpellEffect["kind"]; // which effect of a multi-effect spell anchors the visual; default: first effect
  }
  export const SPELL_VISUAL_SPECS: Readonly<Record<string, SpellVisualSpec>>; // empty in this task
  export function getSpellVisualSpec(id: string | null | undefined): SpellVisualSpec | undefined;
  export const SPELL_VISUAL_LIMITS: { normalMs: 1200; largeMs: 2000; minHitTailMs: 450 };
  export function heroPowerVisualId(playerClass: PlayerClass): string; // "hero-power-warrior" ...
  export const REQUIRED_SPELL_VISUAL_IDS: readonly string[]; // the 35 ids from the decision, derived from CARD_CATALOG (spells that are not tokens, enemy-only included) plus the 3 hero power ids
  ```
  - `REQUIRED_SPELL_VISUAL_IDS`: all catalog cards with `kind === "spell"` (player 24 + boss 8 + any other) plus `hero-power-*`; the test below pins the count at 35 so a new spell fails loudly until it gets a visual.
### I02. Event tagging
- `apps/web/src/game/combatEffects.ts`
  - `CombatEffectEvent` gains optional `visualId?: string`, `visualRole?: "primary" | "follow-up"`, `spellEffectKind?: SpellEffect["kind"]`.
  - `pushEvent` signature stays backward compatible: add a trailing options object `{ visualId, visualRole, spellEffectKind }` (do not extend the long positional list).
  - Player spell casts (`action.type === "cast-spell"` branch): every event of the cast gets `visualId: card.cardId` and `spellEffectKind: effect.kind`; after the loop, mark exactly one event `visualRole: "primary"` (the first event whose `spellEffectKind === getSpellVisualSpec(card.cardId)?.focusEffectKind`, else the first event) and the rest `"follow-up"`. If no spec exists for the card, set no visual fields (fallback).
  - Enemy spell casts (`record.type === "cast-spell"` in `collectEnemyTurnEvents`): same rule per record, `visualId: record.cardId`.
  - Hero powers (`action.type === "use-hero-power"`): single event with `visualId: heroPowerVisualId(playerClass)` and `visualRole: "primary"` (only if a spec exists).
  - Minion plays, attacks, fusions, boss area events, and generic end-turn impacts are NOT tagged.
### I03. Tests
- `apps/web/src/game/spellEffectCatalog.test.ts` (new)
  - `REQUIRED_SPELL_VISUAL_IDS` has 35 entries and contains the 3 hero power ids.
  - Data invariants run over `SPELL_VISUAL_SPECS` (vacuously true now, enforced as content lands): `totalMs <= (weight === "large" ? 2000 : 1200)`, `totalMs - impactAtMs >= 450`, `impactAtMs >= 300`, unique `glyph`, unique (start, travel, burst, glyph) tuples, `large` for eclipse/soul-storm/meteor-shard and all boss-only spells, `normal` otherwise.
  - A completeness check that is skipped until P02 completes is NOT allowed; instead P03-T01 adds the completeness assertion.
- `apps/web/src/game/combatEffects.test.ts`
  - Using a temporary spec injected via a test-only setter `__setSpellVisualSpecsForTest(specs | null)` exported from the catalog module: a single-effect spell cast tags one primary event; a multi-effect spell (soul-storm) tags exactly one primary and the rest follow-up; `focusEffectKind` selects the anchor event; an enemy cast of a shared spell is tagged identically; hero powers are tagged by class; cards without a spec are untagged.

## Acceptance Criteria
- [ ] Registry module and tagging exist; behavior in the game is unchanged (no spec registered yet).
- [ ] Exactly one primary event per tagged cast.
- [ ] Tests, lint, build pass.

## Validation
- `npm test -- apps/web/src/game/spellEffectCatalog.test.ts apps/web/src/game/combatEffects.test.ts`
- `npm test`
- `npm run lint`
- `npm run build` (run BEFORE `npm test`; `dist/` holds compiled test copies that vitest also runs)

## Commit Message
```text
feat(effects): add spell visual registry and tag combat events

Plan: 2026-11-18-spell-and-hero-power-effects
Phase: P01-foundation
Task: T01-registry-and-event-tagging
```

## Progress
- [x] implementation complete
- [x] validation passed: 806 tests, lint clean, build clean. Added spellEffectCatalog.ts (registry, limits, validators, required ids = 35) and visualId/visualRole/spellEffectKind tagging in combatEffects.ts; no spec is registered yet so game behavior is unchanged.
- commit: see Git history
