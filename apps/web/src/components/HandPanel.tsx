import { gameConstants, type CardInstance } from "@board-game/game-core";
import { CARD_BY_ID } from "@board-game/game-core";
import { CardView } from "./CardView.js";

interface HandPanelProps {
  cards: CardInstance[];
  selectedCardInstanceId: string | null;
  currentMana: number;
  boardSize: number;
  disabled: boolean;
  canSelectCard(instance: CardInstance): boolean;
  onSelectCard(instanceId: string): void;
  redrawAvailable?: boolean;
  redrawDisabled?: boolean;
  onRedraw?(): void;
}

export function HandPanel({ cards, selectedCardInstanceId, currentMana, boardSize, disabled, canSelectCard, onSelectCard, redrawAvailable = false, redrawDisabled = false, onRedraw = () => undefined }: HandPanelProps) {
  return (
    <section className="hand-panel" aria-label={`내 손패 ${cards.length}장`}>
      <div className="hand-heading"><h2>손패</h2>{redrawAvailable && <button className="opening-hand-redraw-button" type="button" disabled={redrawDisabled} onClick={onRedraw}>시작 손패 다시 뽑기</button>}<span>{cards.length} / 10</span></div>
      <div className="hand-cards">
        {cards.slice(0, 10).map((instance, index) => (
          <CardView
            key={instance.instanceId}
            instance={instance}
            effectSlot={index}
            selected={selectedCardInstanceId === instance.instanceId}
            disabled={disabled || !canSelectCard(instance) || (CARD_BY_ID.get(instance.cardId)?.cost ?? Number.POSITIVE_INFINITY) > currentMana || (CARD_BY_ID.get(instance.cardId)?.kind === "minion" && boardSize >= gameConstants.maxBoard)}
            onSelect={() => onSelectCard(instance.instanceId)}
          />
        ))}
        {cards.length === 0 && <p className="empty-hand">손에 든 카드가 없습니다.</p>}
      </div>
      {currentMana < 0 && <span className="sr-only">마나가 부족한 카드가 비활성화됩니다.</span>}
    </section>
  );
}
