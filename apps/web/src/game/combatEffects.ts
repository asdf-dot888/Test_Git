import { CARD_BY_ID, CARD_CATALOG, gameConstants, type CardDefinition, type EnemyCombatRecord, type PlayerSide, type ResolvedSpellEffect, type RunState, type SpellEffect } from "@board-game/game-core";
import type { GameAction } from "./gameActions.js";
import type { SoundEffectKind } from "./audio.js";

export type CombatEffectKind = "attack" | "damage" | "heal" | "buff" | "mana" | "summon" | "draw" | "cleave" | "theft" | "fusion" | "hero-power" | "impact";

export interface CardCombatVisualProfile {
  accent: string;
  particles: "ember" | "rune" | "shadow" | "steel" | "bone";
  motionClass: "slash" | "arcane" | "guard" | "summon";
  durationMs: number;
}

export type CombatDamageTarget = "minion" | "hero";
export type CombatDamageOutcome = "hit" | "miss" | "armor-block";

export interface CombatDamageInfo {
  /** Damage after armor, before clamping to the target's remaining health. */
  amount: number;
  /** Positive damage absorbed by player hero armor; always zero for minions and enemy heroes. */
  armorBlocked: number;
  outcome: CombatDamageOutcome;
  retaliation: boolean;
}

export interface CombatTargetDamage {
  target: CombatAnchor;
  damage: CombatDamageInfo;
}

function stableHash(value: string): number {
  let hash = 2166136261;
  for (const character of value) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  return hash >>> 0;
}

function cardProfile(card: CardDefinition): CardCombatVisualProfile {
  const hash = stableHash(card.id);
  const particles = card.race === "demon" || card.classId === "demonist"
    ? "ember"
    : card.classId === "assassin" ? "shadow"
      : card.classId === "warrior" ? "steel"
        : card.kind === "spell" ? "rune" : "bone";
  const motionClass = card.kind === "spell"
    ? "arcane"
    : card.classId === "warrior" ? "guard"
      : card.classId === "assassin" ? "slash" : "summon";
  return {
    accent: `hsl(${((hash / 0xffffffff) * 360).toFixed(4)} 82% 68%)`,
    particles,
    motionClass,
    durationMs: 930 + (hash % 5) * 70,
  };
}

export const CARD_COMBAT_VISUAL_PROFILES: Readonly<Record<string, CardCombatVisualProfile>> = Object.fromEntries(
  CARD_CATALOG.map((card) => [card.id, cardProfile(card)]),
);

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
  damageTarget?: CombatDamageTarget;
  damage?: CombatDamageInfo;
  /** Independent victim results for multi-target and boss-area damage. */
  affectedTargets?: CombatTargetDamage[];
  areaImpact?: boolean;
  bossArea?: boolean;
  bossPhase?: 1 | 2 | 3;
  deathAnchors?: CombatAnchor[];
  slowMotion?: boolean;
}

function slotOf<T extends { instanceId: string }>(items: readonly T[], instanceId: string): number {
  return items.findIndex((item) => item.instanceId === instanceId);
}

function damageTargetFor(anchor: CombatAnchor): CombatDamageTarget | undefined {
  return anchor.kind === "minion" || anchor.kind === "hero" ? anchor.kind : undefined;
}

function pushEvent(events: CombatEffectEvent[], firstEventId: number, assetCardId: string | null, effectKind: CombatEffectKind, source: CombatAnchor, target: CombatAnchor, soundCues: SoundEffectKind[] = [], areaImpact = false, deathAnchors?: CombatAnchor[], bossArea = false, damageTarget?: CombatDamageTarget, damage?: CombatDamageInfo, affectedTargets?: CombatTargetDamage[], bossPhase?: 1 | 2 | 3): void {
  events.push({
    id: firstEventId + events.length,
    assetCardId,
    effectKind,
    soundCues: [...new Set(soundCues)],
    source,
    target,
    ...(damageTarget ? { damageTarget } : {}),
    ...(damage ? { damage } : {}),
    ...(affectedTargets?.length ? { affectedTargets } : {}),
    ...(areaImpact ? { areaImpact: true } : {}),
    ...(bossArea ? { bossArea: true } : {}),
    ...(bossPhase ? { bossPhase } : {}),
    ...(deathAnchors?.length ? { deathAnchors } : {}),
  });
}

