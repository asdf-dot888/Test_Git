import { gameConstants, type MinionState, type PlayerSide } from "@board-game/game-core";
import { MinionCard } from "./MinionCard.js";
import { readDragPayload, type DropTarget } from "./dragInteractions.js";

interface MinionLaneProps {
  side: PlayerSide;
  minions: MinionState[];
  selectedAttackerId: string | null;
  targetMode: "none" | "spell" | "attack" | "hero-power";
  targetSide: PlayerSide | null;
  disabled: boolean;
  turnNumber: number;
  onSelectTarget(targetId: string): void;
  onDropTarget?(payload: NonNullable<ReturnType<typeof readDragPayload>>, target: DropTarget): void;
  intentTargetIds?: string[];
}

export function MinionLane({ side, minions, selectedAttackerId, targetMode, targetSide, disabled, turnNumber, onSelectTarget, onDropTarget, intentTargetIds = [] }: MinionLaneProps) {
  const occupied = new Map(minions.map((minion) => [minion.instanceId, minion]));
  return (
    <section className={`minion-lane lane-${side}`} aria-label={`${side === "player" ? "내" : "적"} 하수인 전장`}>
      {Array.from({ length: gameConstants.maxBoard }, (_, index) => {
        const minion = minions[index];
        const attackUnavailable = Boolean(minion && side === "player" && (minion.summonedTurn >= turnNumber || minion.hasAttacked));
        return (
          <div
            className={`lane-slot${minion ? " is-occupied" : ""}`}
            data-effect-anchor={`minion:${side}:${index}`}
            key={`${side}-${index}`}
            onDragOver={(event) => { if (!disabled && onDropTarget && (minion || side === "player")) event.preventDefault(); }}
            onDrop={(event) => {
              if (disabled || !onDropTarget) return;
              const payload = readDragPayload(event);
              if (!payload) return;
              if (!minion && side === "player" && payload.kind === "card") { event.preventDefault(); onDropTarget(payload, { kind: "slot", slotIndex: index }); }
              else if (minion) { event.preventDefault(); onDropTarget(payload, { kind: "minion", side, instanceId: minion.instanceId }); }
            }}
          >
            {minion ? (
              <MinionCard
                minion={minion}
                selected={selectedAttackerId === minion.instanceId}
                targetable={targetMode !== "none" && targetSide === side}
                disabled={disabled || (side === "enemy" && targetMode === "none") || ((targetMode === "spell" || targetMode === "hero-power") && targetSide !== side) || (targetMode === "attack" && side === "enemy" && targetSide !== side)}
                draggable={side === "player" && !disabled}
                intentTarget={intentTargetIds.includes(minion.instanceId)}
                exhausted={attackUnavailable}
                onSelect={() => {
                  if (side === "player" && targetMode === "none" && (minion.summonedTurn >= turnNumber || minion.hasAttacked)) return;
                  onSelectTarget(minion.instanceId);
                }}
              />
            ) : <span className="empty-slot" aria-hidden="true" />}
          </div>
        );
      })}
      <span className="sr-only">{occupied.size} / {gameConstants.maxBoard} 자리 사용 중</span>
    </section>
  );
}
