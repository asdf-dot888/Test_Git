import { CARD_BY_ID, type EnemyCombatRecord, type PlayerSide, type RunState, type SpellEffect } from "@board-game/game-core";
import type { GameAction } from "./gameActions.js";
import type { SoundEffectKind } from "./audio.js";

export type CombatEffectKind = "attack" | "damage" | "heal" | "buff" | "mana" | "summon" | "draw" | "impact";

export type CombatAnchor =
  | { kind: "hand"; side: PlayerSide; slot: number; instanceId?: string }
  | { kind: "hero"; side: PlayerSide }
  | { kind: "minion"; side: PlayerSide; slot: number };

export interface CombatEffectEvent {
  id: number;
  assetCardId: string | null;
  effectKind: CombatEffectKind;
  soundCues: SoundEffectKind[];
  source: CombatAnchor;
  target: CombatAnchor;
  areaImpact?: boolean;
}

function slotOf<T extends { instanceId: string }>(items: readonly T[], instanceId: string): number {
  return items.findIndex((item) => item.instanceId === instanceId);
}

function pushEvent(events: CombatEffectEvent[], firstEventId: number, assetCardId: string | null, effectKind: CombatEffectKind, source: CombatAnchor, target: CombatAnchor, soundCues: SoundEffectKind[] = [], areaImpact = false): void {
  events.push({ id: firstEventId + events.length, assetCardId, effectKind, soundCues: [...new Set(soundCues)], source, target, ...(areaImpact ? { areaImpact: true } : {}) });
}

function playerSpellTarget(battle: NonNullable<RunState["battle"]>, effect: SpellEffect, targetId?: string): CombatAnchor {
  if (effect.kind === "gainMana") return { kind: "hero", side: "player" };
  if (effect.kind === "randomDamage") {
    return targetId === "enemy-hero"
      ? { kind: "hero", side: "enemy" }
      : { kind: "minion", side: "enemy", slot: Math.max(0, slotOf(battle.enemyBoard, targetId ?? "")) };
  }
  if (effect.kind === "damage") {
    if (effect.target === "enemyHero") return { kind: "hero", side: "enemy" };
    return { kind: "minion", side: "enemy", slot: Math.max(0, slotOf(battle.enemyBoard, targetId ?? "")) };
  }
  if (effect.kind === "cleave") return { kind: "minion", side: "enemy", slot: Math.max(0, slotOf(battle.enemyBoard, targetId ?? "")) };
  if (effect.kind === "heal") {
    if (effect.target === "playerHero") return { kind: "hero", side: "player" };
    return { kind: "minion", side: "player", slot: Math.max(0, slotOf(battle.playerBoard, targetId ?? "")) };
  }
  if (effect.kind === "buff") return { kind: "minion", side: "player", slot: Math.max(0, slotOf(battle.playerBoard, targetId ?? "")) };
  if (effect.kind === "summon") return { kind: "minion", side: "player", slot: Math.min(4, battle.playerBoard.length) };
  return { kind: "hand", side: "player", slot: Math.min(9, battle.hand.length) };
}

function enemySpellTarget(battle: NonNullable<RunState["battle"]>, effect: SpellEffect, targetId?: string): CombatAnchor {
  if (effect.kind === "gainMana") return { kind: "hero", side: "enemy" };
  if (effect.kind === "randomDamage") {
    return targetId
      ? { kind: "minion", side: "player", slot: Math.max(0, slotOf(battle.playerBoard, targetId)) }
      : { kind: "hero", side: "player" };
  }
  if (effect.kind === "damage") {
    return targetId
      ? { kind: "minion", side: "player", slot: Math.max(0, slotOf(battle.playerBoard, targetId)) }
      : { kind: "hero", side: "player" };
  }
  if (effect.kind === "cleave") return { kind: "minion", side: "player", slot: Math.max(0, slotOf(battle.playerBoard, targetId ?? "")) };
  if (effect.kind === "heal") {
    return effect.target === "playerHero"
      ? { kind: "hero", side: "enemy" }
      : { kind: "minion", side: "enemy", slot: Math.max(0, slotOf(battle.enemyBoard, targetId ?? "")) };
  }
  if (effect.kind === "buff") return { kind: "minion", side: "enemy", slot: Math.max(0, slotOf(battle.enemyBoard, targetId ?? "")) };
  if (effect.kind === "summon") return { kind: "minion", side: "enemy", slot: Math.min(4, battle.enemyBoard.length) };
  return { kind: "hand", side: "enemy", slot: Math.min(9, battle.enemyHand.length) };
}

