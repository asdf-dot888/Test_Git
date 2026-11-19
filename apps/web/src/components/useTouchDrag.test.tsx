// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DragPayload, DropTarget } from "./dragInteractions.js";
import { useTouchDrag, type DragState, type TouchDragOptions } from "./useTouchDrag.js";

const payload: DragPayload = { kind: "card", instanceId: "card-1" };
const slot2: DropTarget = { kind: "slot", slotIndex: 2 };
const hero: DropTarget = { kind: "hero", side: "enemy" };

function Harness(props: Partial<TouchDragOptions> & { onDrop(p: DragPayload, t: DropTarget): void }) {
  const { handlers, ghostPortal, dragging } = useTouchDrag({
    payload,
    origin: "board",
    enabled: true,
    getValidTargets: () => [slot2, hero],
    ghost: () => <span>고스트</span>,
    ...props,
  });
  return (
    <div>
      <div data-testid="source" {...handlers}>카드</div>
      <output data-testid="state">{dragging ? "dragging" : "idle"}</output>
      {ghostPortal}
    </div>
  );
}

function touch(type: "pointerDown" | "pointerMove" | "pointerUp" | "pointerCancel", x: number, y: number, pointerId = 1, pointerType = "touch") {
  fireEvent[type](screen.getByTestId("source"), { pointerType, pointerId, clientX: x, clientY: y });
}

function pointAt(target: string | null) {
  document.elementFromPoint = vi.fn(() => (target ? document.querySelector(`[data-drop-target="${target}"]`) : null));
}

beforeEach(() => {
  document.body.innerHTML = "";
});

afterEach(() => {
  cleanup();
  document.body.classList.remove("touch-dragging");
  Reflect.deleteProperty(document, "elementFromPoint");
});

function renderWithTargets(props: Partial<TouchDragOptions> = {}) {
  const onDrop = vi.fn();
  const result = render(<Harness onDrop={onDrop} {...props} />);
  for (const value of ["slot:2", "hero:enemy", "slot:3"]) {
    const marker = document.createElement("div");
    marker.setAttribute("data-drop-target", value);
    document.body.append(marker);
  }
  return { onDrop, ...result };
}