function damageInfo(attemptedAmount: number, target: CombatAnchor, before: NonNullable<RunState["battle"]>, after: NonNullable<RunState["battle"]> | undefined, retaliation = false): CombatDamageInfo {
  const armorBlocked = target.kind === "hero" && target.side === "player" && after
    ? Math.max(0, before.playerArmor - after.playerArmor)
    : 0;
  const amount = Math.max(0, attemptedAmount - armorBlocked);
  return {
    amount,
    armorBlocked,
    outcome: amount > 0 ? "hit" : armorBlocked > 0 ? "armor-block" : "miss",
    retaliation,
  };
}

function cleaveTargets(board: NonNullable<RunState["battle"]>["playerBoard"], targetId: string | null, side: PlayerSide, amount: number): CombatTargetDamage[] {
  if (!targetId) return [];
  const center = board.findIndex((minion) => minion.instanceId === targetId);
  if (center < 0) return [];
  const sideDamage = Math.max(1, Math.floor(amount / 2));
  return [center - 1, center, center + 1]
    .filter((slot) => slot >= 0 && slot < board.length)
    .map((slot) => ({
      target: { kind: "minion", side, slot },
      damage: { amount: slot === center ? amount : sideDamage, armorBlocked: 0, outcome: "hit", retaliation: false },
    }));
}

function playerSpellTarget(battle: NonNullable<RunState["battle"]>, effect: SpellEffect, targetId?: string): CombatAnchor {
  if (effect.kind === "gainMana" || effect.kind === "gainTemporaryMana") return { kind: "hero", side: "player" };
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
  if (effect.kind === "summon") return { kind: "minion", side: "player", slot: Math.min(gameConstants.maxBoard - 1, battle.playerBoard.length) };
  return { kind: "hand", side: "player", slot: Math.min(9, battle.hand.length) };
}

function enemySpellTarget(battle: NonNullable<RunState["battle"]>, effect: SpellEffect, targetId?: string): CombatAnchor {
  if (effect.kind === "gainMana" || effect.kind === "gainTemporaryMana") return { kind: "hero", side: "enemy" };
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
  if (effect.kind === "summon") return { kind: "minion", side: "enemy", slot: Math.min(gameConstants.maxBoard - 1, battle.enemyBoard.length) };
  return { kind: "hand", side: "enemy", slot: Math.min(9, battle.enemyHand.length) };
}

