import { afterEach, describe, expect, it } from "vitest";
import {
  SOUND_RECIPES,
  SYNTH_LIMITS,
  TAUNT_CUE_RECIPES,
  __setSoundRecipesForTest,
  getSoundRecipe,
  recipeFingerprint,
  soundRecipeProblems,
  type SoundRecipe,
} from "./soundRecipes.js";
import { REQUIRED_SPELL_VISUAL_IDS, SPELL_VISUAL_SPECS } from "./spellEffectCatalog.js";

afterEach(() => __setSoundRecipesForTest(null));

function recipe(overrides: Partial<SoundRecipe> = {}): SoundRecipe {
  return {
    id: "shadow-bolt",
    totalMs: 900,
    layers: [
      { wave: "sawtooth", startMs: 0, durationMs: 500, fromHz: 900, toHz: 200, gain: 0.4, filter: { type: "lowpass", fromHz: 3000, toHz: 500, q: 1.5 } },
      { wave: "noise", startMs: 300, durationMs: 400, fromHz: 1, gain: 0.25, filter: { type: "bandpass", fromHz: 1400 } },
    ],
    ...overrides,
  };
}

describe("sound recipe limits", () => {
  it("accepts a valid recipe", () => {
    expect(soundRecipeProblems(recipe())).toEqual([]);
  });

  it("rejects too many or no layers", () => {
    const layer = recipe().layers[0]!;
    expect(soundRecipeProblems(recipe({ layers: Array.from({ length: 7 }, () => layer) }))[0]).toContain("1..6 layers");
    expect(soundRecipeProblems(recipe({ layers: [] }))[0]).toContain("1..6 layers");
  });

  it("rejects durations beyond the cue length or the global cap", () => {
    expect(soundRecipeProblems(recipe({ totalMs: 2100 }))[0]).toContain("totalMs");
    const late = { wave: "sine" as const, startMs: 800, durationMs: 300, fromHz: 440, gain: 0.3 };
    expect(soundRecipeProblems(recipe({ layers: [late] }))[0]).toContain("ends after totalMs");
  });

  it("rejects unsafe gain, pitch, filter, and attack values", () => {
    const base = { wave: "sine" as const, startMs: 0, durationMs: 400, fromHz: 440, gain: 0.3 };
    expect(soundRecipeProblems(recipe({ layers: [{ ...base, gain: 0.9 }] }))[0]).toContain("gain");
    expect(soundRecipeProblems(recipe({ layers: [{ ...base, gain: 0 }] }))[0]).toContain("gain");
    expect(soundRecipeProblems(recipe({ layers: [{ ...base, fromHz: 5 }] }))[0]).toContain("pitch");
    expect(soundRecipeProblems(recipe({ layers: [{ ...base, toHz: 20000 }] }))[0]).toContain("pitch");
    expect(soundRecipeProblems(recipe({ layers: [{ ...base, filter: { type: "lowpass", fromHz: 30000 } }] }))[0]).toContain("filter");
    expect(soundRecipeProblems(recipe({ layers: [{ ...base, attackMs: 500 }] }))[0]).toContain("attack");
  });

  it("does not check pitch for noise layers", () => {
    expect(soundRecipeProblems(recipe({ layers: [{ wave: "noise", startMs: 0, durationMs: 300, fromHz: 1, gain: 0.3 }] }))).toEqual([]);
  });

  it("keeps the documented limits", () => {
    expect(SYNTH_LIMITS).toEqual({ maxLayers: 6, maxGain: 0.6, maxTotalMs: 2000, minHz: 20, maxHz: 16000 });
  });
});

describe("sound recipe registry", () => {
  it("fingerprints distinguish any audible difference and ignore the id", () => {
    const base = recipe();
    expect(recipeFingerprint(base)).toBe(recipeFingerprint(recipe({ id: "other" })));
    const changed = recipe({ layers: [{ ...base.layers[0]!, toHz: 210 }, base.layers[1]!] });
    expect(recipeFingerprint(base)).not.toBe(recipeFingerprint(changed));
    const defaultAttack = recipe({ layers: [{ ...base.layers[0]!, attackMs: 12 }, base.layers[1]!] });
    expect(recipeFingerprint(base)).toBe(recipeFingerprint(defaultAttack));
  });

  it("resolves recipes by id and honors the test override", () => {
    expect(getSoundRecipe(null)).toBeUndefined();
    expect(getSoundRecipe("unknown")).toBeUndefined();
    __setSoundRecipesForTest({ "shadow-bolt": recipe() });
    expect(getSoundRecipe("shadow-bolt")?.totalMs).toBe(900);
    __setSoundRecipesForTest(null);
    expect(getSoundRecipe("shadow-bolt")).toBe(SOUND_RECIPES["shadow-bolt"]);
  });

  it("holds for every registered recipe (vacuous until effects are added)", () => {
    const recipes = Object.values(SOUND_RECIPES);
    for (const registered of recipes) expect(soundRecipeProblems(registered)).toEqual([]);
    expect(new Set(recipes.map(recipeFingerprint)).size).toBe(recipes.length);
    for (const registered of recipes) {
      expect(REQUIRED_SPELL_VISUAL_IDS).toContain(registered.id);
      expect(SOUND_RECIPES[registered.id]).toBe(registered);
      const visual = SPELL_VISUAL_SPECS[registered.id];
      if (visual) expect(registered.totalMs).toBeLessThanOrEqual(visual.totalMs);
    }
  });
});

describe("taunt cues", () => {
  it("are valid, short, and kept out of the spell recipe registry", () => {
    for (const id of ["taunt-summon", "taunt-blocked"] as const) {
      expect(soundRecipeProblems(TAUNT_CUE_RECIPES[id])).toEqual([]);
      expect(TAUNT_CUE_RECIPES[id].totalMs).toBeLessThanOrEqual(300);
      expect(getSoundRecipe(id)).toBe(TAUNT_CUE_RECIPES[id]);
      expect(SOUND_RECIPES[id]).toBeUndefined();
    }
    expect(recipeFingerprint(TAUNT_CUE_RECIPES["taunt-summon"])).not.toBe(recipeFingerprint(TAUNT_CUE_RECIPES["taunt-blocked"]));
  });
});
