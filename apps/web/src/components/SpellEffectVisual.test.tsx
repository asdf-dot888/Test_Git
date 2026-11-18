// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { SpellVisualSpec } from "../game/spellEffectCatalog.js";
import { START_SHARE, SpellEffectVisual } from "./SpellEffectVisual.js";

afterEach(cleanup);

const spec: SpellVisualSpec = {
  id: "shadow-bolt",
  weight: "normal",
  impactAtMs: 520,
  totalMs: 1100,
  palette: { primary: "#8a5cff", secondary: "#2b1654", glow: "#c9b4ff" },
  motifs: { start: "gather", travel: "bolt", burst: "shatter" },
  glyph: "shadow-bolt",
};

function renderVisual(overrides: Partial<Parameters<typeof SpellEffectVisual>[0]> = {}) {
  return render(
    <SpellEffectVisual spec={spec} source={{ x: 100, y: 400 }} target={{ x: 400, y: 100 }} paused={false} delayMs={0} slowMotion={false} {...overrides} />,
  );
}

describe("SpellEffectVisual", () => {
  it("renders start, travel, and burst layers hidden from assistive technology", () => {
    const { container } = renderVisual();
    const root = container.querySelector<HTMLElement>(".spell-fx")!;
    expect(root.getAttribute("aria-hidden")).toBe("true");
    expect(root.dataset.spellFx).toBe("shadow-bolt");
    expect(root.querySelector(".spell-fx__start .fx-gather")).not.toBeNull();
    expect(root.querySelector(".spell-fx__travel .fx-bolt")).not.toBeNull();
    expect(root.querySelector(".spell-fx__burst .fx-shard")).not.toBeNull();
  });

  it("positions the effect at the source and passes geometry, palette, and phase timings as CSS variables", () => {
    const { container } = renderVisual({ delayMs: 120 });
    const root = container.querySelector<HTMLElement>(".spell-fx")!;
    const start = Math.round(520 * START_SHARE);
    expect(root.style.left).toBe("100px");
    expect(root.style.top).toBe("400px");
    expect(root.style.getPropertyValue("--fx-dx")).toBe("300px");
    expect(root.style.getPropertyValue("--fx-dy")).toBe("-300px");
    expect(Number.parseFloat(root.style.getPropertyValue("--fx-len"))).toBeCloseTo(424.26, 1);
    expect(Number.parseFloat(root.style.getPropertyValue("--fx-angle"))).toBeCloseTo(-45, 5);
    expect(root.style.getPropertyValue("--fx-primary")).toBe("#8a5cff");
    expect(root.style.getPropertyValue("--fx-secondary")).toBe("#2b1654");
    expect(root.style.getPropertyValue("--fx-glow")).toBe("#c9b4ff");
    expect(root.style.getPropertyValue("--fx-t-start")).toBe(`${start}ms`);
    expect(root.style.getPropertyValue("--fx-t-travel")).toBe(`${520 - start}ms`);
    expect(root.style.getPropertyValue("--fx-t-burst")).toBe(`${1100 - 520}ms`);
    expect(root.style.getPropertyValue("--fx-d-start")).toBe("120ms");
    expect(root.style.getPropertyValue("--fx-d-travel")).toBe(`${120 + start}ms`);
    expect(root.style.getPropertyValue("--fx-d-burst")).toBe(`${120 + 520}ms`);
  });

  it("doubles every phase duration in slow motion", () => {
    const { container } = renderVisual({ slowMotion: true, delayMs: 240 });
    const root = container.querySelector<HTMLElement>(".spell-fx")!;
    const start = Math.round(520 * START_SHARE);
    expect(root.classList.contains("is-slow-motion")).toBe(true);
    expect(root.style.getPropertyValue("--fx-t-start")).toBe(`${start * 2}ms`);
    expect(root.style.getPropertyValue("--fx-t-burst")).toBe(`${(1100 - 520) * 2}ms`);
    expect(root.style.getPropertyValue("--fx-d-burst")).toBe(`${240 + 520 * 2}ms`);
  });

  it("pauses its animations with the layer", () => {
    const running = renderVisual().container.querySelector<HTMLElement>(".spell-fx")!;
    expect(running.style.getPropertyValue("--fx-play")).toBe("running");
    cleanup();
    const paused = renderVisual({ paused: true }).container.querySelector<HTMLElement>(".spell-fx")!;
    expect(paused.style.getPropertyValue("--fx-play")).toBe("paused");
  });

  it("can play its start motif at the target", () => {
    const { container } = renderVisual({ spec: { ...spec, startAt: "target" } });
    expect(container.querySelector(".spell-fx__start.is-at-target")).not.toBeNull();
    cleanup();
    expect(renderVisual().container.querySelector(".spell-fx__start.is-at-target")).toBeNull();
  });

  it("stays within the element budget and renders nothing for unknown motifs or the none travel motif", () => {
    const { container } = renderVisual({ spec: { ...spec, motifs: { start: "unknown", travel: "none", burst: "unknown" } } });
    expect(container.querySelectorAll(".spell-fx *").length).toBeLessThanOrEqual(72);
    expect(container.querySelector(".spell-fx__start")?.children).toHaveLength(0);
    expect(container.querySelector(".spell-fx__travel")?.children).toHaveLength(0);
    expect(container.querySelector(".spell-fx__burst")?.children).toHaveLength(0);
  });
});
