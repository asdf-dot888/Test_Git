// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import type { DropTarget } from "./dragInteractions.js";
import { classifyGesture, DRAG_START_THRESHOLD_PX, formatDropTarget, parseDropTarget, parseDropTargetValue, sameDropTarget } from "./touchDrag.js";

describe("classifyGesture", () => {
  it("stays pending while the finger has barely moved, for both origins", () => {
    expect(DRAG_START_THRESHOLD_PX).toBe(10);
    expect(classifyGesture(0, 0, "hand")).toBe("pending");
    expect(classifyGesture(6, -7, "hand")).toBe("pending");
    expect(classifyGesture(10, 0, "board")).toBe("pending");
  });

  it("scrolls the hand on mostly horizontal moves and drags it on vertical or diagonal moves", () => {
    expect(classifyGesture(30, 4, "hand")).toBe("scroll");
    expect(classifyGesture(-30, 10, "hand")).toBe("scroll");
    expect(classifyGesture(4, -30, "hand")).toBe("drag");
    expect(classifyGesture(20, -22, "hand")).toBe("drag");
    expect(classifyGesture(-12, 40, "hand")).toBe("drag");
  });

  it("drags board minions in every direction once past the threshold", () => {
    expect(classifyGesture(40, 0, "board")).toBe("drag");
    expect(classifyGesture(0, -40, "board")).toBe("drag");
    expect(classifyGesture(-25, 25, "board")).toBe("drag");
  });
});

describe("classifyGesture for the hero power button", () => {
  it("stays pending inside the threshold and never scrolls, even on a horizontal move", () => {
    expect(classifyGesture(6, -7, "hero-power")).toBe("pending");
    expect(classifyGesture(40, 2, "hero-power")).toBe("drag");
    expect(classifyGesture(-40, 0, "hero-power")).toBe("drag");
    expect(classifyGesture(0, -40, "hero-power")).toBe("drag");
    expect(classifyGesture(-25, 25, "hero-power")).toBe("drag");
  });
});

describe("drop target attribute", () => {
  const targets: DropTarget[] = [
    { kind: "slot", slotIndex: 0 },
    { kind: "slot", slotIndex: 5 },
    { kind: "minion", side: "player", instanceId: "m-1" },
    { kind: "minion", side: "enemy", instanceId: "enemy:wolf:3" },
    { kind: "hero", side: "enemy" },
  ];

  it.each(targets)("round-trips %j", (target) => {
    expect(parseDropTargetValue(formatDropTarget(target))).toEqual(target);
  });

  it("formats the documented shapes", () => {
    expect(formatDropTarget({ kind: "slot", slotIndex: 2 })).toBe("slot:2");
    expect(formatDropTarget({ kind: "minion", side: "enemy", instanceId: "abc" })).toBe("minion:enemy:abc");
    expect(formatDropTarget({ kind: "hero", side: "enemy" })).toBe("hero:enemy");
  });

  it.each([null, undefined, "", "slot", "slot:", "slot:-1", "slot:1.5", "slot:x", "minion:enemy", "minion:both:a", "hero", "hero:nobody", "hero:enemy:extra", "tower:1"])("rejects %j", (value) => {
    expect(parseDropTargetValue(value)).toBeNull();
  });

  it("finds the closest marked ancestor and ignores unmarked elements", () => {
    document.body.innerHTML = `<div data-drop-target="slot:3"><span><b id="inner">x</b></span></div><p id="plain">y</p>`;
    expect(parseDropTarget(document.getElementById("inner"))).toEqual({ kind: "slot", slotIndex: 3 });
    expect(parseDropTarget(document.getElementById("plain"))).toBeNull();
    expect(parseDropTarget(null)).toBeNull();
  });

  it("compares drop targets by value", () => {
    expect(sameDropTarget({ kind: "slot", slotIndex: 1 }, { kind: "slot", slotIndex: 1 })).toBe(true);
    expect(sameDropTarget({ kind: "slot", slotIndex: 1 }, { kind: "slot", slotIndex: 2 })).toBe(false);
    expect(sameDropTarget(null, null)).toBe(true);
    expect(sameDropTarget(null, { kind: "hero", side: "enemy" })).toBe(false);
  });
});
