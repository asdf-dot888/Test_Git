// @vitest-environment jsdom
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CombatEffectLayer } from "./CombatEffectLayer.js";
import { CARD_COMBAT_VISUAL_PROFILES } from "../game/combatEffects.js";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("CombatEffectLayer", () => {
  it("doubles the lethal attack timing and marks its visuals as slow motion", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => window.setTimeout(() => callback(0), 0));
    vi.stubGlobal("cancelAnimationFrame", (id: number) => window.clearTimeout(id));
    const onComplete = vi.fn();
    const duration = Math.max(1_400, 1_010 + CARD_COMBAT_VISUAL_PROFILES["ash-wolf"]!.durationMs) * 2;
    render(<CombatEffectLayer events={[{ id: 6, assetCardId: "ash-wolf", effectKind: "attack", slowMotion: true, soundCues: [], source: { kind: "minion", side: "player", slot: 0 }, target: { kind: "hero", side: "enemy" } }]} onComplete={onComplete} />);

    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(document.body.querySelector(".combat-effect-minion-portrait")?.classList.contains("is-slow-motion")).toBe(true);
    expect(document.body.querySelector(".combat-effect-impact")?.classList.contains("is-slow-motion")).toBe(true);
    await act(async () => { await vi.advanceTimersByTimeAsync(duration - 1); });
    expect(onComplete).not.toHaveBeenCalled();
    await act(async () => { await vi.advanceTimersByTimeAsync(1); });
    expect(onComplete).toHaveBeenCalledWith(6);
  });

  it("renders a single attacking portrait, themed trail, and impact for a minion attack", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => window.setTimeout(() => callback(0), 0));
    vi.stubGlobal("cancelAnimationFrame", (id: number) => window.clearTimeout(id));
    const onComplete = vi.fn();
    render(<CombatEffectLayer events={[{ id: 7, assetCardId: "ash-wolf", effectKind: "attack", damageTarget: "hero", soundCues: [], source: { kind: "minion", side: "player", slot: 0 }, target: { kind: "hero", side: "enemy" } }]} onComplete={onComplete} />);

    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(document.body.querySelectorAll(".combat-effect-sprite")).toHaveLength(2);
    const frame = document.body.querySelector(".combat-effect-card-frame");
    const portrait = document.body.querySelector(".combat-effect-minion-portrait");
    const trail = document.body.querySelector<HTMLElement>(".combat-effect-weapon-trail");
    const impact = document.body.querySelector<HTMLElement>(".combat-effect-impact");
    expect(frame).toBeNull();
    expect(portrait?.getAttribute("src")).toBe("/art/cards/ash-wolf.png");
    expect(trail?.dataset.particles).toBe("bone");
    expect(trail?.style.getPropertyValue("--effect-angle")).not.toBe("");
    expect(impact?.style.animationDelay).toBe("930ms");
    expect(document.body.querySelector(".combat-effect-hero-hit-flash")).not.toBeNull();
    expect(document.body.querySelector(".combat-effect-blood-splatter")).toBeNull();
    await act(async () => { await vi.advanceTimersByTimeAsync(950); });
    expect(onComplete).not.toHaveBeenCalled();
    await act(async () => { await vi.advanceTimersByTimeAsync(1_400); });
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("plays the full combat effect when reduced motion is requested", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => window.setTimeout(() => callback(0), 0));
    vi.stubGlobal("cancelAnimationFrame", (id: number) => window.clearTimeout(id));
    vi.stubGlobal("matchMedia", () => ({ matches: true }));
    const onComplete = vi.fn();
    const duration = Math.max(1_400, 1_010 + 390);
    render(<div className="battle-board"><CombatEffectLayer events={[{ id: 9, assetCardId: null, effectKind: "impact", damageTarget: "hero", damage: { amount: 1, armorBlocked: 0, outcome: "hit", retaliation: false }, soundCues: [], source: { kind: "hero", side: "enemy" }, target: { kind: "hero", side: "player" } }]} onComplete={onComplete} /></div>);

    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(document.querySelector(".battle-board")?.classList.contains("is-hit-shaking")).toBe(true);
    await act(async () => { await vi.advanceTimersByTimeAsync(duration - 1); });
    expect(onComplete).not.toHaveBeenCalled();
    await act(async () => { await vi.advanceTimersByTimeAsync(1); });
    expect(onComplete).toHaveBeenCalledOnce();
  });

  it("renders tier classes and target-specific miss, block, and hero melee effects", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => window.setTimeout(() => callback(0), 0));
    vi.stubGlobal("cancelAnimationFrame", (id: number) => window.clearTimeout(id));
    render(<div className="battle-board"><CombatEffectLayer events={[
      { id: 40, assetCardId: "ash-wolf", effectKind: "attack", damageTarget: "minion", damage: { amount: 2, armorBlocked: 0, outcome: "hit", retaliation: false }, soundCues: [], source: { kind: "minion", side: "player", slot: 0 }, target: { kind: "minion", side: "enemy", slot: 0 } },
      { id: 41, assetCardId: "ash-wolf", effectKind: "attack", damageTarget: "minion", damage: { amount: 3, armorBlocked: 0, outcome: "hit", retaliation: false }, soundCues: [], source: { kind: "minion", side: "player", slot: 1 }, target: { kind: "minion", side: "enemy", slot: 1 } },
      { id: 42, assetCardId: "ash-wolf", effectKind: "attack", damageTarget: "minion", damage: { amount: 5, armorBlocked: 0, outcome: "hit", retaliation: true }, soundCues: [], source: { kind: "minion", side: "enemy", slot: 2 }, target: { kind: "minion", side: "player", slot: 2 } },
      { id: 43, assetCardId: "fate-shard", effectKind: "damage", damageTarget: "minion", damage: { amount: 0, armorBlocked: 0, outcome: "miss", retaliation: false }, soundCues: ["spell"], source: { kind: "hand", side: "player", slot: 0 }, target: { kind: "minion", side: "enemy", slot: 3 } },
      { id: 44, assetCardId: "shadow-bolt", effectKind: "damage", damageTarget: "hero", damage: { amount: 0, armorBlocked: 2, outcome: "armor-block", retaliation: false }, soundCues: ["spell"], source: { kind: "hand", side: "enemy", slot: 0 }, target: { kind: "hero", side: "player" } },
      { id: 45, assetCardId: "ash-wolf", effectKind: "attack", damageTarget: "hero", damage: { amount: 5, armorBlocked: 0, outcome: "hit", retaliation: false }, soundCues: [], source: { kind: "minion", side: "enemy", slot: 3 }, target: { kind: "hero", side: "player" } },
    ]} onComplete={vi.fn()} /></div>);
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });

    expect(document.body.querySelector(".combat-effect-impact.impact-tier-light")).not.toBeNull();
    expect(document.body.querySelector(".combat-effect-impact.impact-tier-medium")).not.toBeNull();
    expect(document.body.querySelector(".combat-effect-impact.impact-tier-light.is-retaliation")).not.toBeNull();
    expect(document.body.querySelector(".combat-effect-miss-fragments")).not.toBeNull();
    expect(document.body.querySelector(".combat-effect-armor-spark")).not.toBeNull();
    expect(document.body.querySelector(".combat-effect-hero-melee-slash.impact-tier-heavy")).not.toBeNull();
    expect(document.body.querySelectorAll(".combat-effect-blood-splatter")).toHaveLength(3);
  });

  it("shows localized armor sparks without duplicating a boss-wide impact", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => window.setTimeout(() => callback(0), 0));
    vi.stubGlobal("cancelAnimationFrame", (id: number) => window.clearTimeout(id));
    render(<div className="battle-board"><div data-effect-anchor="hero:player" /><CombatEffectLayer events={[{
      id: 46,
      assetCardId: null,
      effectKind: "impact",
      areaImpact: true,
      bossArea: true,
      affectedTargets: [{ target: { kind: "hero", side: "player" }, damage: { amount: 0, armorBlocked: 1, outcome: "armor-block", retaliation: false } }],
      soundCues: [],
      source: { kind: "hero", side: "enemy" },
      target: { kind: "hero", side: "player" },
    }]} onComplete={vi.fn()} /></div>);
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });

    expect(document.body.querySelectorAll(".combat-effect-impact")).toHaveLength(1);
    expect(document.body.querySelector(".combat-effect-impact.is-area-impact")).not.toBeNull();
    expect(document.body.querySelectorAll(".combat-effect-armor-spark.is-area-block-spark")).toHaveLength(1);
    expect(document.body.querySelector(".combat-effect-hero-hit-flash")).toBeNull();
  });

  it("pauses the current effect timeout and resumes with the remaining duration", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => window.setTimeout(() => callback(0), 0));
    vi.stubGlobal("cancelAnimationFrame", (id: number) => window.clearTimeout(id));
    const onComplete = vi.fn();
    const event = { id: 21, assetCardId: null, effectKind: "damage" as const, soundCues: [], source: { kind: "hero" as const, side: "enemy" as const }, target: { kind: "hero" as const, side: "player" as const } };
    const view = render(<CombatEffectLayer events={[event]} onComplete={onComplete} />);

    await act(async () => { await vi.advanceTimersByTimeAsync(500); });
    view.rerender(<CombatEffectLayer events={[event]} paused onComplete={onComplete} />);
    expect(document.body.querySelector(".combat-effect-layer")?.className).toContain("is-paused");
    await act(async () => { await vi.advanceTimersByTimeAsync(5_000); });
    expect(onComplete).not.toHaveBeenCalled();
    view.rerender(<CombatEffectLayer events={[event]} paused={false} onComplete={onComplete} />);
    await act(async () => { await vi.advanceTimersByTimeAsync(899); });
    expect(onComplete).not.toHaveBeenCalled();
    await act(async () => { await vi.advanceTimersByTimeAsync(1); });
    expect(onComplete).toHaveBeenCalledOnce();
  });

  it("uses the spell illustration for hand events and the generic impact for hero-only hits", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => window.setTimeout(() => callback(0), 0));
    const spell = render(<CombatEffectLayer events={[{ id: 1, assetCardId: "shadow-bolt", effectKind: "damage", soundCues: [], source: { kind: "hand", side: "player", slot: 0 }, target: { kind: "hero", side: "enemy" } }]} onComplete={vi.fn()} />);
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(document.body.querySelector(".combat-effect-card-frame img")?.getAttribute("src")).toBe("/art/cards/shadow-bolt.png");
    spell.unmount();
    render(<CombatEffectLayer events={[{ id: 2, assetCardId: null, effectKind: "impact", soundCues: [], source: { kind: "hero", side: "enemy" }, target: { kind: "hero", side: "player" } }]} onComplete={vi.fn()} />);
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(document.body.querySelector(".combat-effect-impact-art")?.getAttribute("src")).toBe("/art/effects/impact.png");
  });

  it("shakes the board for a boss area impact and clears the class after 500ms", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => window.setTimeout(() => callback(0), 0));
    vi.stubGlobal("cancelAnimationFrame", (id: number) => window.clearTimeout(id));
    const onComplete = vi.fn();
    render(<div className="battle-board"><CombatEffectLayer events={[{ id: 15, assetCardId: null, effectKind: "impact", areaImpact: true, soundCues: ["damage"], source: { kind: "hero", side: "enemy" }, target: { kind: "hero", side: "player" } }]} onComplete={onComplete} /></div>);
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(document.querySelector(".battle-board")?.classList.contains("is-shaking")).toBe(true);
    expect(document.body.querySelector(".combat-effect-impact")?.classList.contains("is-area-impact")).toBe(true);
    await act(async () => { await vi.advanceTimersByTimeAsync(500); });
    expect(document.querySelector(".battle-board")?.classList.contains("is-shaking")).toBe(false);
  });

  it("shows blood for minion hits and keeps a shared shake active through overlapping hits", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => window.setTimeout(() => callback(0), 0));
    vi.stubGlobal("cancelAnimationFrame", (id: number) => window.clearTimeout(id));
    render(<div className="battle-board"><CombatEffectLayer events={[
      { id: 31, assetCardId: "ash-wolf", effectKind: "attack", damageTarget: "minion", soundCues: [], source: { kind: "minion", side: "player", slot: 0 }, target: { kind: "minion", side: "enemy", slot: 0 } },
      { id: 32, assetCardId: "crypt-guard", effectKind: "damage", damageTarget: "minion", soundCues: [], source: { kind: "hand", side: "enemy", slot: 0 }, target: { kind: "minion", side: "player", slot: 0 } },
    ]} onComplete={vi.fn()} /></div>);
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(document.body.querySelectorAll(".combat-effect-blood-splatter")).toHaveLength(2);
    expect(document.body.querySelector(".combat-effect-hero-hit-flash")).toBeNull();
    const board = document.querySelector(".battle-board");
    expect(board?.classList.contains("is-hit-shaking")).toBe(true);
    await act(async () => { await vi.advanceTimersByTimeAsync(1_430); });
    expect(board?.classList.contains("is-hit-shaking")).toBe(true);
    await act(async () => { await vi.advanceTimersByTimeAsync(120); });
    expect(board?.classList.contains("is-hit-shaking")).toBe(false);
  });

  it("pauses direct hit feedback and keeps its shake for reduced motion", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => window.setTimeout(() => callback(0), 0));
    vi.stubGlobal("cancelAnimationFrame", (id: number) => window.clearTimeout(id));
    const event = { id: 33, assetCardId: null, effectKind: "damage" as const, damageTarget: "hero" as const, soundCues: [], source: { kind: "hero" as const, side: "enemy" as const }, target: { kind: "hero" as const, side: "player" as const } };
    const view = render(<div className="battle-board"><CombatEffectLayer events={[event]} paused onComplete={vi.fn()} /></div>);
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(document.body.querySelector<HTMLElement>(".combat-effect-hero-hit-flash")?.style.animationPlayState).toBe("paused");
    expect(document.querySelector(".battle-board")?.classList.contains("is-hit-shaking")).toBe(true);
    view.unmount();

    vi.stubGlobal("matchMedia", () => ({ matches: true }));
    render(<div className="battle-board"><CombatEffectLayer events={[{ ...event, id: 34 }]} onComplete={vi.fn()} /></div>);
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(document.querySelector(".battle-board")?.classList.contains("is-hit-shaking")).toBe(true);
    expect(document.body.querySelector(".combat-effect-hero-hit-flash")).not.toBeNull();
  });

  it("shows the boss warning edge and death tear at the fallen unit anchor", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => window.setTimeout(() => callback(0), 0));
    vi.stubGlobal("cancelAnimationFrame", (id: number) => window.clearTimeout(id));
    render(<div className="battle-board"><div data-effect-anchor="minion:enemy:0" /><CombatEffectLayer events={[{ id: 23, assetCardId: "bone-rat", effectKind: "attack", bossArea: true, areaImpact: true, deathAnchors: [{ kind: "minion", side: "enemy", slot: 0 }], soundCues: ["damage", "death"], source: { kind: "minion", side: "enemy", slot: 1 }, target: { kind: "minion", side: "player", slot: 0 } }]} onComplete={vi.fn()} /></div>);
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(document.querySelector(".battle-board")?.classList.contains("is-boss-area-warning")).toBe(true);
    expect(document.body.querySelector(".combat-effect-death")?.querySelectorAll("i")).toHaveLength(4);
    expect(document.body.querySelector(".combat-effect-minion-portrait")?.getAttribute("style")).toContain("--card-accent");
  });

  it("positions fallback anchors across all six field slots", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => window.setTimeout(() => callback(0), 0));
    vi.stubGlobal("cancelAnimationFrame", (id: number) => window.clearTimeout(id));
    render(<div className="battle-board"><CombatEffectLayer events={[{ id: 25, assetCardId: "ash-wolf", effectKind: "summon", soundCues: [], source: { kind: "hand", side: "player", slot: 0 }, target: { kind: "minion", side: "player", slot: 5 } }]} onComplete={vi.fn()} /></div>);
    const board = document.querySelector<HTMLElement>(".battle-board")!;
    vi.spyOn(board, "getBoundingClientRect").mockReturnValue({ left: 100, top: 50, width: 600, height: 300, right: 700, bottom: 350, x: 100, y: 50, toJSON: () => ({}) });

    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(document.body.querySelector<HTMLElement>(".combat-effect-impact")?.style.left).toBe("650px");
  });

  it("keeps the full board shake for reduced motion while the area event completes", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => window.setTimeout(() => callback(0), 0));
    vi.stubGlobal("cancelAnimationFrame", (id: number) => window.clearTimeout(id));
    vi.stubGlobal("matchMedia", () => ({ matches: true }));
    const onComplete = vi.fn();
    render(<div className="battle-board"><CombatEffectLayer events={[{ id: 16, assetCardId: null, effectKind: "impact", areaImpact: true, soundCues: ["damage"], source: { kind: "hero", side: "enemy" }, target: { kind: "hero", side: "player" } }]} onComplete={onComplete} /></div>);
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(document.querySelector(".battle-board")?.classList.contains("is-shaking")).toBe(true);
    await act(async () => { await vi.advanceTimersByTimeAsync(500); });
    expect(document.querySelector(".battle-board")?.classList.contains("is-shaking")).toBe(false);
    await act(async () => { await vi.advanceTimersByTimeAsync(900); });
    expect(onComplete).toHaveBeenCalledWith(16);
  });
});