function collectEnemyTurnEvents(events: CombatEffectEvent[], firstEventId: number, records: readonly EnemyCombatRecord[], previous: NonNullable<RunState["battle"]>, next: NonNullable<RunState["battle"]>): void {
  for (const record of records) {
    if (record.type === "play-minion") {
      const summoned = record.summonedIds.map((instanceId) => next.enemyBoard.find((minion) => minion.instanceId === instanceId)).filter((minion) => minion !== undefined);
      const source: CombatAnchor = { kind: "hand", side: "enemy", slot: record.handSlot, instanceId: record.instanceId };
      const first = summoned[0];
      const firstSlot = first ? slotOf(next.enemyBoard, first.instanceId) : Math.min(4, previous.enemyBoard.length);
      pushEvent(events, firstEventId, record.cardId, "summon", source, { kind: "minion", side: "enemy", slot: Math.max(0, firstSlot) }, ["summon"]);
      for (const extra of summoned.slice(1)) {
        pushEvent(events, firstEventId, record.cardId, "summon", { kind: "minion", side: "enemy", slot: Math.max(0, firstSlot) }, { kind: "minion", side: "enemy", slot: slotOf(next.enemyBoard, extra.instanceId) }, ["summon"]);
      }
      continue;
    }
    if (record.type === "cast-spell") {
      const definition = CARD_BY_ID.get(record.cardId);
      for (const [index, logged] of record.effects.entries()) {
        const effect = definition?.spellEffects?.[index];
        if (!effect) continue;
        const kind: CombatEffectKind = effect.kind === "damage" || effect.kind === "randomDamage" || effect.kind === "cleave"
          ? "damage"
          : effect.kind === "gainMana" ? "mana"
            : effect.kind === "stealFromOpponentDeck" ? "draw" : effect.kind;
        const cues: SoundEffectKind[] = effect.kind === "summon" ? ["summon"] : ["spell"];
        if (effect.kind === "damage" || effect.kind === "randomDamage" || effect.kind === "cleave") {
          cues.push("damage");
          if (logged.targetId && !next.playerBoard.some((minion) => minion.instanceId === logged.targetId)) cues.push("death");
        } else if (effect.kind === "heal") cues.push("heal");
        pushEvent(events, firstEventId, record.cardId, kind,
          { kind: "hand", side: "enemy", slot: record.handSlot, instanceId: record.instanceId },
          enemySpellTarget(previous, effect, logged.targetId ?? undefined), cues, effect.kind === "cleave");
      }
      continue;
    }
    if (record.type === "attack") {
      const attackerSlot = slotOf(previous.enemyBoard, record.attackerId);
      const targetSlot = slotOf(previous.playerBoard, record.targetId);
      const target: CombatAnchor = targetSlot >= 0
        ? { kind: "minion", side: "player", slot: targetSlot }
        : { kind: "hero", side: "player" };
      const targetDied = targetSlot >= 0 && !next.playerBoard.some((minion) => minion.instanceId === record.targetId);
      pushEvent(events, firstEventId, record.cardId, "attack",
        { kind: "minion", side: "enemy", slot: Math.max(0, attackerSlot) }, target,
        targetDied ? ["minion-attack", "damage", "death"] : ["minion-attack", "damage"]);
      if (targetSlot >= 0) {
        const attackerDied = !next.enemyBoard.some((minion) => minion.instanceId === record.attackerId);
        const defender = previous.playerBoard[targetSlot];
        pushEvent(events, firstEventId, defender?.cardId ?? null, "attack",
          { kind: "minion", side: "player", slot: targetSlot },
          { kind: "minion", side: "enemy", slot: Math.max(0, attackerSlot) },
          attackerDied ? ["minion-attack", "damage", "death"] : ["minion-attack", "damage"]);
      }
      continue;
    }
    pushEvent(events, firstEventId, null, "impact", { kind: "hero", side: "enemy" }, { kind: "hero", side: "player" }, ["damage"], true);
  }
}

export function collectEnemyActionEffects(
  beforeRun: RunState,
  presentationRun: RunState,
  action: EnemyCombatRecord,
  firstEventId: number,
): CombatEffectEvent[] {
  const previous = beforeRun.battle;
  const next = presentationRun.battle;
  if (!previous || !next) return [];
  const events: CombatEffectEvent[] = [];
  collectEnemyTurnEvents(events, firstEventId, [action], previous, next);
  return events;
}

