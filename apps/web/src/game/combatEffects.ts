import { CARD_BY_ID, type PlayerSide, type RunState, type SpellEffect } from "@board-game/game-core";
import type { GameAction } from "./gameActions.js";

export type CombatEffectKind = "attack" | "damage" | "heal" | "buff" | "summon" | "draw" | "impact";

export type CombatAnchor =
  | { kind: "hand"; slot: number }
  | { kind: "hero"; side: PlayerSide }
  | { kind: "minion"; side: PlayerSide; slot: number };

export interface CombatEffectEvent {
  id: number;
  assetCardId: string | null;
  effectKind: CombatEffectKind;
  source: CombatAnchor;
  target: CombatAnchor;
}

function slotOf<T extends { instanceId: string }>(items: readonly T[], instanceId: string): number {
  return items.findIndex((item) => item.instanceId === instanceId);
}

function pushEvent(
  events: CombatEffectEvent[],
  firstEventId: number,
  assetCardId: string | null,
  effectKind: CombatEffectKind,
  source: CombatAnchor,
  target: CombatAnchor,
): void {
  events.push({ id: firstEventId + events.length, assetCardId, effectKind, source, target });
}

function spellTarget(previous: NonNullable<RunState["battle"]>, effect: SpellEffect, targetId?: string): CombatAnchor {
  if (effect.kind === "damage") {
    if (effect.target === "enemyHero") return { kind: "hero", side: "enemy" };
    return { kind: "minion", side: "enemy", slot: Math.max(0, slotOf(previous.enemyBoard, targetId ?? "")) };
  }
  if (effect.kind === "heal") {
    if (effect.target === "playerHero") return { kind: "hero", side: "player" };
    return { kind: "minion", side: "player", slot: Math.max(0, slotOf(previous.playerBoard, targetId ?? "")) };
  }
  if (effect.kind === "buff") {
    return { kind: "minion", side: "player", slot: Math.max(0, slotOf(previous.playerBoard, targetId ?? "")) };
  }
  if (effect.kind === "summon") return { kind: "minion", side: "player", slot: Math.min(4, previous.playerBoard.length) };
  return { kind: "hand", slot: Math.min(9, previous.hand.length) };
}

export function collectCombatEffectEvents(
  previousRun: RunState,
  nextRun: RunState,
  action: GameAction,
  firstEventId: number,
): CombatEffectEvent[] {
  const previous = previousRun.battle;
  const next = nextRun.battle;
  if (!previous || !next) return [];

  const events: CombatEffectEvent[] = [];
  if (action.type === "play-minion") {
    const handSlot = slotOf(previous.hand, action.instanceId);
    const card = previous.hand[handSlot];
    const definition = card ? CARD_BY_ID.get(card.cardId) : undefined;
    if (card && definition?.kind === "minion") {
      const summoned = next.playerBoard.find((minion) => minion.instanceId === card.instanceId);
      const targetSlot = summoned ? slotOf(next.playerBoard, summoned.instanceId) : Math.max(0, previous.playerBoard.length);
      pushEvent(events, firstEventId, card.cardId, "summon", { kind: "hand", slot: handSlot }, { kind: "minion", side: "player", slot: Math.min(4, targetSlot) });
      const effect = definition.minion?.effect;
      if (effect?.kind === "battlecryBuff") {
        const target = effect.target === "self"
          ? summoned
          : next.playerBoard.find((minion) => minion.instanceId !== card.instanceId);
        if (target) {
          pushEvent(events, firstEventId, card.cardId, "buff", { kind: "minion", side: "player", slot: Math.min(4, targetSlot) }, { kind: "minion", side: "player", slot: slotOf(next.playerBoard, target.instanceId) });
        }
      }
      if (effect?.kind === "battlecrySummon") {
        const extra = next.playerBoard.find((minion) => minion.cardId === effect.cardId && !previous.playerBoard.some((old) => old.instanceId === minion.instanceId) && minion.instanceId !== card.instanceId);
        if (extra) pushEvent(events, firstEventId, card.cardId, "summon", { kind: "minion", side: "player", slot: Math.min(4, targetSlot) }, { kind: "minion", side: "player", slot: slotOf(next.playerBoard, extra.instanceId) });
      }
    }
  } else if (action.type === "cast-spell") {
    const handSlot = slotOf(previous.hand, action.instanceId);
    const card = previous.hand[handSlot];
    const definition = card ? CARD_BY_ID.get(card.cardId) : undefined;
    if (card && definition?.kind === "spell") {
      for (const effect of definition.spellEffects ?? []) {
        const kind: CombatEffectKind = effect.kind === "damage" ? "damage" : effect.kind;
        pushEvent(events, firstEventId, card.cardId, kind, { kind: "hand", slot: handSlot }, spellTarget(previous, effect, action.targetId));
      }
    }
  } else if (action.type === "attack") {
    const attackerSlot = slotOf(previous.playerBoard, action.attackerId);
    const attacker = previous.playerBoard[attackerSlot];
    if (attacker) {
      const targetSlot = slotOf(previous.enemyBoard, action.targetId);
      const target: CombatAnchor = targetSlot >= 0
        ? { kind: "minion", side: "enemy", slot: targetSlot }
        : { kind: "hero", side: "enemy" };
      pushEvent(events, firstEventId, attacker.cardId, "attack", { kind: "minion", side: "player", slot: attackerSlot }, target);
    }
  } else if (action.type === "end-turn") {
    const damagedPlayerMinions = new Set<string>();
    for (const attacker of next.enemyBoard) {
      if (!previous.enemyBoard.some((minion) => minion.instanceId === attacker.instanceId)
        || attacker.summonedTurn >= next.turnNumber || !attacker.hasAttacked) continue;
      const target = previous.playerBoard.find((minion) => {
        const after = next.playerBoard.find((candidate) => candidate.instanceId === minion.instanceId);
        return !damagedPlayerMinions.has(minion.instanceId) && (!after || after.health < minion.health);
      });
      if (target) {
        damagedPlayerMinions.add(target.instanceId);
        pushEvent(events, firstEventId, attacker.cardId, "attack", { kind: "minion", side: "enemy", slot: slotOf(previous.enemyBoard, attacker.instanceId) }, { kind: "minion", side: "player", slot: slotOf(previous.playerBoard, target.instanceId) });
      } else if (previous.playerBoard.length === 0) {
        pushEvent(events, firstEventId, attacker.cardId, "attack", { kind: "minion", side: "enemy", slot: slotOf(previous.enemyBoard, attacker.instanceId) }, { kind: "hero", side: "player" });
      }
    }

    const playerHeroDamaged = next.playerHero.health < previous.playerHero.health;
    const minionHitHero = previous.playerBoard.length === 0 && next.enemyBoard.some((attacker) => {
      const before = previous.enemyBoard.find((minion) => minion.instanceId === attacker.instanceId);
      return before && attacker.summonedTurn < next.turnNumber && attacker.hasAttacked;
    });
    if (playerHeroDamaged && !minionHitHero) {
      pushEvent(events, firstEventId, null, "impact", { kind: "hero", side: "enemy" }, { kind: "hero", side: "player" });
    }
  }
  return events;
}
