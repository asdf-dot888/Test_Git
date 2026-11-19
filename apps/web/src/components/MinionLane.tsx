import type { ReactNode } from "react";
import { CARD_BY_ID, gameConstants, type CardDefinition, type MinionState, type PlayerSide } from "@board-game/game-core";
import { CardInspection } from "./CardInspection.js";
import { MinionCard } from "./MinionCard.js";
import { readDragPayload, type DragPayload, type DropTarget } from "./dragInteractions.js";
import { formatDropTarget } from "./touchDrag.js";
import { useTouchDrag, type DragState } from "./useTouchDrag.js";

export interface DropHighlights {
  valid: DropTarget[];
  hovered: DropTarget | null;
}

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
  /** When false, a finger tap goes to the minion's own action (used while the assassin hero power asks for a target). */
  tapDetails?: boolean;
  /** Touch drag: valid targets are outlined while a card or minion is being dragged. */
  dropHighlights?: DropHighlights;
  getValidTargets?(payload: DragPayload): DropTarget[];
  onDragStateChange?(state: DragState | null): void;
}

interface LaneMinionProps {
  minion: MinionState;
  definition: CardDefinition | undefined;
  draggable: boolean;
  tapDetails: boolean;
  getValidTargets?(payload: DragPayload): DropTarget[];
  onDrop?(payload: DragPayload, target: DropTarget): void;
  onDragStateChange?(state: DragState | null): void;
  children: ReactNode;
}

/** One minion on the lane: details on a finger tap, and (for the player's minions) touch drag. */
function LaneMinion({ minion, definition, draggable, tapDetails, getValidTargets, onDrop, onDragStateChange, children }: LaneMinionProps) {
  const payload: DragPayload = { kind: "minion", instanceId: minion.instanceId };
  const touchDrag = useTouchDrag({
    payload,
    origin: "board",
    enabled: draggable && Boolean(onDrop),
    getValidTargets: () => getValidTargets?.(payload) ?? [],
    onDrop: (dragged, target) => onDrop?.(dragged, target),
    ...(onDragStateChange ? { onDragStateChange } : {}),
    ghost: () => (
      <div className="minion-card minion-friendly">
        <span className="minion-art-frame"><img src={`/art/cards/${definition?.artKey ?? minion.cardId}.png`} alt="" draggable={false} /></span>
        <span className="minion-name">{definition?.name ?? "하수인"}</span>
        <span className="minion-stats"><b>{minion.attack}</b><b>{minion.health}<small>/{minion.maxHealth}</small></b></span>
      </div>
    ),
  });
  if (!definition) return <>{children}</>;
  // A finger tap opens the details popup; mouse clicks still select the attacker or target.
  return (
    <CardInspection card={definition} className="minion-card-inspection" tapDetails={tapDetails} dragHandlers={touchDrag.handlers} liveStats={{ attack: minion.attack, health: minion.health, maxHealth: minion.maxHealth }}>
      {children}
      {touchDrag.ghostPortal}
    </CardInspection>
  );
}

export function MinionLane({ side, minions, selectedAttackerId, targetMode, targetSide, disabled, turnNumber, onSelectTarget, onDropTarget, intentTargetIds = [], tapDetails = true, dropHighlights, getValidTargets, onDragStateChange }: MinionLaneProps) {
  const occupied = new Map(minions.map((minion) => [minion.instanceId, minion]));
  const validKeys = new Set((dropHighlights?.valid ?? []).map(formatDropTarget));
  const hoveredKey = dropHighlights?.hovered ? formatDropTarget(dropHighlights.hovered) : null;
  return (
    <section className={`minion-lane lane-${side}`} aria-label={`${side === "player" ? "내" : "적"} 하수인 전장`}>
      {Array.from({ length: gameConstants.maxBoard }, (_, index) => {
        const minion = minions[index];
        const attackUnavailable = Boolean(minion && side === "player" && (minion.summonedTurn >= turnNumber || minion.hasAttacked || minion.statusEffects?.some((status) => status.kind === "root")));
        const isSelectingAttacker = targetMode === "attack" && selectedAttackerId === null;
        const targetable = !disabled
          && targetMode !== "none"
          && targetSide === side
          && !(isSelectingAttacker && attackUnavailable);
        // Enemy empty slots are never drop targets; every minion and the player's empty slots are.
        const dropTarget: DropTarget | null = minion
          ? { kind: "minion", side, instanceId: minion.instanceId }
          : side === "player" ? { kind: "slot", slotIndex: index } : null;
        const dropKey = dropTarget ? formatDropTarget(dropTarget) : undefined;
        return (
          <div
            className={`lane-slot${minion ? " is-occupied" : ""}${dropKey && validKeys.has(dropKey) ? " is-drop-valid" : ""}${dropKey && dropKey === hoveredKey ? " is-drop-hover" : ""}`}
            data-effect-anchor={`minion:${side}:${index}`}
            {...(dropKey ? { "data-drop-target": dropKey } : {})}
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
              <LaneMinion
                minion={minion}
                definition={CARD_BY_ID.get(minion.cardId)}
                draggable={side === "player" && !disabled}
                tapDetails={tapDetails}
                {...(getValidTargets ? { getValidTargets } : {})}
                {...(onDropTarget ? { onDrop: onDropTarget } : {})}
                {...(onDragStateChange ? { onDragStateChange } : {})}
              >
                <MinionCard
                  minion={minion}
                  selected={selectedAttackerId === minion.instanceId}
                  targetable={targetable}
                  disabled={disabled || (side === "enemy" && targetMode === "none") || ((targetMode === "spell" || targetMode === "hero-power") && targetSide !== side) || (targetMode === "attack" && side === "enemy" && targetSide !== side)}
                  draggable={side === "player" && !disabled}
                  intentTarget={intentTargetIds.includes(minion.instanceId)}
                  exhausted={attackUnavailable && !targetable}
                  onSelect={() => {
                    if (side === "player" && (targetMode === "none" || isSelectingAttacker) && (minion.summonedTurn >= turnNumber || minion.hasAttacked || minion.statusEffects?.some((status) => status.kind === "root"))) return;
                    onSelectTarget(minion.instanceId);
                  }}
                />
              </LaneMinion>
            ) : <span className="empty-slot" aria-hidden="true" />}
          </div>
        );
      })}
      <span className="sr-only">{occupied.size} / {gameConstants.maxBoard} 자리 사용 중</span>
    </section>
  );
}
