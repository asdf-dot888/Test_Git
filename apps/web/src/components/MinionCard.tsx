import type { MinionState } from "@board-game/game-core";
import { CARD_BY_ID } from "@board-game/game-core";
import { writeDragPayload } from "./dragInteractions.js";

interface MinionCardProps {
  minion: MinionState;
  selected: boolean;
  targetable: boolean;
  disabled: boolean;
  onSelect(): void;
  draggable?: boolean;
  intentTarget?: boolean;
  exhausted?: boolean;
}

export function MinionCard({ minion, selected, targetable, disabled, onSelect, draggable = false, intentTarget = false, exhausted = false }: MinionCardProps) {
  const card = CARD_BY_ID.get(minion.cardId);
  const name = card?.name ?? "알 수 없는 하수인";
  const faction = minion.owner === "enemy" ? "적" : "아군";
  const tooltipId = `minion-ability-${minion.instanceId.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
  return (
    <button
      className={`minion-card ${minion.owner === "enemy" ? "minion-enemy" : "minion-friendly"}${selected ? " is-selected" : ""}${targetable ? " is-targetable" : ""}${intentTarget ? " is-intent-target" : ""}${exhausted ? " is-exhausted" : ""}`}
      type="button"
      disabled={disabled}
      aria-pressed={selected}
      aria-describedby={tooltipId}
      aria-description={exhausted ? "이번 턴에는 공격할 수 없습니다" : undefined}
      aria-label={`${faction} 하수인 ${name}, 공격력 ${minion.attack}, 체력 ${minion.health}/${minion.maxHealth}${minion.hasAttacked ? ", 이번 턴 공격함" : ""}${selected ? ", 공격자로 선택됨" : ""}`}
      draggable={draggable}
      onDragStart={(event) => { if (draggable) writeDragPayload(event, { kind: "minion", instanceId: minion.instanceId }); }}
      onClick={onSelect}
    >
      <span className="minion-art-frame"><img src={`/art/cards/${card?.artKey ?? minion.cardId}.png`} alt="" /></span>
      <span className="minion-name">{name}</span>
      <span className="minion-stats"><b aria-label={`공격력 ${minion.attack}`}>{minion.attack}</b><b aria-label={`체력 ${minion.health}/${minion.maxHealth}`}>{minion.health}<small>/{minion.maxHealth}</small></b></span>
      <span id={tooltipId} className="minion-ability-tooltip" role="tooltip">{card?.description ?? "특수 효과 없음"}</span>
    </button>
  );
}
