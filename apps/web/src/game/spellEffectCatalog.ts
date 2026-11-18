import { CARD_CATALOG, type PlayerClass, type SpellEffect } from "@board-game/game-core";
import { HERO_AND_CLASS_SPECS } from "./spellEffects/heroAndClass.js";
import { SHARED_DAMAGE_SPECS } from "./spellEffects/sharedDamage.js";
import { SHARED_UTILITY_SPECS } from "./spellEffects/sharedUtility.js";
import { BOSS_SPELL_SPECS } from "./spellEffects/bossSpells.js";

export type SpellVisualWeight = "normal" | "large";

/** Motif ids are defined by the renderer; content tasks add more as effects need them. */
export type StartMotif = string;
export type TravelMotif = string;
export type BurstMotif = string;

export interface SpellVisualSpec {
  /** Card id, or `hero-power-warrior` / `hero-power-assassin` / `hero-power-demonist`. */
  id: string;
  weight: SpellVisualWeight;
  /** Hit consequences (blood, flash, deaths) start here. */
  impactAtMs: number;
  /** Whole event duration. */
  totalMs: number;
  palette: { primary: string; secondary: string; glow: string };
  motifs: { start: StartMotif; travel: TravelMotif; burst: BurstMotif };
  /** Key of the unique SVG glyph for this effect. */
  glyph: string;
  /** Where the start motif plays: at the caster (default) or at the target (e.g. a sigil under a summon slot). */
  startAt?: "source" | "target";
  /** Which effect of a multi-effect spell anchors the visual; defaults to the first effect. */
  focusEffectKind?: SpellEffect["kind"];
}

export const SPELL_VISUAL_LIMITS = { normalMs: 1200, largeMs: 2000, minHitTailMs: 450, minImpactAtMs: 300 } as const;

const ALL_SPELL_VISUAL_SPECS: readonly SpellVisualSpec[] = [...HERO_AND_CLASS_SPECS, ...SHARED_DAMAGE_SPECS, ...SHARED_UTILITY_SPECS, ...BOSS_SPELL_SPECS];

/** Registered effects, one entry per effect id (content batches live in `./spellEffects/`). */
export const SPELL_VISUAL_SPECS: Readonly<Record<string, SpellVisualSpec>> = Object.fromEntries(
  ALL_SPELL_VISUAL_SPECS.map((spec) => [spec.id, spec]),
);

let activeSpecs: Readonly<Record<string, SpellVisualSpec>> = SPELL_VISUAL_SPECS;

export function getSpellVisualSpec(id: string | null | undefined): SpellVisualSpec | undefined {
  return id ? activeSpecs[id] : undefined;
}

/** Test-only: replaces the registry for the current module instance; pass `null` to restore it. */
export function __setSpellVisualSpecsForTest(specs: Readonly<Record<string, SpellVisualSpec>> | null): void {
  activeSpecs = specs ?? SPELL_VISUAL_SPECS;
}

export function heroPowerVisualId(playerClass: PlayerClass): string {
  return `hero-power-${playerClass}`;
}

const HERO_POWER_VISUAL_IDS: readonly string[] = (["warrior", "assassin", "demonist"] as const).map(heroPowerVisualId);

/**
 * Every effect that must eventually have a unique visual: all spell cards (player and boss-only)
 * plus the three hero powers. A new spell card fails the completeness checks until it gets a visual.
 */
export const REQUIRED_SPELL_VISUAL_IDS: readonly string[] = [
  ...CARD_CATALOG.filter((card) => card.kind === "spell").map((card) => card.id),
  ...HERO_POWER_VISUAL_IDS,
];

const LARGE_PLAYER_SPELL_IDS: readonly string[] = ["eclipse", "soul-storm", "meteor-shard"];

/** Large effects: three big player spells and every boss-only spell. Everything else is normal. */
export function expectedSpellVisualWeight(id: string): SpellVisualWeight {
  if (LARGE_PLAYER_SPELL_IDS.includes(id)) return "large";
  const card = CARD_CATALOG.find((candidate) => candidate.id === id);
  return card?.kind === "spell" && card.enemyOnly ? "large" : "normal";
}

/** Returns a description of every limit the spec breaks (empty when valid). */
export function spellVisualSpecProblems(spec: SpellVisualSpec): string[] {
  const problems: string[] = [];
  const cap = spec.weight === "large" ? SPELL_VISUAL_LIMITS.largeMs : SPELL_VISUAL_LIMITS.normalMs;
  if (spec.totalMs > cap) problems.push(`${spec.id}: totalMs ${spec.totalMs} exceeds the ${spec.weight} cap of ${cap}`);
  if (spec.impactAtMs < SPELL_VISUAL_LIMITS.minImpactAtMs) problems.push(`${spec.id}: impactAtMs ${spec.impactAtMs} is below ${SPELL_VISUAL_LIMITS.minImpactAtMs}`);
  if (spec.totalMs - spec.impactAtMs < SPELL_VISUAL_LIMITS.minHitTailMs) problems.push(`${spec.id}: less than ${SPELL_VISUAL_LIMITS.minHitTailMs} ms remain after the impact`);
  if (spec.glyph.length === 0) problems.push(`${spec.id}: glyph is empty`);
  if (spec.weight !== expectedSpellVisualWeight(spec.id)) problems.push(`${spec.id}: weight should be ${expectedSpellVisualWeight(spec.id)}`);
  return problems;
}

/** Fingerprint used to prove that no two effects share the same motif tuple and glyph. */
export function spellVisualFingerprint(spec: SpellVisualSpec): string {
  return [spec.motifs.start, spec.motifs.travel, spec.motifs.burst, spec.glyph].join("|");
}
