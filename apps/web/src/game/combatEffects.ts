import { CARD_BY_ID, ENEMY_BY_ID, type PlayerSide, type RunState, type SpellEffect } from "@board-game/game-core";
import type { GameAction } from "./gameActions.js";
import type { SoundEffectKind } from "./audio.js";

export type CombatEffectKind = "attack" | "damage" | "heal" | "buff" | "summon" | "draw" | "impact";

export type CombatAnchor =
  | { kind: "hand"; slot: number; instanceId?: string }
  | { kind: "hero"; side: PlayerSide }
  | { kind: "minion"; side: PlayerSide; slot: number };

export interface CombatEffectEvent {
  id: number;
  assetCardId: string | null;
  effectKind: CombatEffectKind;
  soundCues: SoundEffectKind[];
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
  soundCues: SoundEffectKind[] = [],
): void {
  events.push({ id: firstEventId + events.length, assetCardId, effectKind, soundCues: [...new Set(soundCues)], source, target });
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
  if (!previous) return [];
  const next = nextRun.battle ?? previous;

  const events: CombatEffectEvent[] = [];
  const previousCharge = previous.pendingEnemyCharge ?? null;
  const chargeReleased = action.type === "end-turn" && previousCharge !== null && (nextRun.battle?.pendingEnemyCharge ?? null) === null;
  const bossChargeReleased = chargeReleased && ENEMY_BY_ID.get(previous.enemyId)?.kind === "boss" && previousCharge.target === "board-and-hero";
  if (action.type === "play-minion") {
    const handSlot = slotOf(previous.hand, action.instanceId);
    const card = previous.hand[handSlot];
    const definition = card ? CARD_BY_ID.get(card.cardId) : undefined;
    if (card && definition?.kind === "minion") {
      const summoned = next.playerBoard.find((minion) => minion.instanceId === card.instanceId);
      const targetSlot = summoned ? slotOf(next.playerBoard, summoned.instanceId) : Math.max(0, previous.playerBoard.length);
      pushEvent(events, firstEventId, card.cardId, "summon", { kind: "hand", slot: handSlot, instanceId: card.instanceId }, { kind: "minion", side: "player", slot: Math.min(4, targetSlot) }, ["summon"]);
      const effect = definition.minion?.effect;
      if (effect?.kind === "battlecryBuff") {
        const target = effect.target === "self"
          ? summoned
          : next.playerBoard.find((minion) => minion.instanceId !== card.instanceId);
        if (target) {
          pushEvent(events, firstEventId, card.cardId, "buff", { kind: "minion", side: "player", slot: Math.min(4, targetSlot) }, { kind: "minion", side: "player", slot: slotOf(next.playerBoard, target.instanceId) }, ["spell"]);
        }
      }
      if (effect?.kind === "battlecrySummon") {
        const extra = next.playerBoard.find((minion) => minion.cardId === effect.cardId && !previous.playerBoard.some((old) => old.instanceId === minion.instanceId) && minion.instanceId !== card.instanceId);
        if (extra) pushEvent(events, firstEventId, card.cardId, "summon", { kind: "minion", side: "player", slot: Math.min(4, targetSlot) }, { kind: "minion", side: "player", slot: slotOf(next.playerBoard, extra.instanceId) }, ["summon"]);
      }
    }
  } else if (action.type === "cast-spell") {
    const handSlot = slotOf(previous.hand, action.instanceId);
    const card = previous.hand[handSlot];
    const definition = card ? CARD_BY_ID.get(card.cardId) : undefined;
    if (card && definition?.kind === "spell") {
      for (const effect of definition.spellEffects ?? []) {
        const kind: CombatEffectKind = effect.kind === "damage" ? "damage" : effect.kind;
        const cues: SoundEffectKind[] = effect.kind === "summon" ? ["summon"] : ["spell"];
        if (effect.kind === "damage") {
          cues.push("damage");
          if (effect.target === "enemyMinion" && !next.enemyBoard.some((minion) => minion.instanceId === action.targetId)) cues.push("death");
        } else if (effect.kind === "heal") {
          cues.push("heal");
        }
        pushEvent(events, firstEventId, card.cardId, kind, { kind: "hand", slot: handSlot, instanceId: card.instanceId }, spellTarget(previous, effect, action.targetId), cues);
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
      const targetDied = targetSlot >= 0 && !next.enemyBoard.some((minion) => minion.instanceId === action.targetId);
      pushEvent(events, firstEventId, attacker.cardId, "attack", { kind: "minion", side: "player", slot: attackerSlot }, target, targetDied ? ["minion-attack", "damage", "death"] : ["minion-attack", "damage"]);
    }
  } else if (action.type === "end-turn") {
    const damagedPlayerMinions = new Set<string>();
    next.enemyBoard.forEach((minion, slot) => {
      if (previous.enemyBoard.some((old) => old.instanceId === minion.instanceId)) return;
      pushEvent(events, firstEventId, minion.cardId, "summon", { kind: "hero", side: "enemy" }, { kind: "minion", side: "enemy", slot }, ["summon"]);
    });
    const boardEmptyAfterCharge = bossChargeReleased
      && previous.playerBoard.every((minion) => minion.health <= previousCharge.damage)
      && next.playerBoard.length === 0;
    for (const attacker of next.enemyBoard) {
      if (!previous.enemyBoard.some((minion) => minion.instanceId === attacker.instanceId)
        || attacker.summonedTurn >= next.turnNumber || !attacker.hasAttacked) continue;
      const target = previous.playerBoard.find((minion) => {
        if (bossChargeReleased && minion.health <= previousCharge.damage) return false;
        const after = next.playerBoard.find((candidate) => candidate.instanceId === minion.instanceId);
        const expectedAfterCharge = minion.health - (bossChargeReleased ? previousCharge.damage : 0);
        return !damagedPlayerMinions.has(minion.instanceId) && (!after || after.health < expectedAfterCharge);
      });
      if (target) {
        damagedPlayerMinions.add(target.instanceId);
        const targetDied = !next.playerBoard.some((minion) => minion.instanceId === target.instanceId);
        pushEvent(events, firstEventId, attacker.cardId, "attack", { kind: "minion", side: "enemy", slot: slotOf(previous.enemyBoard, attacker.instanceId) }, { kind: "minion", side: "player", slot: slotOf(previous.playerBoard, target.instanceId) }, targetDied ? ["minion-attack", "damage", "death"] : ["minion-attack", "damage"]);
      } else if (previous.playerBoard.length === 0 || boardEmptyAfterCharge) {
        pushEvent(events, firstEventId, attacker.cardId, "attack", { kind: "minion", side: "enemy", slot: slotOf(previous.enemyBoard, attacker.instanceId) }, { kind: "hero", side: "player" }, ["minion-attack", "damage"]);
      }
    }

    const playerHeroDamaged = next.playerHero.health < previous.playerHero.health || nextRun.status === "defeat";
    const minionHitHero = (previous.playerBoard.length === 0 || boardEmptyAfterCharge) && next.enemyBoard.some((attacker) => {
      const before = previous.enemyBoard.find((minion) => minion.instanceId === attacker.instanceId);
      return before && attacker.summonedTurn < next.turnNumber && attacker.hasAttacked;
    });
    if (playerHeroDamaged && !minionHitHero && !bossChargeReleased) {
      pushEvent(events, firstEventId, null, "impact", { kind: "hero", side: "enemy" }, { kind: "hero", side: "player" }, ["damage"]);
    }
  }

  if (bossChargeReleased && previousCharge) {
    previous.playerBoard.forEach((minion, slot) => {
      const after = next.playerBoard.find((candidate) => candidate.instanceId === minion.instanceId);
      if (!after || after.health < minion.health) {
        pushEvent(events, firstEventId, null, "damage", { kind: "hero", side: "enemy" }, { kind: "minion", side: "player", slot }, next.playerBoard.some((candidate) => candidate.instanceId === minion.instanceId) ? ["damage"] : ["damage", "death"]);
      }
    });
    if (next.playerHero.health < previous.playerHero.health) {
      pushEvent(events, firstEventId, null, "damage", { kind: "hero", side: "enemy" }, { kind: "hero", side: "player" }, ["damage"]);
    }
  }
  return events;
}
