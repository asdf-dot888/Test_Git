// @vitest-environment jsdom
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { SpellVisualSpec } from "../game/spellEffectCatalog.js";
import { CombatEffectLayer } from "./CombatEffectLayer.js";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

const spec: SpellVisualSpec = {
  id: "shadow-bolt",
  weight: "normal",
  impactAtMs: 520,
  totalMs: 1100,
  palette: { primary: "#8a5cff", secondary: "#2b1654", glow: "#c9b4ff" },
  motifs: { start: "gather", travel: "bolt", burst: "shatter" },
  glyph: "shadow-bolt",
};

describe("board shake timing", () => {
  function stub() {
    vi.useFakeTimers();
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => window.setTimeout(() => callback(0), 0));
    vi.stubGlobal("cancelAnimationFrame", (id: number) => window.clearTimeout(id));
  }
  const hit = { amount: 2, armorBlocked: 0, outcome: "hit" as const, retaliation: false };

  it("starts the board shake when a registered visual lands and clears the delay afterwards", async () => {
    stub();
    const view = render(<div className="battle-board"><CombatEffectLayer onComplete={vi.fn()} resolveSpec={() => spec} events={[{
      id: 1, assetCardId: "shadow-bolt", effectKind: "damage", damageTarget: "hero", damage: hit, soundCues: [],
      visualId: "shadow-bolt", visualRole: "primary", spellEffectKind: "damage",
      source: { kind: "hand", side: "player", slot: 0 }, target: { kind: "hero", side: "enemy" },
    }]} /></div>);
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    const board = document.querySelector<HTMLElement>(".battle-board")!;
    expect(board.classList.contains("is-hit-shaking")).toBe(true);
    expect(board.style.getPropertyValue("--hit-delay")).toBe("520ms");
    view.unmount();
  });

  it("keeps the legacy 930 ms delay for events without a registered visual", async () => {
    stub();
    render(<div className="battle-board"><CombatEffectLayer onComplete={vi.fn()} events={[{
      id: 2, assetCardId: "ash-wolf", effectKind: "attack", damageTarget: "hero", damage: hit, soundCues: [],
      source: { kind: "minion", side: "player", slot: 0 }, target: { kind: "hero", side: "enemy" },
    }]} /></div>);
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(document.querySelector<HTMLElement>(".battle-board")?.style.getPropertyValue("--hit-delay")).toBe("930ms");
  });

  it("removes the delay variable once the shake is released", async () => {
    stub();
    render(<div className="battle-board"><CombatEffectLayer onComplete={vi.fn()} resolveSpec={() => spec} events={[{
      id: 3, assetCardId: "shadow-bolt", effectKind: "damage", damageTarget: "hero", damage: hit, soundCues: [],
      visualId: "shadow-bolt", visualRole: "primary", spellEffectKind: "damage",
      source: { kind: "hand", side: "player", slot: 0 }, target: { kind: "hero", side: "enemy" },
    }]} /></div>);
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    // The shake timer is the hit delay plus the light-tier shake duration (500 ms).
    await act(async () => { await vi.advanceTimersByTimeAsync(520 + 500 + 5); });
    const board = document.querySelector<HTMLElement>(".battle-board")!;
    expect(board.classList.contains("is-hit-shaking")).toBe(false);
    expect(board.style.getPropertyValue("--hit-delay")).toBe("");
  });
});
