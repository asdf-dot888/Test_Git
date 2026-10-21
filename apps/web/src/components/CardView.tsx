import type { CardInstance } from "@board-game/game-core";
import { CARD_BY_ID } from "@board-game/game-core";

interface CardViewProps {
  instance: CardInstance;
  selected: boolean;
  disabled: boolean;
  onSelect(): void;
}

export function CardView({ instance, selected, disabled, onSelect }: CardViewProps) {
  const card = CARD_BY_ID.get(instance.cardId);
  if (!card) return null;
  return (
    <button className={`game-card card-${card.kind}${selected ? " is-selected" : ""}`} type="button" aria-pressed={selected} disabled={disabled} onClick={onSelect}>
      <span className="card-cost" aria-label={`비용 ${card.cost}`}>{card.cost}</span>
      <span className="card-art"><img src={`/art/cards/${card.artKey}.svg`} alt="" /></span>
      <span className="card-kind">{card.kind === "minion" ? "하수인" : "주문"}</span>
      <strong className="card-name">{card.name}</strong>
      {card.minion && <span className="card-stats">공격 {card.minion.attack} · 체력 {card.minion.maxHealth}</span>}
      <span className="card-description">{card.description}</span>
      <span className="card-select-hint">{selected ? "선택됨" : "선택"}</span>
    </button>
  );
}
