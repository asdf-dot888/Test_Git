import { useRef, useState, type FocusEvent, type KeyboardEvent, type MouseEvent, type PointerEvent, type ReactNode, type TouchEvent } from "react";
import { createPortal } from "react-dom";
import type { CardDefinition } from "@board-game/game-core";
import { CardDetailsPopup, type CardDetailsAction, type CardLiveStats } from "./CardDetailsPopup.js";
import { computePreviewRect, type PreviewRect } from "./cardPreviewRect.js";
import { isTouchPointer } from "../game/inputMode.js";
import type { TouchDragHandlers } from "./useTouchDrag.js";

interface CardInspectionProps {
  card: CardDefinition;
  children: ReactNode;
  className: string;
  desktopHover?: boolean;
  hoverSize?: "scaled" | "fixed";
  /** When true (default), a finger tap opens the details popup and swallows the click, so the card's own action does not run. */
  tapDetails?: boolean;
  /** Optional confirm button inside the popup (reward and discard screens). */
  action?: CardDetailsAction;
  /** Current board values for a minion, shown in the popup instead of the printed stats. */
  liveStats?: CardLiveStats;
  /** Touch drag handlers from `useTouchDrag`; they are attached to the wrapper next to the tap handling. */
  dragHandlers?: TouchDragHandlers;
}

type PointerKind = "mouse" | "touch" | "keyboard";

export function CardInspection({ card, children, className, desktopHover = false, hoverSize = "scaled", tapDetails = true, action, liveStats, dragHandlers }: CardInspectionProps) {
  const { onClickCapture: swallowClickAfterDrag, ...pointerDragHandlers } = dragHandlers ?? {};
  const [preview, setPreview] = useState<PreviewRect | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  // The input that produced the next click. A touch tap opens details; mouse, pen and keyboard clicks pass through.
  const lastInput = useRef<PointerKind>("mouse");

  const placePreview = (element: HTMLElement) => {
    setPreview(computePreviewRect(element.getBoundingClientRect(), { width: window.innerWidth, height: window.innerHeight }, hoverSize));
  };

  const showDesktopPreview = (event: MouseEvent<HTMLDivElement>) => {
    if (!desktopHover || (window.matchMedia && !window.matchMedia("(hover: hover) and (pointer: fine)").matches)) return;
    placePreview(event.currentTarget);
  };

  const showFocusPreview = (event: FocusEvent<HTMLDivElement>) => {
    if (desktopHover) placePreview(event.currentTarget);
  };

  const insideWrapper = (target: EventTarget | null) => target instanceof Node && Boolean(wrapperRef.current?.contains(target));

  // Pointer events from the popup portal bubble through React to this wrapper; only react to the card itself.
  const rememberPointer = (event: PointerEvent<HTMLDivElement>) => {
    if (!insideWrapper(event.target)) return;
    lastInput.current = isTouchPointer(event) ? "touch" : "mouse";
    if (isTouchPointer(event)) setPreview(null);
  };

  // Fallback for browsers without pointer events.
  const rememberTouch = (event: TouchEvent<HTMLDivElement>) => {
    if (insideWrapper(event.target)) lastInput.current = "touch";
  };

  const rememberKeyboard = (event: KeyboardEvent<HTMLDivElement>) => {
    if (insideWrapper(event.target)) lastInput.current = "keyboard";
  };

  const openDetailsOnTap = (event: MouseEvent<HTMLDivElement>) => {
    swallowClickAfterDrag?.(event);
    if (event.isPropagationStopped()) return;
    if (!tapDetails || lastInput.current !== "touch" || !insideWrapper(event.target)) return;
    event.preventDefault();
    event.stopPropagation();
    setPreview(null);
    setDetailsOpen(true);
  };

  // Block the browser's image/save menu that appears after a long press on a card image.
  const suppressTouchContextMenu = (event: MouseEvent<HTMLDivElement>) => {
    if (lastInput.current === "touch" && insideWrapper(event.target)) event.preventDefault();
  };

  const closeDetails = () => setDetailsOpen(false);
  const hoverPreview = preview && createPortal(
    <div className={`game-card card-${card.kind} game-card-hover-preview${hoverSize === "fixed" ? " game-card-hover-preview--fixed" : ""}`} aria-hidden="true" style={{ left: preview.left, top: preview.top, width: preview.width, height: preview.height }}>
      <span className="card-cost">{card.cost}</span>
      <span className="card-art"><img src={`/art/cards/${card.artKey}.png`} alt="" draggable={false} /></span>
      <strong className="card-name">{card.name}</strong>
      <span className="card-kind">{card.kind === "minion" ? "하수인" : "주문"}</span>
      {card.minion && <span className="card-stats">공격 {card.minion.attack} · 체력 {card.minion.maxHealth}</span>}
      <span className="card-description">{card.description}</span>
    </div>,
    document.body,
  );

  return (
    <div
      ref={wrapperRef}
      className={`card-inspection-target ${className}`}
      {...pointerDragHandlers}
      onMouseEnter={showDesktopPreview}
      onMouseLeave={() => setPreview(null)}
      onFocus={showFocusPreview}
      onBlur={() => setPreview(null)}
      onPointerDownCapture={rememberPointer}
      onTouchStartCapture={rememberTouch}
      onKeyDownCapture={rememberKeyboard}
      onClickCapture={openDetailsOnTap}
      onContextMenu={suppressTouchContextMenu}
    >
      {children}
      {hoverPreview}
      {detailsOpen && <CardDetailsPopup card={card} onClose={closeDetails} {...(action ? { action } : {})} {...(liveStats ? { liveStats } : {})} />}
    </div>
  );
}
