import type { CardInstance } from "@board-game/game-core";
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
}

export function HandPanel({ cards, selectedCardInstanceId, currentMana, boardSize, disabled, canSelectCard, onSelectCard }: HandPanelProps) {
  const selectedInstance = cards.find(({ instanceId }) => instanceId === selectedCardInstanceId);
  const selectedDefinition = selectedInstance ? CARD_BY_ID.get(selectedInstance.cardId) : undefined;
  return (
    <section className="hand-panel" aria-label={`내 손패 ${cards.length}장`}>
      <div className="hand-heading"><h2>손패</h2><span>{cards.length} / 10</span></div>
      {selectedDefinition && <aside className="hand-card-preview" aria-label={`${selectedDefinition.name} 상세 정보`} aria-live="polite">
        <img src={`/art/cards/${selectedDefinition.artKey}.png`} alt="" />
        <div className="hand-card-preview__details">
          <div className="hand-card-preview__meta"><span className="hand-card-preview__cost">비용 {selectedDefinition.cost}</span><span>{selectedDefinition.kind === "minion" ? "하수인" : "주문"}</span></div>
          <strong>{selectedDefinition.name}</strong>
          {selectedDefinition.minion && <span className="hand-card-preview__stats">공격 {selectedDefinition.minion.attack} · 체력 {selectedDefinition.minion.maxHealth}</span>}
          <p>{selectedDefinition.description}</p>
        </div>
      </aside>}
      <div className="hand-cards">
        {cards.slice(0, 10).map((instance, index) => (
          <CardView
            key={instance.instanceId}
            instance={instance}
            effectSlot={index}
            selected={selectedCardInstanceId === instance.instanceId}
            disabled={disabled || !canSelectCard(instance) || (CARD_BY_ID.get(instance.cardId)?.cost ?? Number.POSITIVE_INFINITY) > currentMana || (CARD_BY_ID.get(instance.cardId)?.kind === "minion" && boardSize >= 5)}
            onSelect={() => onSelectCard(instance.instanceId)}
          />
        ))}
        {cards.length === 0 && <p className="empty-hand">손에 든 카드가 없습니다.</p>}
      </div>
      {currentMana < 0 && <span className="sr-only">마나가 부족한 카드가 비활성화됩니다.</span>}
    </section>
  );
}
