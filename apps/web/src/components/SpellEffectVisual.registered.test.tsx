// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SPELL_VISUAL_SPECS } from "../game/spellEffectCatalog.js";
import { SpellEffectVisual } from "./SpellEffectVisual.js";

afterEach(cleanup);

/** Renders every registered effect through the real renderer, so each new content batch is covered automatically. */
describe("registered effects render", () => {
  it.each(Object.values(SPELL_VISUAL_SPECS).map((spec) => [spec.id, spec] as const))("%s renders its glyph and all three phases within the element budget", (_id, spec) => {
    const { container } = render(
      <SpellEffectVisual spec={spec} source={{ x: 120, y: 520 }} target={{ x: 480, y: 160 }} paused={false} delayMs={0} slowMotion={false} />,
    );
    const root = container.querySelector<HTMLElement>(".spell-fx")!;
    expect(root.dataset.spellFx).toBe(spec.id);
    expect(root.querySelector("svg.fx-glyph")).not.toBeNull();
    expect(root.querySelector("svg.fx-glyph")?.childElementCount).toBeGreaterThan(0);
    expect(root.querySelector(".spell-fx__start")?.children.length).toBeGreaterThan(0);
    expect(root.querySelector(".spell-fx__burst")?.children.length).toBeGreaterThan(0);
    if (spec.motifs.travel !== "none") expect(root.querySelector(".spell-fx__travel")?.children.length).toBeGreaterThan(0);
    expect(root.querySelectorAll("*").length).toBeLessThanOrEqual(72);
    expect(root.querySelector(".spell-fx__start")?.classList.contains("is-at-target")).toBe(spec.startAt === "target");
  });
});
