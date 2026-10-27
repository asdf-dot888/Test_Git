import { CARD_BY_ID, type RewardState } from "@board-game/game-core";

interface RewardScreenProps {
  reward: RewardState;
  disabled?: boolean;
  onChoose(cardId: string): void;
  onSkip(): void;
  selectedCardId?: string | null;
}

export function RewardScreen({ reward, disabled = false, onChoose, onSkip, selectedCardId = null }: RewardScreenProps) {
  return (
    <main className="run-screen">
      <section className="run-card reward-screen">
        <button className="dialog-close" type="button" aria-label="닫기" disabled={disabled} onClick={onSkip}>×</button>
        <span className="eyebrow">{reward.tier === "boss" ? "BOSS REWARD" : "BATTLE REWARD"}</span>
        <h1>전리품을 선택하세요</h1>
        <p>덱에 추가할 카드 한 장을 고르거나 보상을 건너뛸 수 있습니다.</p>
        <div className="reward-options">
          {reward.choices.map((cardId) => {
            const card = CARD_BY_ID.get(cardId);
            if (!card) return null;
            return <button className={`reward-card card-${card.kind}${selectedCardId === cardId ? " is-selected" : ""}`} type="button" key={cardId} disabled={disabled || Boolean(selectedCardId)} aria-pressed={selectedCardId === cardId} onClick={() => onChoose(cardId)}>
              <span className="card-cost">{card.cost}</span>
              <span className="reward-art"><img src={`/art/cards/${card.artKey}.png`} alt="" /></span>
              <strong className="reward-name">{card.name}</strong>
              <span className="card-kind">{card.kind === "minion" ? "하수인" : "주문"}</span>
              {card.minion && <span className="reward-stats">공격 {card.minion.attack} · 체력 {card.minion.maxHealth}</span>}
              <small className="reward-description">{card.description}</small>
            </button>;
          })}
          {reward.choices.length === 0 && <p className="empty-reward">추가할 수 있는 카드가 없습니다.</p>}
        </div>
        <button className="skip-reward" type="button" disabled={disabled} onClick={onSkip}>보상 건너뛰기</button>
      </section>
    </main>
  );
}
