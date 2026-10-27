import type { MinionState, PlayerSide } from "@board-game/game-core";
import { MinionCard } from "./MinionCard.js";

interface MinionLaneProps {
  side: PlayerSide;
  minions: MinionState[];
  selectedAttackerId: string | null;
  targetMode: "none" | "spell" | "attack" | "hero-power";
  targetSide: PlayerSide | null;
  disabled: boolean;
  turnNumber: number;
  onSelectTarget(targetId: string): void;
}

export function MinionLane({ side, minions, selectedAttackerId, targetMode, targetSide, disabled, turnNumber, onSelectTarget }: MinionLaneProps) {
  const occupied = new Map(minions.map((minion) => [minion.instanceId, minion]));
  return (
    <section className={`minion-lane lane-${side}`} aria-label={`${side === "player" ? "내" : "적"} 하수인 전장`}>
      {Array.from({ length: 5 }, (_, index) => {
        const minion = minions[index];
        return (
          <div className={`lane-slot${minion ? " is-occupied" : ""}`} data-effect-anchor={`minion:${side}:${index}`} key={`${side}-${index}`}>
            {minion ? (
              <MinionCard
                minion={minion}
                selected={selectedAttackerId === minion.instanceId}
                targetable={targetMode !== "none" && targetSide === side}
                disabled={disabled || (side === "enemy" && targetMode === "none") || ((targetMode === "spell" || targetMode === "hero-power") && targetSide !== side) || (targetMode === "attack" && side === "enemy" && targetSide !== side) || (side === "player" && targetMode !== "spell" && (minion.summonedTurn >= turnNumber || minion.hasAttacked))}
                onSelect={() => onSelectTarget(minion.instanceId)}
              />
            ) : <span className="empty-slot" aria-hidden="true" />}
          </div>
        );
      })}
      <span className="sr-only">{occupied.size} / 5 자리 사용 중</span>
    </section>
  );
}
