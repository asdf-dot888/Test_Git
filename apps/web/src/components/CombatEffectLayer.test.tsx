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
    expect(frame?.querySelector("img")?.getAttribute("src")).toBe("/art/cards/ash-wolf.png");
    expect(portrait?.getAttribute("src")).toBe("/art/cards/ash-wolf.png");
    await act(async () => { await vi.advanceTimersByTimeAsync(950); });
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("uses the spell illustration for hand events and the generic impact for hero-only hits", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => window.setTimeout(() => callback(0), 0));
    const spell = render(<CombatEffectLayer events={[{ id: 1, assetCardId: "shadow-bolt", effectKind: "damage", soundCues: [], source: { kind: "hand", slot: 0 }, target: { kind: "hero", side: "enemy" } }]} onComplete={vi.fn()} />);
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(document.body.querySelector(".combat-effect-card-frame img")?.getAttribute("src")).toBe("/art/cards/shadow-bolt.png");
    spell.unmount();
    render(<CombatEffectLayer events={[{ id: 2, assetCardId: null, effectKind: "impact", soundCues: [], source: { kind: "hero", side: "enemy" }, target: { kind: "hero", side: "player" } }]} onComplete={vi.fn()} />);
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(document.body.querySelector(".combat-effect-impact-art")?.getAttribute("src")).toBe("/art/effects/impact.png");
  });
});
