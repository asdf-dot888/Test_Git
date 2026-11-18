import { afterEach, describe, expect, it } from "vitest";
import { CARD_CATALOG } from "@board-game/game-core";
import {
  REQUIRED_SPELL_VISUAL_IDS,
  SPELL_VISUAL_LIMITS,
  SPELL_VISUAL_SPECS,
  __setSpellVisualSpecsForTest,
  expectedSpellVisualWeight,
  getSpellVisualSpec,
  heroPowerVisualId,
  spellVisualFingerprint,
  spellVisualSpecProblems,
  type SpellVisualSpec,
} from "./spellEffectCatalog.js";

function spec(overrides: Partial<SpellVisualSpec> = {}): SpellVisualSpec {
  return {
    id: "shadow-bolt",
    weight: "normal",
    impactAtMs: 520,
    totalMs: 1100,
    palette: { primary: "#8a5cff", secondary: "#2b1654", glow: "#c9b4ff" },
    motifs: { start: "gather", travel: "bolt", burst: "shatter" },
    glyph: "shadow-bolt",
    ...overrides,
  };
}

afterEach(() => __setSpellVisualSpecsForTest(null));

describe("spell visual registry", () => {
  it("requires exactly 35 effects: 32 spell cards and the three hero powers", () => {
    expect(REQUIRED_SPELL_VISUAL_IDS).toHaveLength(35);
    expect(new Set(REQUIRED_SPELL_VISUAL_IDS).size).toBe(35);
    for (const id of ["hero-power-warrior", "hero-power-assassin", "hero-power-demonist"]) expect(REQUIRED_SPELL_VISUAL_IDS).toContain(id);
    const spellIds = CARD_CATALOG.filter((card) => card.kind === "spell").map((card) => card.id);
    expect(spellIds).toHaveLength(32);
    for (const id of spellIds) expect(REQUIRED_SPELL_VISUAL_IDS).toContain(id);
  });

  it("builds hero power ids from the class", () => {
    expect(heroPowerVisualId("warrior")).toBe("hero-power-warrior");
    expect(heroPowerVisualId("assassin")).toBe("hero-power-assassin");
    expect(heroPowerVisualId("demonist")).toBe("hero-power-demonist");
  });

  it("classifies large effects: three big player spells and every boss-only spell", () => {
    for (const id of ["eclipse", "soul-storm", "meteor-shard"]) expect(expectedSpellVisualWeight(id)).toBe("large");
    const bossSpells = CARD_CATALOG.filter((card) => card.kind === "spell" && card.enemyOnly);
    expect(bossSpells).toHaveLength(8);
    for (const card of bossSpells) expect(expectedSpellVisualWeight(card.id)).toBe("large");
    for (const id of ["shadow-bolt", "healing-mist", "warrior-hammerfall", "hero-power-warrior"]) expect(expectedSpellVisualWeight(id)).toBe("normal");
  });

  it("returns undefined for unknown, null, or missing ids and honors the test override", () => {
    expect(getSpellVisualSpec(null)).toBeUndefined();
    expect(getSpellVisualSpec(undefined)).toBeUndefined();
    expect(getSpellVisualSpec("not-a-spell")).toBeUndefined();
    __setSpellVisualSpecsForTest({ "shadow-bolt": spec() });
    expect(getSpellVisualSpec("shadow-bolt")?.glyph).toBe("shadow-bolt");
    __setSpellVisualSpecsForTest(null);
    expect(getSpellVisualSpec("shadow-bolt")).toBe(SPELL_VISUAL_SPECS["shadow-bolt"]);
  });
});

describe("spell visual limits", () => {
  it("accepts a valid normal and large spec", () => {
    expect(spellVisualSpecProblems(spec())).toEqual([]);
    expect(spellVisualSpecProblems(spec({ id: "eclipse", weight: "large", impactAtMs: 900, totalMs: 1900 }))).toEqual([]);
  });

  it("rejects specs that break duration, hit-tail, impact, glyph, or weight rules", () => {
    expect(spellVisualSpecProblems(spec({ totalMs: 1300 }))).toHaveLength(1);
    expect(spellVisualSpecProblems(spec({ id: "eclipse", weight: "large", totalMs: 2100 }))[0]).toContain("exceeds");
    expect(spellVisualSpecProblems(spec({ impactAtMs: 200 }))[0]).toContain("below");
    expect(spellVisualSpecProblems(spec({ impactAtMs: 800, totalMs: 1100 }))[0]).toContain("remain after the impact");
    expect(spellVisualSpecProblems(spec({ glyph: "" }))[0]).toContain("glyph");
    expect(spellVisualSpecProblems(spec({ id: "eclipse", weight: "normal" }))[0]).toContain("should be large");
  });

  it("keeps the documented limits", () => {
    expect(SPELL_VISUAL_LIMITS).toEqual({ normalMs: 1200, largeMs: 2000, minHitTailMs: 450, minImpactAtMs: 300 });
  });

  it("builds fingerprints that distinguish motif tuples and glyphs", () => {
    expect(spellVisualFingerprint(spec())).not.toBe(spellVisualFingerprint(spec({ glyph: "other" })));
    expect(spellVisualFingerprint(spec())).not.toBe(spellVisualFingerprint(spec({ motifs: { start: "circle", travel: "bolt", burst: "shatter" } })));
  });

  it("holds for every registered effect (vacuous until effects are added)", () => {
    const specs = Object.values(SPELL_VISUAL_SPECS);
    for (const registered of specs) expect(spellVisualSpecProblems(registered)).toEqual([]);
    expect(new Set(specs.map(spellVisualFingerprint)).size).toBe(specs.length);
    expect(new Set(specs.map((registered) => registered.glyph)).size).toBe(specs.length);
    for (const registered of specs) expect(REQUIRED_SPELL_VISUAL_IDS).toContain(registered.id);
  });
});
