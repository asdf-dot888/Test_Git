import { CARD_BY_ID, FUSION_RECIPES, gameConstants, type BattleState, type MinionState, type RunState } from "@board-game/game-core";
import type { DragPayload, DropTarget } from "../components/dragInteractions.js";
import { getPlayerSpellSelection } from "./spellTargeting.js";

/** What a drop turns into. The shapes match the game actions the session dispatches. */
export type DropAction =
  | { type: "play-minion"; instanceId: string; slotIndex: number }
  | { type: "cast-spell"; instanceId: string; targetId: string }
  | { type: "attack"; attackerId: string; targetId: string }
  | { type: "fuse-minions"; firstMinionId: string; secondMinionId: string }
  | { type: "use-hero-power"; targetId: string };

/** Mana cost of a hero power; mirrors the engine (`useHeroPower`) and `HeroPowerControl`. */
export const HERO_POWER_MANA_COST = 2;

/** A friendly minion can attack when it was not summoned this turn, has not attacked, and is not rooted. */
export function canMinionAttack(battle: BattleState, minion: MinionState): boolean {
  return minion.summonedTurn < battle.turnNumber && !minion.hasAttacked && !minion.statusEffects?.some((status) => status.kind === "root");
}

function canAct(battle: BattleState): boolean {
  return battle.activeSide === "player" && battle.status === "active" && !battle.pendingDiscardBeforeDraw;
}

function hasFusionRecipe(run: RunState, firstCardId: string, secondCardId: string): boolean {
  return FUSION_RECIPES.some(({ classId, sourceCardIds }) => classId === run.playerClass
    && ((sourceCardIds[0] === firstCardId && sourceCardIds[1] === secondCardId) || (sourceCardIds[0] === secondCardId && sourceCardIds[1] === firstCardId)));
}

export interface ResolveDropOptions {
  /**
   * PC behavior: a spell dropped on any minion or on the enemy hero is still sent to the game, which rejects a wrong
   * target with its own “현재 선택할 수 없는 대상입니다.” message. Touch drags and highlights use the strict rules.
   */
  surfaceInvalidSpellTargets?: boolean;
}

function resolveCardDrop(run: RunState, battle: BattleState, instanceId: string, target: DropTarget, options: ResolveDropOptions): DropAction | null {
  const instance = battle.hand.find((card) => card.instanceId === instanceId);
  const definition = instance ? CARD_BY_ID.get(instance.cardId) : undefined;
  if (!instance || !definition || definition.cost > battle.playerMana.current) return null;

  if (definition.kind === "minion") {
    if (target.kind !== "slot" || battle.playerBoard.length >= gameConstants.maxBoard) return null;
    // Lane slots fill from the left, so only the slots after the last minion are empty.
    if (target.slotIndex < battle.playerBoard.length || target.slotIndex >= gameConstants.maxBoard) return null;
    return { type: "play-minion", instanceId, slotIndex: target.slotIndex };
  }

  const selection = getPlayerSpellSelection(definition);
  if (target.kind === "minion") {
    const allowed = target.side === "enemy" ? selection === "enemy-minion" || selection === "enemy-character" : selection === "friendly-minion";
    const board = target.side === "enemy" ? battle.enemyBoard : battle.playerBoard;
    if (!(allowed && board.some((minion) => minion.instanceId === target.instanceId)) && !options.surfaceInvalidSpellTargets) return null;
    return { type: "cast-spell", instanceId, targetId: target.instanceId };
  }
  if (target.kind === "hero" && target.side === "enemy") {
    // Spells that pick no target are thrown at the enemy hero; random-damage spells name it explicitly.
    if (selection === null || selection === "enemy-character" || options.surfaceInvalidSpellTargets) {
      return { type: "cast-spell", instanceId, targetId: selection === "enemy-character" ? "enemy-hero" : battle.enemyHero.id };
    }
  }
  return null;
}

function resolveMinionDrop(run: RunState, battle: BattleState, attackerId: string, target: DropTarget): DropAction | null {
  const attacker = battle.playerBoard.find((minion) => minion.instanceId === attackerId);
  if (!attacker) return null;
  if (target.kind === "minion" && target.side === "enemy") {
    if (!canMinionAttack(battle, attacker) || !battle.enemyBoard.some((minion) => minion.instanceId === target.instanceId)) return null;
    return { type: "attack", attackerId, targetId: target.instanceId };
  }
  if (target.kind === "hero" && target.side === "enemy") {
    if (!canMinionAttack(battle, attacker) || battle.enemyBoard.length > 0) return null;
    return { type: "attack", attackerId, targetId: battle.enemyHero.id };
  }
  if (target.kind === "minion" && target.side === "player") {
    const partner = battle.playerBoard.find((minion) => minion.instanceId === target.instanceId);
    if (!partner || partner.instanceId === attacker.instanceId || battle.playerMana.current < 1) return null;
    if (!hasFusionRecipe(run, attacker.cardId, partner.cardId)) return null;
    return { type: "fuse-minions", firstMinionId: attacker.instanceId, secondMinionId: partner.instanceId };
  }
  return null;
}

/**
 * The assassin hero power hits a living enemy minion or the enemy hero. Unlike a minion attack, the hero is a valid
 * target even while enemy minions remain (matches `useHeroPower` in the engine).
 */
function resolveHeroPowerDrop(run: RunState, battle: BattleState, target: DropTarget): DropAction | null {
  if (run.playerClass !== "assassin" || battle.heroPowerUsed || battle.playerMana.current < HERO_POWER_MANA_COST) return null;
  if (target.kind === "minion" && target.side === "enemy") {
    return battle.enemyBoard.some((minion) => minion.instanceId === target.instanceId) ? { type: "use-hero-power", targetId: target.instanceId } : null;
  }
  if (target.kind === "hero" && target.side === "enemy") return { type: "use-hero-power", targetId: "enemy-hero" };
  return null;
}

/** Turns a drag payload dropped on a target into the action to dispatch, or null when the drop is not allowed. */
export function resolveDrop(run: RunState, payload: DragPayload, target: DropTarget, options: ResolveDropOptions = {}): DropAction | null {
  const battle = run.battle;
  if (!battle || !canAct(battle)) return null;
  if (payload.kind === "hero-power") return resolveHeroPowerDrop(run, battle, target);
  return payload.kind === "card"
    ? resolveCardDrop(run, battle, payload.instanceId, target, options)
    : resolveMinionDrop(run, battle, payload.instanceId, target);
}

/** Every target the dragged card or minion may be dropped on right now (used to highlight them). */
export function getValidDropTargets(run: RunState, payload: DragPayload): DropTarget[] {
  const battle = run.battle;
  if (!battle || !canAct(battle)) return [];
  const candidates: DropTarget[] = [
    ...Array.from({ length: gameConstants.maxBoard }, (_, slotIndex): DropTarget => ({ kind: "slot", slotIndex })),
    ...battle.enemyBoard.map((minion): DropTarget => ({ kind: "minion", side: "enemy", instanceId: minion.instanceId })),
    ...battle.playerBoard.map((minion): DropTarget => ({ kind: "minion", side: "player", instanceId: minion.instanceId })),
    { kind: "hero", side: "enemy" },
  ];
  return candidates.filter((target) => resolveDrop(run, payload, target) !== null);
}
