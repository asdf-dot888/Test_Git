import { CARD_BY_ID, type EnemyTurnPlaybackStep } from "@board-game/game-core";

function intentDetails(step: EnemyTurnPlaybackStep): { title: string; description: string; target: string; artKey?: string } {
  const { action, beforeRun } = step;
  const battle = beforeRun.battle;
  if (action.type === "boss-area") {
    return {
      title: "\uBCF4\uC2A4\uAC00 \uACF5\uACA9\uD569\uB2C8\uB2E4",
      description: "\uAC15\uB825\uD55C \uAD11\uC5ED \uACF5\uACA9\uC774 \uB2E4\uAC00\uC635\uB2C8\uB2E4. \uBC29\uC5B4\uB97C \uC900\uBE44\uD558\uC138\uC694.",
      target: "",
    };
  }
  const card = CARD_BY_ID.get(action.cardId);
  if (action.type === "attack") {
    const attacker = battle?.enemyBoard.find((minion) => minion.instanceId === action.attackerId);
    const minionTarget = battle?.playerBoard.find((minion) => minion.instanceId === action.targetId);
    const target = minionTarget ? CARD_BY_ID.get(minionTarget.cardId)?.name ?? "아군 하수인" : "내 영웅";
    return {
      title: `${CARD_BY_ID.get(attacker?.cardId ?? action.cardId)?.name ?? "적 하수인"}의 공격`,
      description: `공격력 ${attacker?.attack ?? 0}으로 공격합니다.`,
      target,
      ...(attacker ? { artKey: CARD_BY_ID.get(attacker.cardId)?.artKey ?? attacker.cardId } : {}),
    };
  }
  if (action.type === "play-minion") {
    const definition = card;
    return {
      title: `${definition?.name ?? "적 하수인"} 소환`,
      description: definition?.description ?? "적 하수인을 소환합니다.",
      target: "적 필드",
      ...(definition ? { artKey: definition.artKey } : {}),
    };
  }
  return {
    title: `${card?.name ?? "적 주문"} 시전`,
    description: card?.description ?? "적 주문을 시전합니다.",
    target: action.effects.map((effect) => {
      if (effect.targetId === "player-hero") return "내 영웅";
      const minion = battle?.playerBoard.find((item) => item.instanceId === effect.targetId);
      if (minion) return CARD_BY_ID.get(minion.cardId)?.name ?? "아군 하수인";
      if (!effect.targetId && (effect.kind === "damage" || effect.kind === "randomDamage") && battle?.playerBoard.length === 0) return "내 영웅";
      if (effect.kind === "summon" || effect.kind === "heal" || effect.kind === "buff") return "적 필드";
      return "아군 필드";
    }).filter((value, index, values) => values.indexOf(value) === index).join(", ") || "효과 대상 확인 중",
    ...(card ? { artKey: card.artKey } : {}),
  };
}

export function EnemyIntentPreview({ step }: { step: EnemyTurnPlaybackStep }) {
  const intent = intentDetails(step);
  return (
    <aside className={`enemy-intent-preview${step.action.type === "boss-area" ? " is-boss-warning" : ""}`} role="status" aria-live="assertive" data-testid="enemy-intent-preview">
      {intent.artKey && <img src={`/art/cards/${intent.artKey}.png`} alt="" />}
      <div>
        <span className="enemy-intent-preview__eyebrow">적의 행동 예고</span>
        <strong>{intent.title}</strong>
        <p>{intent.description}</p>
        {intent.target && <small>{intent.target}</small>}
      </div>
    </aside>
  );
}
