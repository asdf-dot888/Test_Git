import { useCallback, useEffect, useRef, useState, type DragEvent, type MouseEvent, type PointerEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { isTouchPointer } from "../game/inputMode.js";
import type { DragPayload, DropTarget } from "./dragInteractions.js";
import { classifyGesture, parseDropTarget, sameDropTarget, type DragOrigin, type GestureKind } from "./touchDrag.js";

export interface DragState {
  payload: DragPayload;
  x: number;
  y: number;
  /** The valid target under the finger, or null. */
  hovered: DropTarget | null;
  /** Every target the dragged item may be dropped on (highlighted by the board). */
  valid: DropTarget[];
}

export interface TouchDragOptions {
  payload: DragPayload;
  origin: DragOrigin;
  enabled: boolean;
  getValidTargets(): DropTarget[];
  onDrop(payload: DragPayload, target: DropTarget): void;
  onDragStateChange?(state: DragState | null): void;
  /** The floating copy that follows the finger. */
  ghost(): ReactNode;
}

export interface TouchDragHandlers {
  onPointerDown(event: PointerEvent<HTMLElement>): void;
  onPointerMove(event: PointerEvent<HTMLElement>): void;
  onPointerUp(event: PointerEvent<HTMLElement>): void;
  onPointerCancel(event: PointerEvent<HTMLElement>): void;
  /** Cancels the browser's own (mouse-only) drag when the gesture started with a finger. */
  onDragStart(event: DragEvent<HTMLElement>): void;
  /** Swallows the click some browsers still send right after a finger drag ends, so it cannot open details or select. */
  onClickCapture(event: MouseEvent<HTMLElement>): void;
}

/** How long after a drag ends a click is treated as part of that drag (ms). */
export const POST_DRAG_CLICK_WINDOW_MS = 400;

interface Gesture {
  pointerId: number;
  startX: number;
  startY: number;
  kind: GestureKind;
}

const DRAGGING_BODY_CLASS = "touch-dragging";

function hoveredTarget(x: number, y: number, valid: DropTarget[]): DropTarget | null {
  if (typeof document.elementFromPoint !== "function") return null;
  const target = parseDropTarget(document.elementFromPoint(x, y));
  return target && valid.some((candidate) => sameDropTarget(candidate, target)) ? target : null;
}

/**
 * Touch drag-and-drop for a card or minion. Only finger input (pointerType "touch") drags; mouse and pen keep the
 * browser's own drag. A press that never moves past the threshold is left alone so a tap can still open the details.
 */
export function useTouchDrag(options: TouchDragOptions): { handlers: TouchDragHandlers; ghostPortal: ReactNode; dragging: boolean } {
  const optionsRef = useRef(options);
  useEffect(() => { optionsRef.current = options; });
  const gesture = useRef<Gesture | null>(null);
  const validRef = useRef<DropTarget[]>([]);
  const lastPointerWasTouch = useRef(false);
  const lastDragEndedAt = useRef(Number.NEGATIVE_INFINITY);
  const [drag, setDrag] = useState<DragState | null>(null);

  const finish = useCallback(() => {
    const hadDrag = gesture.current?.kind === "drag";
    gesture.current = null;
    validRef.current = [];
    if (!hadDrag) return;
    lastDragEndedAt.current = Date.now();
    document.body.classList.remove(DRAGGING_BODY_CLASS);
    setDrag(null);
    optionsRef.current.onDragStateChange?.(null);
  }, []);

  useEffect(() => () => {
    if (gesture.current?.kind === "drag") {
      document.body.classList.remove(DRAGGING_BODY_CLASS);
      optionsRef.current.onDragStateChange?.(null);
    }
    gesture.current = null;
  }, []);

  const publish = (state: DragState) => {
    setDrag(state);
    optionsRef.current.onDragStateChange?.(state);
  };

  const handlers: TouchDragHandlers = {
    onPointerDown(event) {
      lastPointerWasTouch.current = isTouchPointer(event);
      if (!optionsRef.current.enabled || !isTouchPointer(event)) return;
      gesture.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, kind: "pending" };
    },
    onPointerMove(event) {
      const current = gesture.current;
      if (!current || current.pointerId !== event.pointerId) return;
      if (current.kind === "pending") {
        const kind = classifyGesture(event.clientX - current.startX, event.clientY - current.startY, optionsRef.current.origin);
        if (kind === "pending") return;
        if (kind === "scroll") { gesture.current = null; return; }
        current.kind = "drag";
        validRef.current = optionsRef.current.getValidTargets();
        document.body.classList.add(DRAGGING_BODY_CLASS);
        if (typeof event.currentTarget.setPointerCapture === "function") {
          try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* The pointer may already be gone. */ }
        }
      }
      if (current.kind !== "drag") return;
      publish({ payload: optionsRef.current.payload, x: event.clientX, y: event.clientY, hovered: hoveredTarget(event.clientX, event.clientY, validRef.current), valid: validRef.current });
    },
    onPointerUp(event) {
      const current = gesture.current;
      if (!current || current.pointerId !== event.pointerId) return;
      if (current.kind === "drag") {
        const target = hoveredTarget(event.clientX, event.clientY, validRef.current);
        const { payload, onDrop } = optionsRef.current;
        finish();
        if (target) onDrop(payload, target);
        return;
      }
      gesture.current = null;
    },
    onPointerCancel(event) {
      if (gesture.current && gesture.current.pointerId === event.pointerId) finish();
    },
    onDragStart(event) {
      if (lastPointerWasTouch.current) event.preventDefault();
    },
    onClickCapture(event) {
      if (Date.now() - lastDragEndedAt.current < POST_DRAG_CLICK_WINDOW_MS) {
        event.preventDefault();
        event.stopPropagation();
      }
    },
  };

  const ghostPortal = drag && createPortal(
    <div className="touch-drag-ghost" aria-hidden="true" style={{ left: drag.x, top: drag.y }}>{options.ghost()}</div>,
    document.body,
  );

  return { handlers, ghostPortal, dragging: drag !== null };
}
