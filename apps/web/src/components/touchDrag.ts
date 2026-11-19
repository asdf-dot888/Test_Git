import { TAP_MOVE_TOLERANCE_PX } from "../game/inputMode.js";
import type { DropTarget } from "./dragInteractions.js";

/** A finger must move this far (px) before a press becomes a drag; below it the press is still a tap. */
export const DRAG_START_THRESHOLD_PX = TAP_MOVE_TOLERANCE_PX;

export type GestureKind = "pending" | "drag" | "scroll";
export type DragOrigin = "hand" | "board";

/**
 * Decides what a moving finger is doing. Hand cards sit in a horizontally scrollable row, so a mostly horizontal
 * move scrolls it and a vertical or diagonal move picks the card up. Board minions never scroll.
 */
export function classifyGesture(dx: number, dy: number, origin: DragOrigin): GestureKind {
  if (Math.hypot(dx, dy) <= DRAG_START_THRESHOLD_PX) return "pending";
  if (origin === "board") return "drag";
  return Math.abs(dx) > Math.abs(dy) ? "scroll" : "drag";
}

/** Writes a drop target into the `data-drop-target` attribute value: `slot:2`, `minion:enemy:<id>`, `hero:enemy`. */
export function formatDropTarget(target: DropTarget): string {
  if (target.kind === "slot") return `slot:${target.slotIndex}`;
  if (target.kind === "minion") return `minion:${target.side}:${target.instanceId}`;
  return `hero:${target.side}`;
}

/** Reads a `data-drop-target` attribute value back into a drop target, or null when it is not one. */
export function parseDropTargetValue(value: string | null | undefined): DropTarget | null {
  if (!value) return null;
  const [kind, second, ...rest] = value.split(":");
  if (kind === "slot") {
    const slotIndex = Number(second);
    return second !== undefined && second !== "" && Number.isInteger(slotIndex) && slotIndex >= 0 ? { kind: "slot", slotIndex } : null;
  }
  if (kind === "minion") {
    const instanceId = rest.join(":");
    return (second === "player" || second === "enemy") && instanceId ? { kind: "minion", side: second, instanceId } : null;
  }
  if (kind === "hero") return (second === "player" || second === "enemy") && rest.length === 0 ? { kind: "hero", side: second } : null;
  return null;
}

/** Finds the drop target the element (or its closest ancestor) is marked with. */
export function parseDropTarget(element: Element | null): DropTarget | null {
  return parseDropTargetValue(element?.closest("[data-drop-target]")?.getAttribute("data-drop-target"));
}

export function sameDropTarget(a: DropTarget | null, b: DropTarget | null): boolean {
  if (!a || !b) return a === b;
  return formatDropTarget(a) === formatDropTarget(b);
}
