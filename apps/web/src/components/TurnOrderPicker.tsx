import { useEffect, useState, type ReactElement } from "react";
import type { TurnOrderRole } from "@board-game/game-core";

export interface TurnOrderPick {
  battleId: string;
  index: 0 | 1;
  role: TurnOrderRole;
}

export interface TurnOrderPickerProps {
  battleId: string;
  /** What is behind each face-down card (known to the game, hidden from the player until a pick). */
  cards: readonly [TurnOrderRole, TurnOrderRole] | undefined;
  /** True while the turn order of this battle is still to be chosen. */
  pending: boolean;
  /** The player's pick of this battle, shown as a short reveal after the engine has dealt the hands. */
  pick: TurnOrderPick | null;
  onPick(index: 0 | 1): void;
}

const REVEAL_VISIBLE_MS = 1_300;
const ROLE_LABEL: Record<TurnOrderRole, string> = { first: "선공", second: "후공" };

/**
 * Two face-down cards at the start of every battle: one hides "선공" (first) and the other "후공" (second). The picked card
 * flips for a moment; while it is revealed the overlay lets clicks through so an enemy-first turn stays visible.
 */
export function TurnOrderPicker({ battleId, cards, pending, pick, onPick }: TurnOrderPickerProps): ReactElement | null {
  const [dismissedBattleId, setDismissedBattleId] = useState<string | null>(null);
  const activePick = pick && pick.battleId === battleId ? pick : null;

  useEffect(() => {
    if (pending || !activePick) return undefined;
    const timeout = window.setTimeout(() => setDismissedBattleId(battleId), REVEAL_VISIBLE_MS);
    return () => window.clearTimeout(timeout);
  }, [activePick, battleId, pending]);

  const revealing = !pending && activePick !== null && dismissedBattleId !== battleId;
  if (!pending && !revealing) return null;
  if (pending && !cards) return null;
  return (
    <div className={`turn-order-picker${revealing ? " is-revealing" : ""}`} role={pending ? "dialog" : "status"} aria-label="선후공 정하기" aria-modal={pending ? "true" : undefined}>
      <div className="turn-order-panel">
        <h2>{revealing && activePick ? (activePick.role === "first" ? "선공입니다" : "후공입니다") : "선후공을 정하세요"}</h2>
        <p>{revealing && activePick ? (activePick.role === "first" ? "내가 먼저 움직입니다." : "상대가 먼저 움직이고, 나는 카드 4장과 동전을 받습니다.") : "뒷면 카드 한 장을 고르세요. 선공: 시작 손패 3장 · 후공: 4장과 동전"}</p>
        <div className="turn-order-cards">
          {([0, 1] as const).map((index) => {
            const picked = activePick?.index === index;
            const role = picked ? activePick.role : cards?.[index];
            return (
              <button
                key={index}
                type="button"
                className={`turn-order-card${picked ? " is-picked" : ""}${activePick && !picked ? " is-other" : ""}`}
                disabled={!pending}
                aria-label={picked && role ? `카드 ${index + 1}, ${ROLE_LABEL[role]}` : `카드 ${index + 1} 선택`}
                onClick={() => onPick(index)}
              >
                <span className="turn-order-card-face">{picked && role ? ROLE_LABEL[role] : "✦"}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