function collectEnemyTurnEvents(events: CombatEffectEvent[], firstEventId: number, records: readonly EnemyCombatRecord[], previous: NonNullable<RunState["battle"]>, next: NonNullable<RunState["battle"]>, phase: 1 | 2 | 3): void {
  for (const record of records) {
    if (record.type === "play-minion") {
      const summoned = record.summonedIds.map((instanceId) => next.enemyBoard.find((minion) => minion.instanceId === instanceId)).filter((minion) => minion !== undefined);
      const source: CombatAnchor = { kind: "hand", side: "enemy", slot: record.handSlot, instanceId: record.instanceId };
      const first = summoned[0];
      const firstSlot = first ? slotOf(next.enemyBoard, first.instanceId) : Math.min(gameConstants.maxBoard - 1, previous.enemyBoard.length);
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
        const kind: CombatEffectKind = effect.kind === "damage" || effect.kind === "randomDamage"
          ? "damage"
          : effect.kind === "cleave" ? "cleave"
          : effect.kind === "gainMana" || effect.kind === "gainTemporaryMana" ? "mana"
            : effect.kind === "stealFromOpponentDeck" || effect.kind === "discardRandom" ? "theft" : effect.kind;
        const cues: SoundEffectKind[] = effect.kind === "summon" ? ["summon"] : ["spell"];
        if (effect.kind === "damage" || effect.kind === "randomDamage" || effect.kind === "cleave") {
          cues.push("damage");
          if (logged.targetId && !next.playerBoard.some((minion) => minion.instanceId === logged.targetId)) cues.push("death");
        } else if (effect.kind === "heal") cues.push("heal");
        const target = enemySpellTarget(previous, effect, logged.targetId ?? undefined);
        const deathAnchors = previous.playerBoard
          .filter((minion) => !next.playerBoard.some((current) => current.instanceId === minion.instanceId))
          .map((minion) => ({ kind: "minion", side: "player", slot: slotOf(previous.playerBoard, minion.instanceId) }) as CombatAnchor);
        if (deathAnchors.length && !cues.includes("death")) cues.push("death");
        const damageAmount = effect.kind === "randomDamage" ? logged.amount : effect.kind === "damage" || effect.kind === "cleave" ? effect.amount : undefined;
        const targets = effect.kind === "cleave" && damageAmount !== undefined
          ? cleaveTargets(previous.playerBoard, logged.targetId, "player", damageAmount)
          : undefined;
        pushEvent(events, firstEventId, record.cardId, kind,
          { kind: "hand", side: "enemy", slot: record.handSlot, instanceId: record.instanceId },
          target, cues, effect.kind === "cleave", deathAnchors, false,
          effect.kind === "damage" || effect.kind === "randomDamage" || effect.kind === "cleave" ? damageTargetFor(target) : undefined,
          damageAmount === undefined ? undefined : damageInfo(damageAmount, target, previous, next), targets);
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
      const attackerDied = !next.enemyBoard.some((minion) => minion.instanceId === record.attackerId);
      pushEvent(events, firstEventId, record.cardId, "attack",
        { kind: "minion", side: "enemy", slot: Math.max(0, attackerSlot) }, target,
        targetDied || attackerDied ? ["minion-attack", "damage", "death"] : ["minion-attack", "damage"], false,
        targetDied ? [target] : undefined, false, damageTargetFor(target),
        damageInfo(previous.enemyBoard[attackerSlot]?.attack ?? 0, target, previous, next));
      if (targetSlot >= 0) {
        const attackerDied = !next.enemyBoard.some((minion) => minion.instanceId === record.attackerId);
        const defender = previous.playerBoard[targetSlot];
        pushEvent(events, firstEventId, defender?.cardId ?? null, "attack",
          { kind: "minion", side: "player", slot: targetSlot },
          { kind: "minion", side: "enemy", slot: Math.max(0, attackerSlot) },
          attackerDied ? ["minion-attack", "damage", "death"] : ["minion-attack", "damage"], false,
          attackerDied ? [{ kind: "minion", side: "enemy", slot: Math.max(0, attackerSlot) }] : undefined, false, "minion",
          damageInfo(previous.playerBoard[targetSlot]?.attack ?? 0, { kind: "minion", side: "enemy", slot: Math.max(0, attackerSlot) }, previous, next, true));
      }
      continue;
    }
    const fallenMinions = previous.playerBoard
      .filter((minion) => !next.playerBoard.some((current) => current.instanceId === minion.instanceId))
      .map((minion) => ({ kind: "minion", side: "player", slot: slotOf(previous.playerBoard, minion.instanceId) }) as CombatAnchor);
    const affectedTargets: CombatTargetDamage[] = [
      ...previous.playerBoard.map((minion, slot) => ({ target: { kind: "minion", side: "player", slot } as CombatAnchor, damage: { amount: 1, armorBlocked: 0, outcome: "hit" as const, retaliation: false } })),
      { target: { kind: "hero", side: "player" }, damage: damageInfo(1, { kind: "hero", side: "player" }, previous, next) },
    ];
    pushEvent(events, firstEventId, null, "impact", { kind: "hero", side: "enemy" }, { kind: "hero", side: "player" }, ["damage", ...(fallenMinions.length ? ["death" as const] : [])], true, fallenMinions, true, undefined, undefined, affectedTargets, phase);
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
  collectEnemyTurnEvents(events, firstEventId, [action], previous, next, beforeRun.phase);
  return events;
}

export function collectCombatEffectEvents(previousRun: RunState, nextRun: RunState, action: GameAction, firstEventId: number, spellResolution: readonly ResolvedSpellEffect[] = []): CombatEffectEvent[] {
  const previous = previousRun.battle;
  if (!previous) return [];
  const next = nextRun.battle ?? previous;
  const events: CombatEffectEvent[] = [];
  const enemyRecords = action.type === "end-turn" ? nextRun.battle?.enemyTurnEvents : undefined;
  if (enemyRecords?.length) {
    collectEnemyTurnEvents(events, firstEventId, enemyRecords, previous, next, previousRun.phase);
    return events;
  }

  if (action.type === "play-minion") {
    const handSlot = slotOf(previous.hand, action.instanceId);
    const card = previous.hand[handSlot];
    const definition = card ? CARD_BY_ID.get(card.cardId) : undefined;
    if (card && definition?.kind === "minion") {
      const summoned = next.playerBoard.find((minion) => minion.instanceId === card.instanceId);
      const targetSlot = summoned ? slotOf(next.playerBoard, summoned.instanceId) : Math.max(0, previous.playerBoard.length);
      pushEvent(events, firstEventId, card.cardId, "summon", { kind: "hand", side: "player", slot: handSlot, instanceId: card.instanceId }, { kind: "minion", side: "player", slot: Math.min(gameConstants.maxBoard - 1, targetSlot) }, ["summon"]);
      const effect = definition.minion?.effect;
      if (effect?.kind === "battlecryBuff") {
        const target = effect.target === "self" ? summoned : next.playerBoard.find((minion) => minion.instanceId !== card.instanceId);
        if (target) pushEvent(events, firstEventId, card.cardId, "buff", { kind: "minion", side: "player", slot: Math.min(gameConstants.maxBoard - 1, targetSlot) }, { kind: "minion", side: "player", slot: slotOf(next.playerBoard, target.instanceId) }, ["spell"]);
      }
      if (effect?.kind === "battlecrySummon") {
        const extra = next.playerBoard.find((minion) => minion.cardId === effect.cardId && !previous.playerBoard.some((old) => old.instanceId === minion.instanceId) && minion.instanceId !== card.instanceId);
        if (extra) pushEvent(events, firstEventId, card.cardId, "summon", { kind: "minion", side: "player", slot: Math.min(gameConstants.maxBoard - 1, targetSlot) }, { kind: "minion", side: "player", slot: slotOf(next.playerBoard, extra.instanceId) }, ["summon"]);
      }
    }
  } else if (action.type === "cast-spell") {
    const handSlot = slotOf(previous.hand, action.instanceId);
    const card = previous.hand[handSlot];
    const definition = card ? CARD_BY_ID.get(card.cardId) : undefined;
    if (card && definition?.kind === "spell") {
      for (const [effectIndex, effect] of (definition.spellEffects ?? []).entries()) {
        const kind: CombatEffectKind = effect.kind === "damage" || effect.kind === "randomDamage"
          ? "damage"
          : effect.kind === "cleave" ? "cleave"
          : effect.kind === "gainMana" || effect.kind === "gainTemporaryMana" ? "mana"
            : effect.kind === "stealFromOpponentDeck" || effect.kind === "discardRandom" ? "theft" : effect.kind;
        const cues: SoundEffectKind[] = effect.kind === "summon" ? ["summon"] : ["spell"];
        if (effect.kind === "damage" || effect.kind === "randomDamage" || effect.kind === "cleave") {
          cues.push("damage");
          if (effect.kind === "damage" && effect.target === "enemyMinion" && !next.enemyBoard.some((minion) => minion.instanceId === action.targetId)) cues.push("death");
          if (effect.kind === "randomDamage" && action.targetId !== "enemy-hero" && !next.enemyBoard.some((minion) => minion.instanceId === action.targetId)) cues.push("death");
        } else if (effect.kind === "heal") cues.push("heal");
        const target = playerSpellTarget(previous, effect, action.targetId);
        const resolved = spellResolution.find((entry) => entry.effectIndex === effectIndex);
        const damageAmount = effect.kind === "randomDamage" ? resolved?.amount : effect.kind === "damage" || effect.kind === "cleave" ? effect.amount : undefined;
        const targets = effect.kind === "cleave" && damageAmount !== undefined
          ? cleaveTargets(previous.enemyBoard, action.targetId ?? null, "enemy", damageAmount)
          : undefined;
        const deathAnchors = previous.enemyBoard
          .filter((minion) => !next.enemyBoard.some((current) => current.instanceId === minion.instanceId))
          .map((minion) => ({ kind: "minion", side: "enemy", slot: slotOf(previous.enemyBoard, minion.instanceId) }) as CombatAnchor);
        if (deathAnchors.length && !cues.includes("death")) cues.push("death");
        pushEvent(events, firstEventId, card.cardId, kind, { kind: "hand", side: "player", slot: handSlot, instanceId: card.instanceId }, target, cues, effect.kind === "cleave", deathAnchors, false,
          effect.kind === "damage" || effect.kind === "randomDamage" || effect.kind === "cleave" ? damageTargetFor(target) : undefined,
          damageAmount === undefined ? undefined : damageInfo(damageAmount, target, previous, next), targets);
      }
    }
  } else if (action.type === "attack") {
    const attackerSlot = slotOf(previous.playerBoard, action.attackerId);
    const attacker = previous.playerBoard[attackerSlot];
    if (attacker) {
      const targetSlot = slotOf(previous.enemyBoard, action.targetId);
      const target: CombatAnchor = targetSlot >= 0 ? { kind: "minion", side: "enemy", slot: targetSlot } : { kind: "hero", side: "enemy" };
      const targetDied = targetSlot >= 0 && !next.enemyBoard.some((minion) => minion.instanceId === action.targetId);
      const attackerDied = !next.playerBoard.some((minion) => minion.instanceId === action.attackerId);
      pushEvent(events, firstEventId, attacker.cardId, "attack", { kind: "minion", side: "player", slot: attackerSlot }, target,
        targetDied || attackerDied ? ["minion-attack", "damage", "death"] : ["minion-attack", "damage"], false,
        [targetDied ? target : null, attackerDied ? { kind: "minion", side: "player", slot: attackerSlot } as CombatAnchor : null].filter((anchor): anchor is CombatAnchor => anchor !== null), false, damageTargetFor(target),
        damageInfo(attacker.attack, target, previous, next));
      if (targetSlot >= 0) {
        const defender = previous.enemyBoard[targetSlot];
        const attackerDied = !next.playerBoard.some((minion) => minion.instanceId === action.attackerId);
        const retaliationTarget: CombatAnchor = { kind: "minion", side: "player", slot: attackerSlot };
        pushEvent(events, firstEventId, defender?.cardId ?? null, "attack",
          { kind: "minion", side: "enemy", slot: targetSlot }, retaliationTarget,
          attackerDied ? ["minion-attack", "damage", "death"] : ["minion-attack", "damage"], false,
          attackerDied ? [retaliationTarget] : undefined, false, "minion",
          damageInfo(defender?.attack ?? 0, retaliationTarget, previous, next, true));
      }
    }
  } else if (action.type === "all-attack") {
    let remainingHealth = previous.enemyHero.health - (nextRun.battle?.enemyHero.health ?? 0);
    for (const attacker of previous.playerBoard) {
      if (attacker.summonedTurn >= previous.turnNumber || attacker.hasAttacked || remainingHealth <= 0) continue;
      const slot = slotOf(previous.playerBoard, attacker.instanceId);
      const lethal = attacker.attack >= remainingHealth;
      pushEvent(events, firstEventId + events.length, attacker.cardId, "attack", { kind: "minion", side: "player", slot }, { kind: "hero", side: "enemy" }, lethal ? ["minion-attack", "damage", "death"] : ["minion-attack", "damage"], false, undefined, false, "hero",
        damageInfo(attacker.attack, { kind: "hero", side: "enemy" }, previous, nextRun.battle ?? undefined));
      remainingHealth -= attacker.attack;
    }
  } else if (action.type === "fuse-minions") {
    const fused = next.playerBoard.find((minion) => !previous.playerBoard.some((old) => old.instanceId === minion.instanceId));
    const sourceSlot = slotOf(previous.playerBoard, action.firstMinionId);
    if (fused && sourceSlot >= 0) {
      pushEvent(events, firstEventId, fused.cardId, "fusion", { kind: "minion", side: "player", slot: sourceSlot }, { kind: "minion", side: "player", slot: slotOf(next.playerBoard, fused.instanceId) }, ["summon"]);
    }
  } else if (action.type === "use-hero-power") {
    const playerClass = previousRun.playerClass;
    if (playerClass === "warrior") {
      pushEvent(events, firstEventId, null, "hero-power", { kind: "hero", side: "player" }, { kind: "hero", side: "player" }, ["spell"]);
    } else if (playerClass === "assassin") {
      const targetId = action.targetId;
      const targetSlot = targetId && targetId !== "enemy-hero" ? slotOf(previous.enemyBoard, targetId) : -1;
      const target: CombatAnchor = targetId === "enemy-hero" || targetSlot < 0
        ? { kind: "hero", side: "enemy" }
        : { kind: "minion", side: "enemy", slot: targetSlot };
      const targetDied = targetSlot >= 0 && !next.enemyBoard.some((minion) => minion.instanceId === targetId);
      pushEvent(events, firstEventId, null, "hero-power", { kind: "hero", side: "player" }, target, targetDied ? ["spell", "damage", "death"] : ["spell", "damage"], false, targetDied ? [target] : undefined, false, damageTargetFor(target), damageInfo(2, target, previous, next));
    } else if (playerClass === "demonist") {
      const summoned = next.playerBoard.find((minion) => !previous.playerBoard.some((old) => old.instanceId === minion.instanceId));
      if (summoned) pushEvent(events, firstEventId, summoned.cardId, "hero-power", { kind: "hero", side: "player" }, { kind: "minion", side: "player", slot: slotOf(next.playerBoard, summoned.instanceId) }, ["summon"]);
    }
  } else if (action.type === "end-turn" && nextRun.battle) {
    if (next.playerHero.health < previous.playerHero.health) {
      const amount = Math.max(0, previous.playerHero.health - next.playerHero.health);
      const armorBlocked = Math.max(0, previous.playerArmor - next.playerArmor);
      pushEvent(events, firstEventId, null, "impact", { kind: "hero", side: "enemy" }, { kind: "hero", side: "player" }, ["damage"], false, undefined, false, "hero",
        { amount, armorBlocked, outcome: amount > 0 ? "hit" : armorBlocked > 0 ? "armor-block" : "miss", retaliation: false });
    }
  }
  if ((action.type === "attack" || action.type === "all-attack")
    && previousRun.battle?.enemyHero.health && nextRun.battle?.enemyHero.health === 0) {
    const lethalAttack = [...events].reverse().find((event) => event.effectKind === "attack" && event.target.kind === "hero" && event.target.side === "enemy");
    if (lethalAttack) lethalAttack.slowMotion = true;
  }
  return events;
}
