import type { MinionState } from "@board-game/game-core";
import { CARD_BY_ID } from "@board-game/game-core";

interface MinionCardProps {
  minion: MinionState;
  selected: boolean;
  targetable: boolean;
  disabled: boolean;
  onSelect(): void;
}

export function MinionCard({ minion, selected, targetable, disabled, onSelect }: MinionCardProps) {
  const card = CARD_BY_ID.get(minion.cardId);
  const name = card?.name ?? "알 수 없는 하수인";
  const faction = minion.owner === "enemy" ? "적" : "아군";
  return (
    <button
      className={`minion-card ${minion.owner === "enemy" ? "minion-enemy" : "minion-friendly"}${selected ? " is-selected" : ""}${targetable ? " is-targetable" : ""}`}
      type="button"
      disabled={disabled}
      aria-pressed={selected}
      aria-label={`${faction} 하수인 ${name}, 공격력 ${minion.attack}, 체력 ${minion.health}/${minion.maxHealth}${minion.hasAttacked ? ", 이번 턴 공격함" : ""}${selected ? ", 공격자로 선택됨" : ""}`}
      onClick={onSelect}
    >
      <span className="minion-art-frame"><img src={`/art/cards/${card?.artKey ?? minion.cardId}.png`} alt="" /></span>
      <span className="minion-name">{name}</span>
      <span className="minion-stats"><b aria-label={`공격력 ${minion.attack}`}>{minion.attack}</b><b aria-label={`체력 ${minion.health}/${minion.maxHealth}`}>{minion.health}<small>/{minion.maxHealth}</small></b></span>
    </button>
  );
}
