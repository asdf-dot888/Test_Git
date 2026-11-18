// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { REQUIRED_SPELL_VISUAL_IDS, __setSpellVisualSpecsForTest, type SpellVisualSpec } from "../game/spellEffectCatalog.js";
import { EffectsPreview } from "./EffectsPreview.js";

function visual(id: string, overrides: Partial<SpellVisualSpec> = {}): SpellVisualSpec {
  return {
    id,
    weight: "normal",
    impactAtMs: 520,
    totalMs: 1100,
    palette: { primary: "#8a5cff", secondary: "#2b1654", glow: "#c9b4ff" },
    motifs: { start: "gather", travel: "bolt", burst: "shatter" },
    glyph: id,
    ...overrides,
  };
}

class FakeAudio {
  loop = false;
  volume = 1;
  currentTime = 0;
  paused = true;
  onended: (() => void) | null = null;
  constructor(public src: string) {}
  play(): Promise<void> { this.paused = false; return Promise.resolve(); }
  pause(): void { this.paused = true; }
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => window.setTimeout(() => callback(0), 0));
  vi.stubGlobal("cancelAnimationFrame", (id: number) => window.clearTimeout(id));
  vi.stubGlobal("Audio", FakeAudio);
});

afterEach(() => {
  cleanup();
  __setSpellVisualSpecsForTest(null);
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("EffectsPreview", () => {
  it("lists every required effect and disables the ones without a registered visual", () => {
    __setSpellVisualSpecsForTest({ "shadow-bolt": visual("shadow-bolt"), "hero-power-warrior": visual("hero-power-warrior") });
    render(<EffectsPreview />);
    const items = [...document.querySelectorAll<HTMLButtonElement>(".effects-preview__item")];
    expect(items).toHaveLength(REQUIRED_SPELL_VISUAL_IDS.length);
    expect(items.filter((item) => !item.disabled)).toHaveLength(2);
    expect(screen.getByRole("button", { name: "그림자 화살" }).hasAttribute("disabled")).toBe(false);
    expect(screen.getByRole("button", { name: /영혼 폭풍 \(연출 없음\)/ }).hasAttribute("disabled")).toBe(true);
  });

  it("provides the anchors the effect layer needs on the fake board", () => {
    render(<EffectsPreview />);
    for (const anchor of ["hero:enemy", "hero:player", "minion:enemy:0", "minion:enemy:1", "minion:enemy:2", "minion:player:0", "minion:player:1", "minion:player:2"]) {
      expect(document.querySelector(`[data-effect-anchor="${anchor}"]`), anchor).not.toBeNull();
    }
    expect(document.querySelector(".battle-board .hand-panel")).not.toBeNull();
    expect(document.querySelector(".battle-board .enemy-hand")).not.toBeNull();
  });

  it("disables playing an unregistered effect and says so", () => {
    render(<EffectsPreview />);
    expect((screen.getByRole("button", { name: "재생" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByRole("status").textContent).toContain("아직 연출이 등록되지 않았습니다");
  });

  it("plays the selected registered effect, shows its timing, and removes it when it completes", async () => {
    __setSpellVisualSpecsForTest({ "shadow-bolt": visual("shadow-bolt") });
    render(<EffectsPreview />);
    fireEvent.click(screen.getByRole("button", { name: "그림자 화살" }));
    expect(screen.getByRole("status").textContent).toContain("타격 520ms, 전체 1100ms");

    fireEvent.click(screen.getByRole("button", { name: "재생" }));
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(document.body.querySelector(".spell-fx[data-spell-fx='shadow-bolt']")).not.toBeNull();
    await act(async () => { await vi.advanceTimersByTimeAsync(1_100); });
    expect(document.body.querySelector(".spell-fx")).toBeNull();
  });

  it("adds the hit consequences when a damage amount is set", async () => {
    __setSpellVisualSpecsForTest({ "shadow-bolt": visual("shadow-bolt") });
    render(<EffectsPreview />);
    fireEvent.click(screen.getByRole("button", { name: "그림자 화살" }));
    fireEvent.change(screen.getByLabelText(/피해량/), { target: { value: "3" } });
    fireEvent.click(screen.getByRole("button", { name: "재생" }));
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(document.body.querySelector(".combat-effect-hero-hit-flash")).not.toBeNull();
    expect(document.body.querySelector<HTMLElement>(".combat-effect-hero-hit-flash")?.style.animationDelay).toBe("520ms");
  });

  it("plays all registered effects one after another and can be stopped", async () => {
    __setSpellVisualSpecsForTest({ "shadow-bolt": visual("shadow-bolt"), "soul-lance": visual("soul-lance", { totalMs: 1000, impactAtMs: 500 }) });
    render(<EffectsPreview />);
    fireEvent.click(screen.getByRole("button", { name: "등록된 효과 전체 재생" }));
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(document.body.querySelector(".spell-fx[data-spell-fx]")?.getAttribute("data-spell-fx")).toBeTruthy();
    expect(screen.getByRole("button", { name: "전체 재생 중지" })).not.toBeNull();
    await act(async () => { await vi.advanceTimersByTimeAsync(1_100 + 350 + 10); });
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(document.body.querySelector(".spell-fx[data-spell-fx='soul-lance']")).not.toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "전체 재생 중지" }));
    expect(screen.getByRole("button", { name: "등록된 효과 전체 재생" })).not.toBeNull();
  });
});
