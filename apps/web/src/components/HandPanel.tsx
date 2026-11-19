import { gameConstants, type CardInstance } from "@board-game/game-core";
import { CARD_BY_ID } from "@board-game/game-core";
import { CardView } from "./CardView.js";
import type { DragPayload, DropTarget } from "./dragInteractions.js";
import type { DragState } from "./useTouchDrag.js";

interface HandPanelProps {
  cards: CardInstance[];
  selectedCardInstanceId: string | null;
  currentMana: number;
  boardSize: number;
  disabled: boolean;
  canSelectCard(instance: CardInstance): boolean;
  onSelectCard(instanceId: string): void;
  getValidTargets?(payload: DragPayload): DropTarget[];
  onDropInteraction?(payload: DragPayload, target: DropTarget): void;
  onDragStateChange?(state: DragState | null): void;
}

export function HandPanel({ cards, selectedCardInstanceId, currentMana, boardSize, disabled, canSelectCard, onSelectCard, getValidTargets, onDropInteraction, onDragStateChange }: HandPanelProps) {
  return (
    <section className="hand-panel" aria-label={`내 손패 ${cards.length}장`}>
      <div className="hand-heading"><h2>손패</h2><span>{cards.length} / 10</span></div>
      <div className="hand-cards">
        {cards.slice(0, 10).map((instance, index) => (
          <CardView
            key={instance.instanceId}
            instance={instance}
            effectSlot={index}
            selected={selectedCardInstanceId === instance.instanceId}
            disabled={disabled || !canSelectCard(instance) || (CARD_BY_ID.get(instance.cardId)?.cost ?? Number.POSITIVE_INFINITY) > currentMana || (CARD_BY_ID.get(instance.cardId)?.kind === "minion" && boardSize >= gameConstants.maxBoard)}
            onSelect={() => onSelectCard(instance.instanceId)}
            {...(getValidTargets ? { getValidTargets } : {})}
            {...(onDropInteraction ? { onDropInteraction } : {})}
            {...(onDragStateChange ? { onDragStateChange } : {})}
          />
        ))}
        {cards.length === 0 && <p className="empty-hand">손에 든 카드가 없습니다.</p>}
      </div>
      {currentMana < 0 && <span className="sr-only">마나가 부족한 카드가 비활성화됩니다.</span>}
    </section>
  );
}
