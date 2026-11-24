import type { CardInstance } from "@board-game/game-core";
import { CARD_BY_ID } from "@board-game/game-core";
import { CardDescription } from "./CardDescription.js";
import { CardInspection } from "./CardInspection.js";
import { writeDragPayload, type DragPayload, type DropTarget } from "./dragInteractions.js";
import { useTouchDrag, type DragState } from "./useTouchDrag.js";

interface CardViewProps {
  instance: CardInstance;
  effectSlot?: number;
  selected: boolean;
  disabled: boolean;
  onSelect(): void;
  /** Touch drag: where this card may be dropped, what happens on a drop, and drag progress for highlighting. */
  getValidTargets?(payload: DragPayload): DropTarget[];
  onDropInteraction?(payload: DragPayload, target: DropTarget): void;
  onDragStateChange?(state: DragState | null): void;
}

export function CardView({ instance, effectSlot, selected, disabled, onSelect, getValidTargets, onDropInteraction, onDragStateChange }: CardViewProps) {
  const card = CARD_BY_ID.get(instance.cardId);
  const payload: DragPayload = { kind: "card", instanceId: instance.instanceId };
  const touchDrag = useTouchDrag({
    payload,
    origin: "hand",
    enabled: !disabled && Boolean(card) && Boolean(onDropInteraction),
    getValidTargets: () => getValidTargets?.(payload) ?? [],
    onDrop: (dragged, target) => onDropInteraction?.(dragged, target),
    ...(onDragStateChange ? { onDragStateChange } : {}),
    ghost: () => card && (
      <div className={`game-card card-${card.kind}`}>
        <span className="card-cost">{card.cost}</span>
        <span className="card-art"><img src={`/art/cards/${card.artKey}.png`} alt="" draggable={false} /></span>
        <strong className="card-name">{card.name}</strong>
      </div>
    ),
  });
  if (!card) return null;

  return (
    <CardInspection card={card} className="hand-card-inspection" desktopHover dragHandlers={touchDrag.handlers}>
      <button className={`game-card card-${card.kind}${selected ? " is-selected" : ""}`} data-effect-anchor={effectSlot === undefined ? undefined : `hand:player:${effectSlot}`} data-effect-instance-id={instance.instanceId} data-effect-card-id={instance.cardId} type="button" aria-pressed={selected} disabled={disabled} draggable={!disabled} onDragStart={(event) => writeDragPayload(event, payload)} onClick={onSelect}>
        <span className="card-cost" aria-label={`비용 ${card.cost}`}>{card.cost}</span>
        <span className="card-art"><img src={`/art/cards/${card.artKey}.png`} alt="" draggable={false} /></span>
        <strong className="card-name">{card.name}</strong>
        <span className="card-kind">{card.kind === "minion" ? "하수인" : "주문"}</span>
        {card.minion && <span className="card-stats">공격 {card.minion.attack} · 체력 {card.minion.maxHealth}</span>}
        <span className="card-description"><CardDescription text={card.description} /></span>
        <span className="card-select-hint">{selected ? "선택됨" : "선택"}</span>
      </button>
      {touchDrag.ghostPortal}
    </CardInspection>
  );
}
