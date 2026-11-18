// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { BURST_MOTIFS, GLYPHS, START_MOTIFS, TRAVEL_MOTIFS } from "./spellEffectMotifs.js";

afterEach(cleanup);

const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../styles/spellEffects.css"), "utf8");

const LIBRARIES = [
  ["start", START_MOTIFS, ["gather", "circle", "rise", "sweep", "shimmer", "flare", "sigil", "unfurl"]],
  ["travel", TRAVEL_MOTIFS, ["bolt", "lance", "arc", "fall", "thread", "stream", "none"]],
  ["burst", BURST_MOTIFS, ["ring", "shatter", "slash-cross", "column", "wave", "mist", "bloom", "crater", "portal", "chain"]],
] as const;

describe("spell effect motif library", () => {
  it.each(LIBRARIES)("defines every planned %s motif", (_name, library, ids) => {
    expect(Object.keys(library).sort()).toEqual([...ids].sort());
  });

  it.each(LIBRARIES.flatMap(([name, library]) => Object.entries(library).map(([id, renderer]) => [name, id, renderer] as const)))(
    "renders the %s motif %s with at most 24 elements",
    (_name, _id, renderer) => {
      const { container } = render(<div>{renderer()}</div>);
      expect(container.querySelectorAll("div *").length).toBeLessThanOrEqual(24);
    },
  );

  it("styles every class that a motif renders", () => {
    const missing = new Set<string>();
    for (const [, library] of LIBRARIES) {
      for (const renderer of Object.values(library)) {
        const { container } = render(<div>{renderer()}</div>);
        for (const element of container.querySelectorAll("div *")) {
          for (const className of element.classList) {
            if (!css.includes(`.${className}`)) missing.add(className);
          }
        }
        cleanup();
      }
    }
    expect([...missing]).toEqual([]);
  });

  it("animates only transform and opacity and never reacts to reduced motion", () => {
    const rules = css.replace(/\/\*[\s\S]*?\*\//g, "");
    expect(rules).not.toMatch(/prefers-reduced-motion/);
    for (const keyframes of rules.matchAll(/@keyframes\s+[\w-]+\s*\{((?:[^{}]|\{[^{}]*\})*)\}/g)) {
      const declarations = [...keyframes[1]!.matchAll(/([\w-]+)\s*:/g)].map((match) => match[1]);
      for (const property of declarations) expect(["opacity", "transform"]).toContain(property);
    }
  });

  it("starts with no glyphs registered until content tasks add them", () => {
    for (const glyph of Object.keys(GLYPHS)) expect(glyph).toMatch(/^[a-z0-9-]+$/);
  });
});
