import { describe, expect, it } from "vitest";
import { REQUIRED_SPELL_VISUAL_IDS } from "../game/spellEffectCatalog.js";
import { PREVIEW_GROUPS, PREVIEW_TARGETS, buildPreviewEvent, previewGroup, previewLabel } from "./previewEvents.js";

const base = { eventId: 7, caster: "player" as const, target: "enemy-hero" as const, damage: 0, slowMotion: false };

describe("buildPreviewEvent", () => {
  it("builds a primary hand-cast event for spells without a hit when the damage is zero", () => {
    const event = buildPreviewEvent({ ...base, id: "shadow-bolt" });
    expect(event).toMatchObject({
      id: 7, assetCardId: "shadow-bolt", effectKind: "damage", visualId: "shadow-bolt", visualRole: "primary", spellEffectKind: "damage",
      source: { kind: "hand", side: "player", slot: 0 }, target: { kind: "hero", side: "enemy" }, soundCues: ["spell"],
    });
    expect(event.damage).toBeUndefined();
    expect(event.damageTarget).toBeUndefined();
    expect(event.slowMotion).toBeUndefined();
  });

  it("casts hero powers from the caster's hero with no card art", () => {
    const event = buildPreviewEvent({ ...base, id: "hero-power-warrior", caster: "enemy", target: "player-hero" });
    expect(event).toMatchObject({ assetCardId: null, effectKind: "hero-power", source: { kind: "hero", side: "enemy" }, target: { kind: "hero", side: "player" }, visualId: "hero-power-warrior" });
    expect(event.spellEffectKind).toBeUndefined();
  });

  it("adds a hit result for hero and minion targets and flags slow motion", () => {
    const hero = buildPreviewEvent({ ...base, id: "eclipse", damage: 8, slowMotion: true });
    expect(hero.damageTarget).toBe("hero");
    expect(hero.damage).toEqual({ amount: 8, armorBlocked: 0, outcome: "hit", retaliation: false });
    expect(hero.soundCues).toEqual(["spell", "damage"]);
    expect(hero.slowMotion).toBe(true);
    const minion = buildPreviewEvent({ ...base, id: "soul-lance", target: "enemy-minion", damage: 3 });
    expect(minion.damageTarget).toBe("minion");
    expect(minion.target).toEqual({ kind: "minion", side: "enemy", slot: 1 });
  });

  it("maps summon spells to the summon cue and maps the first effect to a combat kind", () => {
    expect(buildPreviewEvent({ ...base, id: "raise-bones", target: "player-minion" }).effectKind).toBe("summon");
    expect(buildPreviewEvent({ ...base, id: "raise-bones", target: "player-minion" }).soundCues).toEqual(["summon"]);
    expect(buildPreviewEvent({ ...base, id: "soul-bargain" }).effectKind).toBe("theft");
    expect(buildPreviewEvent({ ...base, id: "healing-mist", target: "player-hero" }).effectKind).toBe("heal");
    expect(buildPreviewEvent({ ...base, id: "reaper-cleave", target: "enemy-minion" }).effectKind).toBe("cleave");
  });

  it("offers four targets that match the fake board anchors", () => {
    expect(PREVIEW_TARGETS.map(({ value }) => value)).toEqual(["enemy-hero", "enemy-minion", "player-minion", "player-hero"]);
  });
});

describe("preview labels and groups", () => {
  it("labels hero powers by name and spells by card name", () => {
    expect(previewLabel("hero-power-warrior")).toContain("방패 다지기");
    expect(previewLabel("hero-power-assassin")).toContain("그림자 습격");
    expect(previewLabel("shadow-bolt")).toBe("그림자 화살");
    expect(previewLabel("unknown-id")).toBe("unknown-id");
  });

  it("groups every required effect: 3 hero powers, 9 class spells, 15 shared spells, 8 boss spells", () => {
    const counts = Object.fromEntries(PREVIEW_GROUPS.map((group) => [group, REQUIRED_SPELL_VISUAL_IDS.filter((id) => previewGroup(id) === group).length]));
    expect(counts).toEqual({ "영웅 능력": 3, "직업 주문": 9, "공용 주문": 15, "보스 주문": 8 });
    expect(previewGroup("eclipse")).toBe("공용 주문");
    expect(previewGroup("warrior-brace")).toBe("직업 주문");
    expect(previewGroup("matron-thorn-prison")).toBe("보스 주문");
  });
});
