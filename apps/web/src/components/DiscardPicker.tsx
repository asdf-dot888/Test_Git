import type { CardInstance } from "@board-game/game-core";
import { CARD_BY_ID } from "@board-game/game-core";

interface DiscardPickerProps {
  cards: CardInstance[];
  disabled: boolean;
  onDiscard(instanceId: string): void;
}

export function DiscardPicker({ cards, disabled, onDiscard }: DiscardPickerProps) {
  return (
    <section className="discard-picker" aria-labelledby="discard-title" aria-modal="true" role="dialog">
      <div className="discard-dialog">
        <span className="eyebrow">손패 정리</span>
        <h2 id="discard-title">새 카드를 뽑기 전에 한 장을 버리세요</h2>
        <p>손패가 10장입니다. 버릴 카드를 직접 선택하면 새 카드 한 장을 뽑습니다.</p>
        <div className="discard-options">
          {cards.map((card) => {
            const definition = CARD_BY_ID.get(card.cardId);
            return <button key={card.instanceId} type="button" disabled={disabled} onClick={() => onDiscard(card.instanceId)}>
              <span className="card-cost">{definition?.cost ?? "?"}</span>
              <strong>{definition?.name ?? "알 수 없는 카드"}</strong>
              <span>{definition?.kind === "minion" ? "하수인" : "주문"}</span>
            </button>;
          })}
        </div>
      </div>
    </section>
  );
}
