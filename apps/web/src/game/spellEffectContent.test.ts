import { describe, expect, it } from "vitest";
import { SOUND_RECIPES, recipeFingerprint, soundRecipeProblems } from "./soundRecipes.js";
import {
  REQUIRED_SPELL_VISUAL_IDS,
  SPELL_VISUAL_SPECS,
  expectedSpellVisualWeight,
  spellVisualFingerprint,
  spellVisualSpecProblems,
} from "./spellEffectCatalog.js";
import { BURST_MOTIFS, GLYPHS, START_MOTIFS, TRAVEL_MOTIFS } from "./spellEffectMotifs.js";

/** Content batches (P02). Later tasks append their ids here. */
const BATCHES: Readonly<Record<string, readonly string[]>> = {
  "hero powers and class spells": [
    "hero-power-warrior", "hero-power-assassin", "hero-power-demonist",
    "warrior-brace", "warrior-hammerfall", "warrior-rally",
    "assassin-venom-coat", "assassin-shuriken", "assassin-smoke-step",
    "demonist-dark-rite", "demonist-hellfire", "demonist-soul-bond",
  ],
  "shared damage spells": ["shadow-bolt", "soul-lance", "fate-shard", "reaper-cleave", "meteor-shard", "soul-storm", "eclipse"],
};

const registeredIds = Object.keys(SPELL_VISUAL_SPECS);

describe("registered spell and hero power effects", () => {
  it.each(Object.entries(BATCHES))("registers every effect of the batch: %s", (_name, ids) => {
    for (const id of ids) {
      expect(SPELL_VISUAL_SPECS[id], `${id} spec`).toBeDefined();
      expect(SOUND_RECIPES[id], `${id} recipe`).toBeDefined();
      expect(GLYPHS[id], `${id} glyph`).toBeDefined();
    }
  });

  it("registers only known effect ids, each with a matching spec, recipe, and glyph", () => {
    for (const id of registeredIds) {
      expect(REQUIRED_SPELL_VISUAL_IDS, id).toContain(id);
      expect(SPELL_VISUAL_SPECS[id]?.id).toBe(id);
      expect(SPELL_VISUAL_SPECS[id]?.glyph).toBe(id);
      expect(SOUND_RECIPES[id]?.id).toBe(id);
      expect(GLYPHS[id]).toBeDefined();
    }
    expect(Object.keys(SOUND_RECIPES).sort()).toEqual([...registeredIds].sort());
    expect(Object.keys(GLYPHS).sort()).toEqual([...registeredIds].sort());
  });

  it("keeps every spec within the timing limits and weight rules", () => {
    for (const spec of Object.values(SPELL_VISUAL_SPECS)) {
      expect(spellVisualSpecProblems(spec), spec.id).toEqual([]);
      expect(spec.weight, spec.id).toBe(expectedSpellVisualWeight(spec.id));
    }
  });

  it("only uses motifs that exist in the library", () => {
    for (const spec of Object.values(SPELL_VISUAL_SPECS)) {
      expect(Object.keys(START_MOTIFS), `${spec.id} start`).toContain(spec.motifs.start);
      expect(Object.keys(TRAVEL_MOTIFS), `${spec.id} travel`).toContain(spec.motifs.travel);
      expect(Object.keys(BURST_MOTIFS), `${spec.id} burst`).toContain(spec.motifs.burst);
    }
  });

  it("gives every effect a unique glyph, motif tuple, and sound", () => {
    const specs = Object.values(SPELL_VISUAL_SPECS);
    expect(new Set(specs.map(spellVisualFingerprint)).size).toBe(specs.length);
    expect(new Set(specs.map((spec) => spec.glyph)).size).toBe(specs.length);
    const recipes = Object.values(SOUND_RECIPES);
    expect(new Set(recipes.map(recipeFingerprint)).size).toBe(recipes.length);
  });

  it("keeps every sound recipe within its limits and no longer than its visual", () => {
    for (const recipe of Object.values(SOUND_RECIPES)) {
      expect(soundRecipeProblems(recipe), recipe.id).toEqual([]);
      expect(recipe.totalMs, `${recipe.id} outlasts its visual`).toBeLessThanOrEqual(SPELL_VISUAL_SPECS[recipe.id]!.totalMs);
    }
  });

  it("lines each sound's strongest layer up with the visual impact", () => {
    for (const recipe of Object.values(SOUND_RECIPES)) {
      const spec = SPELL_VISUAL_SPECS[recipe.id]!;
      const loudest = Math.max(...recipe.layers.map((layer) => layer.gain));
      const hasLayerAtImpact = recipe.layers.some((layer) => layer.startMs <= spec.impactAtMs + 80 && layer.startMs + layer.durationMs >= spec.impactAtMs - 80);
      expect(hasLayerAtImpact, `${recipe.id} has no sound near its impact`).toBe(true);
      expect(loudest).toBeLessThanOrEqual(0.6);
    }
  });
});
