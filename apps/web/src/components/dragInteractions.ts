
import type { DragEvent } from "react";

export type DragPayload = { kind: "card" | "minion"; instanceId: string };
export type DropTarget =
  | { kind: "slot"; slotIndex: number }
  | { kind: "minion"; side: "player" | "enemy"; instanceId: string }
  | { kind: "hero"; side: "player" | "enemy" };

const DRAG_TYPE = "application/x-ashen-expedition";

export function writeDragPayload(event: DragEvent, payload: DragPayload): void {
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData(DRAG_TYPE, JSON.stringify(payload));
  event.dataTransfer.setData("text/plain", `${payload.kind}:${payload.instanceId}`);
}

export function readDragPayload(event: DragEvent): DragPayload | null {
  const encoded = event.dataTransfer.getData(DRAG_TYPE);
  if (encoded) {
    try {
      const value: unknown = JSON.parse(encoded);
      if (typeof value === "object" && value !== null && "kind" in value && "instanceId" in value
        && (value.kind === "card" || value.kind === "minion") && typeof value.instanceId === "string") return value as DragPayload;
    } catch { /* Try the text fallback below. */ }
  }
  const [kind, ...rest] = event.dataTransfer.getData("text/plain").split(":");
  const instanceId = rest.join(":");
  return (kind === "card" || kind === "minion") && instanceId ? { kind, instanceId } : null;
}

