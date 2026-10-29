import { useRef, useState, type MouseEvent, type PointerEvent, type ReactNode, type TouchEvent } from "react";
import { createPortal } from "react-dom";
import type { CardDefinition } from "@board-game/game-core";
import { CardDetailsPopup } from "./CardDetailsPopup.js";

interface CardInspectionProps {
  card: CardDefinition;
  children: ReactNode;
  className: string;
  desktopHover?: boolean;
}

interface PreviewRect { left: number; top: number; width: number; height: number }

export function CardInspection({ card, children, className, desktopHover = false }: CardInspectionProps) {
  const [preview, setPreview] = useState<PreviewRect | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startPoint = useRef<{ x: number; y: number } | null>(null);
  const longPressTriggered = useRef(false);

  const clearLongPress = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    startPoint.current = null;
  };

  const showDesktopPreview = (event: MouseEvent<HTMLDivElement>) => {
    if (!desktopHover || (window.matchMedia && !window.matchMedia("(hover: hover) and (pointer: fine)").matches)) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const width = Math.min(rect.width * 1.5, Math.max(0, window.innerWidth - 16));
    const height = Math.min(rect.height * 1.5, Math.max(0, window.innerHeight - 16));
    const preferredTop = rect.top - height - 10 >= 8 ? rect.top - height - 10 : rect.bottom + 10;
    const left = Math.min(Math.max(8, rect.left + rect.width / 2 - width / 2), Math.max(8, window.innerWidth - width - 8));
    const top = Math.min(Math.max(8, preferredTop), Math.max(8, window.innerHeight - height - 8));
    setPreview({ left, top, width, height });
  };

  const armLongPress = (x: number, y: number) => {
    clearLongPress();
    startPoint.current = { x, y };
    timer.current = setTimeout(() => {
      longPressTriggered.current = true;
      setPreview(null);
      setDetailsOpen(true);
    }, 500);
  };

  const startTouchInspection = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse") return;
    armLongPress(event.clientX, event.clientY);
  };

  const moveTouchInspection = (event: PointerEvent<HTMLDivElement>) => {
    cancelAfterMovement(event.clientX, event.clientY);
  };

  const startNativeTouchInspection = (event: TouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0];
    if (touch) armLongPress(touch.clientX, touch.clientY);
  };

  const moveNativeTouchInspection = (event: TouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0];
    if (touch) cancelAfterMovement(touch.clientX, touch.clientY);
  };

  const cancelAfterMovement = (x: number, y: number) => {
    const start = startPoint.current;
    if (start && Math.hypot(x - start.x, y - start.y) > 10) clearLongPress();
  };

  const suppressLongPressClick = (event: MouseEvent<HTMLDivElement>) => {
    if (!longPressTriggered.current || !event.currentTarget.contains(event.target as Node)) return;
    event.preventDefault();
    event.stopPropagation();
    longPressTriggered.current = false;
  };

  const closeDetails = () => setDetailsOpen(false);
  const hoverPreview = preview && createPortal(
    <div className={`game-card card-${card.kind} game-card-hover-preview`} aria-hidden="true" style={{ left: preview.left, top: preview.top, width: preview.width, height: preview.height }}>
      <span className="card-cost">{card.cost}</span>
      <span className="card-art"><img src={`/art/cards/${card.artKey}.png`} alt="" /></span>
      <strong className="card-name">{card.name}</strong>
      <span className="card-kind">{card.kind === "minion" ? "하수인" : "주문"}</span>
      {card.minion && <span className="card-stats">공격 {card.minion.attack} · 체력 {card.minion.maxHealth}</span>}
      <span className="card-description">{card.description}</span>
    </div>,
    document.body,
  );

  return (
    <div
      className={`card-inspection-target ${className}`}
      onMouseEnter={showDesktopPreview}
      onMouseLeave={() => setPreview(null)}
      onPointerDown={startTouchInspection}
      onPointerMove={moveTouchInspection}
      onPointerUp={clearLongPress}
      onPointerCancel={clearLongPress}
      onPointerLeave={clearLongPress}
      onTouchStart={startNativeTouchInspection}
      onTouchMove={moveNativeTouchInspection}
      onTouchEnd={clearLongPress}
      onTouchCancel={clearLongPress}
      onClickCapture={suppressLongPressClick}
    >
      {children}
      {hoverPreview}
      {detailsOpen && <CardDetailsPopup card={card} onClose={closeDetails} />}
    </div>
  );
}
