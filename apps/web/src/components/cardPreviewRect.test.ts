import { describe, expect, it } from "vitest";
import { computePreviewRect, HOVER_PREVIEW_SIZE } from "./cardPreviewRect.js";

const anchor = (left: number, top: number, width: number, height: number) => ({ left, top, width, height, right: left + width, bottom: top + height });
const desktop = { width: 1280, height: 800 };

describe("computePreviewRect", () => {
  it("keeps the scaled hand preview at 1.5x the hovered element, above it when there is room", () => {
    expect(computePreviewRect(anchor(400, 600, 100, 140), desktop, "scaled")).toEqual({ left: 375, top: 380, width: 150, height: 210 });
  });

  it("uses a fixed 220x320 card regardless of the anchor size", () => {
    const small = computePreviewRect(anchor(500, 400, 105, 72), desktop, "fixed");
    const large = computePreviewRect(anchor(500, 400, 300, 300), desktop, "fixed");
    expect(small.width).toBe(HOVER_PREVIEW_SIZE.width);
    expect(small.height).toBe(HOVER_PREVIEW_SIZE.height);
    expect(large.width).toBe(HOVER_PREVIEW_SIZE.width);
    expect(large.height).toBe(HOVER_PREVIEW_SIZE.height);
  });

  it("places the fixed preview above the anchor when there is room and below when there is not", () => {
    const above = computePreviewRect(anchor(500, 500, 105, 72), desktop, "fixed");
    expect(above.top).toBe(500 - 320 - 10);
    const below = computePreviewRect(anchor(500, 100, 105, 72), desktop, "fixed");
    expect(below.top).toBe(100 + 72 + 10);
  });

  it("clamps the preview inside the viewport horizontally and vertically", () => {
    const leftEdge = computePreviewRect(anchor(0, 500, 105, 72), desktop, "fixed");
    expect(leftEdge.left).toBe(8);
    const rightEdge = computePreviewRect(anchor(1250, 500, 105, 72), desktop, "fixed");
    expect(rightEdge.left).toBe(desktop.width - 220 - 8);
    const bottom = computePreviewRect(anchor(500, 790, 105, 72), { width: 1280, height: 500 }, "fixed");
    expect(bottom.top + bottom.height).toBeLessThanOrEqual(500 - 8);
  });

  it("shrinks the fixed preview, keeping its proportions, when the viewport is small", () => {
    const rect = computePreviewRect(anchor(20, 100, 105, 72), { width: 200, height: 400 }, "fixed");
    expect(rect.width).toBeCloseTo(184);
    expect(rect.height / rect.width).toBeCloseTo(320 / 220);
    expect(rect.left).toBeGreaterThanOrEqual(8);
    expect(rect.left + rect.width).toBeLessThanOrEqual(200 - 8 + 0.001);
  });
});
