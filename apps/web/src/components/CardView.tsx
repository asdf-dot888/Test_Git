import { useEffect, useState, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import type { CardInstance } from "@board-game/game-core";
import { CARD_BY_ID } from "@board-game/game-core";
import { writeDragPayload } from "./dragInteractions.js";

interface CardViewProps {
  instance: CardInstance;
  effectSlot?: number;
  selected: boolean;
  disabled: boolean;
  onSelect(): void;
}

export function CardView({ instance, effectSlot, selected, disabled, onSelect }: CardViewProps) {
  const [previewPosition, setPreviewPosition] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
  const card = CARD_BY_ID.get(instance.cardId);
  useEffect(() => {
    if (!previewPosition) return;
    const dismiss = () => setPreviewPosition(null);
    window.addEventListener("resize", dismiss);
    window.addEventListener("scroll", dismiss, true);
    return () => {
      window.removeEventListener("resize", dismiss);
      window.removeEventListener("scroll", dismiss, true);
    };
  }, [previewPosition]);
  if (!card) return null;

  const showPreview = (event: MouseEvent<HTMLButtonElement>) => {
    if (window.matchMedia && !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const width = Math.min(rect.width * 1.5, Math.max(0, window.innerWidth - 16));
    const height = Math.min(rect.height * 1.5, Math.max(0, window.innerHeight - 16));
    const preferredTop = rect.top - height - 10 >= 8 ? rect.top - height - 10 : rect.bottom + 10;
    const left = Math.min(Math.max(8, rect.left + rect.width / 2 - width / 2), Math.max(8, window.innerWidth - width - 8));
    const top = Math.min(Math.max(8, preferredTop), Math.max(8, window.innerHeight - height - 8));
    setPreviewPosition({ left, top, width, height });
  };

  const hoverPreview = previewPosition && createPortal(
    <div className={`game-card card-${card.kind} game-card-hover-preview`} aria-hidden="true" style={{ left: previewPosition.left, top: previewPosition.top, width: previewPosition.width, height: previewPosition.height }}>
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
    <>
    <button className={`game-card card-${card.kind}${selected ? " is-selected" : ""}`} data-effect-anchor={effectSlot === undefined ? undefined : `hand:player:${effectSlot}`} data-effect-instance-id={instance.instanceId} data-effect-card-id={instance.cardId} type="button" aria-pressed={selected} disabled={disabled} draggable={!disabled} onDragStart={(event) => writeDragPayload(event, { kind: "card", instanceId: instance.instanceId })} onClick={onSelect} onMouseEnter={showPreview} onMouseLeave={() => setPreviewPosition(null)}>
      <span className="card-cost" aria-label={`비용 ${card.cost}`}>{card.cost}</span>
      <span className="card-art"><img src={`/art/cards/${card.artKey}.png`} alt="" /></span>
      <strong className="card-name">{card.name}</strong>
      <span className="card-kind">{card.kind === "minion" ? "하수인" : "주문"}</span>
      {card.minion && <span className="card-stats">공격 {card.minion.attack} · 체력 {card.minion.maxHealth}</span>}
      <span className="card-description">{card.description}</span>
      <span className="card-select-hint">{selected ? "선택됨" : "선택"}</span>
    </button>
    {hoverPreview}
    </>
  );
}