describe("useTouchDrag", () => {
  it("starts a drag after the threshold, shows the ghost, drops on a valid target and cleans up", () => {
    const states: (DragState | null)[] = [];
    const { onDrop } = renderWithTargets({ onDragStateChange: (state) => states.push(state) });
    pointAt("slot:2");

    touch("pointerDown", 100, 300);
    touch("pointerMove", 104, 296);
    expect(screen.getByTestId("state").textContent).toBe("idle");
    expect(document.querySelector(".touch-drag-ghost")).toBeNull();

    touch("pointerMove", 120, 200);
    expect(screen.getByTestId("state").textContent).toBe("dragging");
    expect(document.querySelector(".touch-drag-ghost")?.textContent).toBe("고스트");
    expect(document.body.classList.contains("touch-dragging")).toBe(true);
    expect(states.at(-1)).toMatchObject({ payload, hovered: slot2, valid: [slot2, hero], x: 120, y: 200 });

    touch("pointerUp", 120, 200);
    expect(onDrop).toHaveBeenCalledExactlyOnceWith(payload, slot2);
    expect(screen.getByTestId("state").textContent).toBe("idle");
    expect(document.querySelector(".touch-drag-ghost")).toBeNull();
    expect(document.body.classList.contains("touch-dragging")).toBe(false);
    expect(states.at(-1)).toBeNull();
  });

  it("cancels without an action when released over an invalid target or nothing", () => {
    const { onDrop } = renderWithTargets();
    pointAt("slot:3");
    touch("pointerDown", 10, 300);
    touch("pointerMove", 10, 200);
    expect(screen.getByTestId("state").textContent).toBe("dragging");
    touch("pointerUp", 10, 200);
    expect(onDrop).not.toHaveBeenCalled();
    expect(screen.getByTestId("state").textContent).toBe("idle");

    pointAt(null);
    touch("pointerDown", 10, 300);
    touch("pointerMove", 10, 200);
    touch("pointerUp", 10, 200);
    expect(onDrop).not.toHaveBeenCalled();
  });

  it("reports no hovered target while the finger is over an invalid one", () => {
    const states: (DragState | null)[] = [];
    renderWithTargets({ onDragStateChange: (state) => states.push(state) });
    pointAt("slot:3");
    touch("pointerDown", 10, 300);
    touch("pointerMove", 10, 200);
    expect(states.at(-1)).toMatchObject({ hovered: null, valid: [slot2, hero] });
  });

  it("cancels cleanly on pointercancel and leaves no ghost behind", () => {
    const states: (DragState | null)[] = [];
    const { onDrop } = renderWithTargets({ onDragStateChange: (state) => states.push(state) });
    pointAt("slot:2");
    touch("pointerDown", 10, 300);
    touch("pointerMove", 10, 200);
    touch("pointerCancel", 10, 200);
    expect(onDrop).not.toHaveBeenCalled();
    expect(document.querySelector(".touch-drag-ghost")).toBeNull();
    expect(document.body.classList.contains("touch-dragging")).toBe(false);
    expect(states.at(-1)).toBeNull();
  });

  it("clears the drag state and body class when unmounted mid-drag", () => {
    const states: (DragState | null)[] = [];
    const { unmount } = renderWithTargets({ onDragStateChange: (state) => states.push(state) });
    pointAt("slot:2");
    touch("pointerDown", 10, 300);
    touch("pointerMove", 10, 200);
    unmount();
    expect(document.body.classList.contains("touch-dragging")).toBe(false);
    expect(states.at(-1)).toBeNull();
  });

  it("ignores mouse and pen pointers so the browser's own drag keeps working", () => {
    const { onDrop } = renderWithTargets();
    pointAt("slot:2");
    for (const pointerType of ["mouse", "pen"]) {
      touch("pointerDown", 10, 300, 1, pointerType);
      touch("pointerMove", 10, 200, 1, pointerType);
      expect(screen.getByTestId("state").textContent).toBe("idle");
      touch("pointerUp", 10, 200, 1, pointerType);
    }
    expect(onDrop).not.toHaveBeenCalled();
  });

  it("does nothing when disabled and never starts for a different pointer id", () => {
    const { onDrop } = renderWithTargets({ enabled: false });
    pointAt("slot:2");
    touch("pointerDown", 10, 300);
    touch("pointerMove", 10, 200);
    expect(screen.getByTestId("state").textContent).toBe("idle");
    cleanup();

    const second = renderWithTargets();
    pointAt("slot:2");
    touch("pointerDown", 10, 300, 1);
    touch("pointerMove", 10, 200, 2);
    expect(screen.getByTestId("state").textContent).toBe("idle");
    expect(second.onDrop).not.toHaveBeenCalled();
    expect(onDrop).not.toHaveBeenCalled();
  });

  it("lets a horizontal move over the hand scroll instead of dragging, and drags on a vertical move", () => {
    const { onDrop } = renderWithTargets({ origin: "hand" });
    pointAt("slot:2");
    touch("pointerDown", 100, 300);
    touch("pointerMove", 140, 304);
    expect(screen.getByTestId("state").textContent).toBe("idle");
    touch("pointerMove", 100, 200);
    expect(screen.getByTestId("state").textContent).toBe("idle");
    touch("pointerUp", 100, 200);
    expect(onDrop).not.toHaveBeenCalled();

    touch("pointerDown", 100, 300);
    touch("pointerMove", 102, 240);
    expect(screen.getByTestId("state").textContent).toBe("dragging");
    touch("pointerUp", 102, 240);
    expect(onDrop).toHaveBeenCalledOnce();
  });

  it("leaves a press that never moved alone so a tap can open the details", () => {
    const { onDrop } = renderWithTargets();
    touch("pointerDown", 100, 300);
    touch("pointerUp", 100, 300);
    expect(onDrop).not.toHaveBeenCalled();
    expect(screen.getByTestId("state").textContent).toBe("idle");
  });

  it("cancels the browser's own drag only when the gesture started with a finger", () => {
    renderWithTargets();
    const source = screen.getByTestId("source");
    touch("pointerDown", 10, 10, 1, "touch");
    expect(fireEvent.dragStart(source)).toBe(false);
    touch("pointerDown", 10, 10, 2, "mouse");
    expect(fireEvent.dragStart(source)).toBe(true);
  });
});