export function collectCombatEffectEvents(previousRun: RunState, nextRun: RunState, action: GameAction, firstEventId: number): CombatEffectEvent[] {
  const previous = previousRun.battle;
  if (!previous) return [];
  const next = nextRun.battle ?? previous;
  const events: CombatEffectEvent[] = [];
  const enemyRecords = action.type === "end-turn" ? nextRun.battle?.enemyTurnEvents : undefined;
  if (enemyRecords?.length) {
    collectEnemyTurnEvents(events, firstEventId, enemyRecords, previous, next);
    return events;
  }

  if (action.type === "play-minion") {
    const handSlot = slotOf(previous.hand, action.instanceId);
    const card = previous.hand[handSlot];
    const definition = card ? CARD_BY_ID.get(card.cardId) : undefined;
    if (card && definition?.kind === "minion") {
      const summoned = next.playerBoard.find((minion) => minion.instanceId === card.instanceId);
      const targetSlot = summoned ? slotOf(next.playerBoard, summoned.instanceId) : Math.max(0, previous.playerBoard.length);
      pushEvent(events, firstEventId, card.cardId, "summon", { kind: "hand", side: "player", slot: handSlot, instanceId: card.instanceId }, { kind: "minion", side: "player", slot: Math.min(4, targetSlot) }, ["summon"]);
      const effect = definition.minion?.effect;
      if (effect?.kind === "battlecryBuff") {
        const target = effect.target === "self" ? summoned : next.playerBoard.find((minion) => minion.instanceId !== card.instanceId);
        if (target) pushEvent(events, firstEventId, card.cardId, "buff", { kind: "minion", side: "player", slot: Math.min(4, targetSlot) }, { kind: "minion", side: "player", slot: slotOf(next.playerBoard, target.instanceId) }, ["spell"]);
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
        const kind: CombatEffectKind = effect.kind === "damage" || effect.kind === "randomDamage" || effect.kind === "cleave"
          ? "damage"
          : effect.kind === "gainMana" ? "mana"
            : effect.kind === "stealFromOpponentDeck" ? "draw" : effect.kind;
        const cues: SoundEffectKind[] = effect.kind === "summon" ? ["summon"] : ["spell"];
        if (effect.kind === "damage" || effect.kind === "randomDamage" || effect.kind === "cleave") {
          cues.push("damage");
          if (effect.kind === "damage" && effect.target === "enemyMinion" && !next.enemyBoard.some((minion) => minion.instanceId === action.targetId)) cues.push("death");
          if (effect.kind === "randomDamage" && action.targetId !== "enemy-hero" && !next.enemyBoard.some((minion) => minion.instanceId === action.targetId)) cues.push("death");
        } else if (effect.kind === "heal") cues.push("heal");
        pushEvent(events, firstEventId, card.cardId, kind, { kind: "hand", side: "player", slot: handSlot, instanceId: card.instanceId }, playerSpellTarget(previous, effect, action.targetId), cues, effect.kind === "cleave");
      }
    }
  } else if (action.type === "attack") {
    const attackerSlot = slotOf(previous.playerBoard, action.attackerId);
    const attacker = previous.playerBoard[attackerSlot];
    if (attacker) {
      const targetSlot = slotOf(previous.enemyBoard, action.targetId);
      const target: CombatAnchor = targetSlot >= 0 ? { kind: "minion", side: "enemy", slot: targetSlot } : { kind: "hero", side: "enemy" };
      const targetDied = targetSlot >= 0 && !next.enemyBoard.some((minion) => minion.instanceId === action.targetId);
      pushEvent(events, firstEventId, attacker.cardId, "attack", { kind: "minion", side: "player", slot: attackerSlot }, target, targetDied ? ["minion-attack", "damage", "death"] : ["minion-attack", "damage"]);
    }
  } else if (action.type === "use-hero-power") {
    const playerClass = previousRun.playerClass;
    if (playerClass === "warrior") {
      pushEvent(events, firstEventId, null, "buff", { kind: "hero", side: "player" }, { kind: "hero", side: "player" }, ["spell"]);
    } else if (playerClass === "assassin") {
      const targetId = action.targetId;
      const targetSlot = targetId && targetId !== "enemy-hero" ? slotOf(previous.enemyBoard, targetId) : -1;
      const target: CombatAnchor = targetId === "enemy-hero" || targetSlot < 0
        ? { kind: "hero", side: "enemy" }
        : { kind: "minion", side: "enemy", slot: targetSlot };
      const targetDied = targetSlot >= 0 && !next.enemyBoard.some((minion) => minion.instanceId === targetId);
      pushEvent(events, firstEventId, null, "damage", { kind: "hero", side: "player" }, target, targetDied ? ["spell", "damage", "death"] : ["spell", "damage"]);
    } else if (playerClass === "demonist") {
      const summoned = next.playerBoard.find((minion) => !previous.playerBoard.some((old) => old.instanceId === minion.instanceId));
      if (summoned) pushEvent(events, firstEventId, summoned.cardId, "summon", { kind: "hero", side: "player" }, { kind: "minion", side: "player", slot: slotOf(next.playerBoard, summoned.instanceId) }, ["summon"]);
    }
  } else if (action.type === "end-turn" && nextRun.battle) {
    if (next.playerHero.health < previous.playerHero.health) {
      pushEvent(events, firstEventId, null, "impact", { kind: "hero", side: "enemy" }, { kind: "hero", side: "player" }, ["damage"]);
    }
  }
  return events;
}
