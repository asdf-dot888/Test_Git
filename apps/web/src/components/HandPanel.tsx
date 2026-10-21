import type { CardInstance } from "@board-game/game-core";
import { CARD_BY_ID } from "@board-game/game-core";
import { CardView } from "./CardView.js";

interface HandPanelProps {
  cards: CardInstance[];
  selectedCardInstanceId: string | null;
  currentMana: number;
  onSelectCard(instanceId: string): void;
}

export function HandPanel({ cards, selectedCardInstanceId, currentMana, onSelectCard }: HandPanelProps) {
  return (
    <section className="hand-panel" aria-label={`내 손패 ${cards.length}장`}>
      <div className="hand-heading"><h2>손패</h2><span>{cards.length} / 10</span></div>
      <div className="hand-cards">
        {cards.slice(0, 10).map((instance) => (
          <CardView
            key={instance.instanceId}
            instance={instance}
            selected={selectedCardInstanceId === instance.instanceId}
            disabled={(CARD_BY_ID.get(instance.cardId)?.cost ?? Number.POSITIVE_INFINITY) > currentMana}
            onSelect={() => onSelectCard(instance.instanceId)}
          />
        ))}
        {cards.length === 0 && <p className="empty-hand">손에 든 카드가 없습니다.</p>}
      </div>
      {currentMana < 0 && <span className="sr-only">마나가 부족한 카드가 비활성화됩니다.</span>}
    </section>
  );
}
