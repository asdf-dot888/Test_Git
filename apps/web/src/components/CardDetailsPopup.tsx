import { useEffect } from "react";
import { createPortal } from "react-dom";
import type { CardDefinition } from "@board-game/game-core";

export interface CardDetailsAction {
  label: string;
  disabled?: boolean;
  onSelect(): void;
}

export interface CardLiveStats {
  attack: number;
  health: number;
  maxHealth: number;
}

interface CardDetailsPopupProps {
  card: CardDefinition;
  onClose(): void;
  action?: CardDetailsAction;
  /** Current values of a minion on the board; shown instead of the printed stats. */
  liveStats?: CardLiveStats;
}

export function CardDetailsPopup({ card, onClose, action, liveStats }: CardDetailsPopupProps) {
  useEffect(() => {
    const dismissOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", dismissOnEscape);
    return () => window.removeEventListener("keydown", dismissOnEscape);
  }, [onClose]);

  return createPortal(
    <div className="card-details-backdrop" onClick={onClose}>
      <section className="card-details-dialog" role="dialog" aria-modal="true" aria-labelledby="card-details-title" onClick={(event) => event.stopPropagation()}>
        <button className="dialog-close" type="button" aria-label="닫기" onClick={onClose}>×</button>
        <span className="card-cost">{card.cost}</span>
        <img className="card-details-art" src={`/art/cards/${card.artKey}.png`} alt="" draggable={false} />
        <h2 id="card-details-title">{card.name}</h2>
        <span className="card-details-kind">{card.kind === "minion" ? "하수인" : "주문"}</span>
        {liveStats
          ? <strong className="card-details-stats">현재 공격 {liveStats.attack} · 체력 {liveStats.health}/{liveStats.maxHealth}</strong>
          : card.minion && <strong className="card-details-stats">공격 {card.minion.attack} · 체력 {card.minion.maxHealth}</strong>}
        <p>{card.description}</p>
        {action && <button className="menu-primary card-details-action" type="button" disabled={action.disabled} onClick={() => { action.onSelect(); onClose(); }}>{action.label}</button>}
      </section>
    </div>,
    document.body,
  );
}
