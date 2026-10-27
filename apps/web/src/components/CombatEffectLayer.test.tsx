// @vitest-environment jsdom
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CombatEffectLayer } from "./CombatEffectLayer.js";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("CombatEffectLayer", () => {
  it("renders paired card and minion art for an attack and completes the event once", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => window.setTimeout(() => callback(0), 0));
    vi.stubGlobal("cancelAnimationFrame", (id: number) => window.clearTimeout(id));
    const onComplete = vi.fn();
    render(<CombatEffectLayer events={[{ id: 7, assetCardId: "ash-wolf", effectKind: "attack", soundCues: [], source: { kind: "minion", side: "player", slot: 0 }, target: { kind: "hero", side: "enemy" } }]} onComplete={onComplete} />);

    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(document.body.querySelectorAll(".combat-effect-sprite")).toHaveLength(2);
    const frame = document.body.querySelector(".combat-effect-card-frame");
    const portrait = document.body.querySelector(".combat-effect-minion-portrait");
    const impact = document.body.querySelector<HTMLElement>(".combat-effect-impact");
    expect(frame?.querySelector("img")?.getAttribute("src")).toBe("/art/cards/ash-wolf.png");
    expect(portrait?.getAttribute("src")).toBe("/art/cards/ash-wolf.png");
    expect(impact?.style.animationDelay).toBe("930ms");
    await act(async () => { await vi.advanceTimersByTimeAsync(950); });
    expect(onComplete).not.toHaveBeenCalled();
    await act(async () => { await vi.advanceTimersByTimeAsync(1_400); });
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("keeps the reduced-motion fallback short", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => window.setTimeout(() => callback(0), 0));
    vi.stubGlobal("cancelAnimationFrame", (id: number) => window.clearTimeout(id));
    vi.stubGlobal("matchMedia", () => ({ matches: true }));
    const onComplete = vi.fn();
    render(<CombatEffectLayer events={[{ id: 9, assetCardId: null, effectKind: "impact", soundCues: [], source: { kind: "hero", side: "enemy" }, target: { kind: "hero", side: "player" } }]} onComplete={onComplete} />);

    await act(async () => { await vi.advanceTimersByTimeAsync(219); });
    expect(onComplete).not.toHaveBeenCalled();
    await act(async () => { await vi.advanceTimersByTimeAsync(1); });
    expect(onComplete).toHaveBeenCalledOnce();
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

  it("shows the boss warning edge and death tear at the fallen unit anchor", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => window.setTimeout(() => callback(0), 0));
    vi.stubGlobal("cancelAnimationFrame", (id: number) => window.clearTimeout(id));
    render(<div className="battle-board"><div data-effect-anchor="minion:enemy:0" /><CombatEffectLayer events={[{ id: 23, assetCardId: "bone-rat", effectKind: "attack", bossArea: true, areaImpact: true, deathAnchors: [{ kind: "minion", side: "enemy", slot: 0 }], soundCues: ["damage", "death"], source: { kind: "minion", side: "enemy", slot: 1 }, target: { kind: "minion", side: "player", slot: 0 } }]} onComplete={vi.fn()} /></div>);
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(document.querySelector(".battle-board")?.classList.contains("is-boss-area-warning")).toBe(true);
    expect(document.body.querySelector(".combat-effect-death")?.querySelectorAll("i")).toHaveLength(4);
    expect(document.body.querySelector(".combat-effect-card-frame")?.getAttribute("style")).toContain("--card-accent");
  });

  it("skips the board shake for reduced motion while still completing the area event", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => window.setTimeout(() => callback(0), 0));
    vi.stubGlobal("cancelAnimationFrame", (id: number) => window.clearTimeout(id));
    vi.stubGlobal("matchMedia", () => ({ matches: true }));
    const onComplete = vi.fn();
    render(<div className="battle-board"><CombatEffectLayer events={[{ id: 16, assetCardId: null, effectKind: "impact", areaImpact: true, soundCues: ["damage"], source: { kind: "hero", side: "enemy" }, target: { kind: "hero", side: "player" } }]} onComplete={onComplete} /></div>);
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(document.querySelector(".battle-board")?.classList.contains("is-shaking")).toBe(false);
    await act(async () => { await vi.advanceTimersByTimeAsync(220); });
    expect(onComplete).toHaveBeenCalledWith(16);
  });
});
