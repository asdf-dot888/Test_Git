import { CARD_BY_ID, FUSION_RECIPES } from "../catalog.js";
import {
  attackWithMinion,
  castSpell,
  chooseTurnOrder,
  discardBeforeDraw,
  endPlayerTurn,
  fuseMinions,
  gameConstants,
  hasTaunt,
  playMinion,
  resolveEnemyTurn,
  redrawOpeningHand,
  useHeroPower,
} from "../engine.js";
import { GameRuleError } from "../errors.js";
import type { BattleState, CardDefinition, CardInstance, MinionState, RunState, SpellEffect } from "../types.js";

/**
 * Dev-only simulation bot. It plays through the public engine API only and never
 * bypasses a rule. It is intentionally NOT exported from the package index.
 */

const MAX_ACTIONS_PER_TURN = 60;
const ENEMY_HERO_ID = "enemy-hero";
const DESPERATE_HERO_HEALTH = 15;

export interface BotTurnReport {
  actions: number;
  stalled: boolean;
}

export interface BotTurnResult {
  run: RunState;
  report: BotTurnReport;
}

interface TurnContext {
  run: RunState;
  actions: number;
  stalled: boolean;
  blocked: Set<string>;
}

interface Candidate {
  instance: CardInstance;
  card: CardDefinition;
  score: number;
  slots: number;
  targetId: string | null;
  priority: number;
}

// ---------------------------------------------------------------------------
// Card valuation
// ---------------------------------------------------------------------------

function tokenPower(cardId: string): number {
  const stats = CARD_BY_ID.get(cardId)?.minion;
  return stats ? stats.attack + stats.maxHealth : 2;
}

function minionPower(card: CardDefinition): number {
  const stats = card.minion;
  if (!stats) return 0;
  let power = stats.attack + stats.maxHealth;
  const effect = stats.effect;
  if (effect?.kind === "battlecrySummon") power += effect.count * tokenPower(effect.cardId);
  else if (effect?.kind === "deathSummon") power += 0.7 * effect.count * tokenPower(effect.cardId);
  else if (effect?.kind === "battlecryBuff") power += effect.attack + effect.health;
  return power;
}

function effectPower(effect: SpellEffect): number {
  switch (effect.kind) {
    case "damage": return effect.target === "enemyHero" ? effect.amount * 0.8 : effect.amount;
    case "heal": return effect.amount * 0.4;
    case "summon": return effect.count * tokenPower(effect.cardId);
    case "buff": return effect.attack + effect.health;
    case "draw": return effect.count * 2.5;
    case "gainMana": return 2;
    case "discardRandom": return -1;
    case "gainTemporaryMana": return effect.amount * 0.5;
    case "randomDamage": return 2;
    case "cleave": return effect.amount * 1.5;
    case "stealFromOpponentDeck": return 2;
    case "rootMinion": return 2;
    case "curseAllEnemyMinions": return 2;
    case "burnEnemyHero": return 3;
    case "damageAllEnemyMinions": return 4;
    case "soulHarvest": return 5;
  }
}

/** Mana-relative value of a card. Used for discards and reward choices. */
export function cardValue(card: CardDefinition): number {
  const power = card.kind === "minion"
    ? minionPower(card)
    : (card.spellEffects ?? []).reduce((total, effect) => total + effectPower(effect), 0);
  return power / Math.max(card.cost, 1);
}

// ---------------------------------------------------------------------------
// Turn plumbing
// ---------------------------------------------------------------------------

function activeBattle(ctx: TurnContext): BattleState | null {
  const battle = ctx.run.battle;
  return ctx.run.status === "active" && battle && battle.status === "active" ? battle : null;
}

function attempt(ctx: TurnContext, action: (run: RunState) => RunState): boolean {
  if (ctx.actions >= MAX_ACTIONS_PER_TURN) {
    ctx.stalled = true;
    return false;
  }
  ctx.actions += 1;
  try {
    ctx.run = action(ctx.run);
    return true;
  } catch (error) {
    if (error instanceof GameRuleError) return false;
    throw error;
  }
}

function compareIds(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function minionValue(minion: MinionState): number {
  return minion.attack + minion.health;
}

function isRooted(minion: MinionState): boolean {
  return minion.statusEffects?.some((status) => status.kind === "root") ?? false;
}

function cardCost(cardId: string): number {
  return CARD_BY_ID.get(cardId)?.cost ?? 0;
}

// ---------------------------------------------------------------------------
// Turn start
// ---------------------------------------------------------------------------

function handlePendingDiscard(ctx: TurnContext): void {
  const battle = activeBattle(ctx);
  if (!battle?.pendingDiscardBeforeDraw) return;
  const ranked = [...battle.hand]
    .map((instance) => ({ instance, value: cardValue(CARD_BY_ID.get(instance.cardId)!) }))
    .sort((left, right) => left.value - right.value || compareIds(left.instance.instanceId, right.instance.instanceId));
  const worst = ranked[0];
  if (!worst) return;
  attempt(ctx, (run) => discardBeforeDraw(run, worst.instance.instanceId));
}

function handleOpeningRedraw(ctx: TurnContext): void {
  const battle = activeBattle(ctx);
  if (!battle || !ctx.run.openingHandRedrawAvailable) return;
  const hasCheapCard = battle.hand.some((instance) => cardCost(instance.cardId) <= 2);
  if (!hasCheapCard) attempt(ctx, (run) => redrawOpeningHand(run));
}

// ---------------------------------------------------------------------------
// Spell and minion evaluation
// ---------------------------------------------------------------------------

function bestKillTarget(board: readonly MinionState[], amount: number): MinionState | undefined {
  return board
    .filter((minion) => minion.health <= amount)
    .sort((left, right) => minionValue(right) - minionValue(left) || compareIds(left.instanceId, right.instanceId))[0];
}

function evaluateSpell(card: CardDefinition, battle: BattleState): { score: number; targetId: string | null } | null {
  const effects = card.spellEffects;
  if (!effects) return null;
  let score = 0;
  let targetId: string | null = null;

  for (const effect of effects) {
    switch (effect.kind) {
      case "damage": {
        if (effect.target === "enemyHero") {
          score += effect.amount >= battle.enemyHero.health ? 100 : effect.amount * 0.8;
          targetId ??= ENEMY_HERO_ID;
        } else {
          const target = bestKillTarget(battle.enemyBoard, effect.amount);
          if (!target) return null;
          score += minionValue(target) + 1;
          targetId = target.instanceId;
        }
        break;
      }
      case "randomDamage": {
        const target = bestKillTarget(battle.enemyBoard, 2);
        if (target) {
          score += 2 + minionValue(target) * 0.5;
          targetId = target.instanceId;
        } else {
          score += 2;
          targetId = ENEMY_HERO_ID;
        }
        break;
      }
      case "cleave": {
        const sideDamage = Math.max(1, Math.floor(effect.amount / 2));
        let bestValue = 0;
        let bestId: string | null = null;
        battle.enemyBoard.forEach((center, index) => {
          let value = 0;
          if (center.health <= effect.amount) value += minionValue(center) + 1;
          const left = battle.enemyBoard[index - 1];
          const right = battle.enemyBoard[index + 1];
          if (left && left.health <= sideDamage) value += minionValue(left) + 1;
          if (right && right.health <= sideDamage) value += minionValue(right) + 1;
          if (value > bestValue) {
            bestValue = value;
            bestId = center.instanceId;
          }
        });
        if (!bestId) return null;
        score += bestValue;
        targetId = bestId;
        break;
      }
      case "heal": {
        if (effect.target === "playerHero") {
          const missing = battle.playerHero.maxHealth - battle.playerHero.health;
          if (missing < 3) return null;
          score += Math.min(effect.amount, missing) * 0.6;
        } else {
          const target = [...battle.playerBoard]
            .filter((minion) => minion.maxHealth - minion.health >= 3)
            .sort((left, right) => (right.maxHealth - right.health) - (left.maxHealth - left.health) || compareIds(left.instanceId, right.instanceId))[0];
          if (!target) return null;
          score += Math.min(effect.amount, target.maxHealth - target.health) * 0.8;
          targetId = target.instanceId;
        }
        break;
      }
      case "buff": {
        const target = [...battle.playerBoard]
          .sort((left, right) => right.attack - left.attack || right.health - left.health || compareIds(left.instanceId, right.instanceId))[0];
        if (!target) return null;
        score += effect.attack + effect.health;
        targetId = target.instanceId;
        break;
      }
      case "summon":
      case "draw":
      case "gainMana":
      case "stealFromOpponentDeck":
        if (effect.kind === "stealFromOpponentDeck" && battle.hand.length >= gameConstants.maxHand) return null;
        score += effectPower(effect);
        break;
      // Unsupported for the player bot: self-harm discard, enemy-only boss effects.
      default:
        return null;
    }
  }
  return { score, targetId };
}

function candidatePriority(card: CardDefinition): number {
  if (card.kind === "minion") {
    const effect = card.minion?.effect;
    return effect?.kind === "battlecryBuff" && effect.target === "otherFriendly" ? 4 : 3;
  }
  const effects = card.spellEffects ?? [];
  if (effects.some((effect) => effect.kind === "gainMana")) return 0;
  if (effects.some((effect) => effect.kind === "draw")) return 1;
  if (effects.some((effect) => effect.kind === "damage" || effect.kind === "randomDamage" || effect.kind === "cleave")) return 2;
  if (effects.some((effect) => effect.kind === "buff")) return 5;
  return 6;
}

function buildCandidates(battle: BattleState, blocked: ReadonlySet<string>): Candidate[] {
  const candidates: Candidate[] = [];
  for (const instance of battle.hand) {
    if (blocked.has(instance.instanceId)) continue;
    const card = CARD_BY_ID.get(instance.cardId);
    if (!card || card.cost > battle.playerMana.current) continue;
    if (card.kind === "minion") {
      candidates.push({ instance, card, score: minionPower(card), slots: 1, targetId: null, priority: candidatePriority(card) });
      continue;
    }
    const evaluation = evaluateSpell(card, battle);
    if (!evaluation || evaluation.score <= 0) continue;
    const slots = (card.spellEffects ?? []).reduce((total, effect) => total + (effect.kind === "summon" ? effect.count : 0), 0);
    candidates.push({ instance, card, score: evaluation.score, slots, targetId: evaluation.targetId, priority: candidatePriority(card) });
  }
  return candidates;
}

/** 0/1 knapsack over mana and free board slots; prefers spending more mana on ties. */
function chooseSubset(items: readonly Candidate[], mana: number, slots: number): Candidate[] {
  if (items.length === 0 || mana < 0) return [];
  const table: Array<Array<{ score: number; mask: number }>> = Array.from({ length: mana + 1 }, () =>
    Array.from({ length: slots + 1 }, () => ({ score: 0, mask: 0 })));
  items.forEach((item, index) => {
    const weight = item.score + item.card.cost * 0.001;
    for (let m = mana; m >= item.card.cost; m -= 1) {
      for (let s = slots; s >= item.slots; s -= 1) {
        const previous = table[m - item.card.cost]![s - item.slots]!;
        const candidateScore = previous.score + weight;
        const current = table[m]![s]!;
        if (candidateScore > current.score) table[m]![s] = { score: candidateScore, mask: previous.mask | (1 << index) };
      }
    }
  });
  const best = table[mana]![slots]!;
  return items.filter((_, index) => (best.mask & (1 << index)) !== 0);
}

// ---------------------------------------------------------------------------
// Phases
// ---------------------------------------------------------------------------

function spendPhase(ctx: TurnContext): void {
  for (;;) {
    const battle = activeBattle(ctx);
    if (!battle) return;
    const candidates = buildCandidates(battle, ctx.blocked);
    const chosen = chooseSubset(candidates, battle.playerMana.current, gameConstants.maxBoard - battle.playerBoard.length);
    if (chosen.length === 0) return;
    chosen.sort((left, right) => left.priority - right.priority || right.score - left.score || compareIds(left.instance.instanceId, right.instance.instanceId));
    const next = chosen[0]!;
    const played = next.card.kind === "minion"
      ? attempt(ctx, (run) => playMinion(run, next.instance.instanceId))
      : attempt(ctx, (run) => castSpell(run, next.instance.instanceId, next.targetId ?? undefined));
    if (!played) {
      ctx.blocked.add(next.instance.instanceId);
      if (ctx.stalled) return;
    }
  }
}

function heroPowerPhase(ctx: TurnContext): void {
  const battle = activeBattle(ctx);
  const playerClass = ctx.run.playerClass;
  if (!battle || !playerClass || battle.heroPowerUsed || battle.heroPowerCooldown > 0 || battle.playerMana.current < 2) return;
  if (playerClass === "warrior") {
    attempt(ctx, (run) => useHeroPower(run));
  } else if (playerClass === "demonist") {
    if (battle.soulShards >= gameConstants.soulShardHeroPowerCost && battle.playerBoard.length < gameConstants.maxBoard) attempt(ctx, (run) => useHeroPower(run));
  } else {
    const target = bestKillTarget(battle.enemyBoard, gameConstants.assassinHeroPowerDamage);
    const targetId = target?.instanceId ?? ENEMY_HERO_ID;
    attempt(ctx, (run) => useHeroPower(run, targetId));
  }
}

function isReadyToAttack(minion: MinionState, battle: BattleState): boolean {
  return minion.attack > 0 && minion.summonedTurn < battle.turnNumber && !minion.hasAttacked && !isRooted(minion);
}

function chooseAttackTarget(battle: BattleState, attacker: MinionState): string | null {
  // Hearthstone legality: only taunt minions can be attacked while one stands; otherwise any minion or the hero.
  const taunts = battle.enemyBoard.filter(hasTaunt);
  const candidates = taunts.length > 0 ? taunts : battle.enemyBoard;
  const heroAllowed = taunts.length === 0;
  if (heroAllowed) {
    const readyDamage = battle.playerBoard.filter((minion) => isReadyToAttack(minion, battle)).reduce((total, minion) => total + minion.attack, 0);
    if (readyDamage >= battle.enemyHero.health) return battle.enemyHero.id;
  }
  if (candidates.length === 0) return heroAllowed ? battle.enemyHero.id : null;
  const attackerCost = cardCost(attacker.cardId);
  let best: { id: string; score: number; attack: number } | null = null;
  let strongest: MinionState | null = null;
  for (const target of candidates) {
    const kills = attacker.attack >= target.health;
    const dies = target.attack >= attacker.health;
    let score: number;
    if (kills && !dies) score = 100 + minionValue(target);
    else if (kills && dies) score = cardCost(target.cardId) >= attackerCost ? 40 + minionValue(target) - minionValue(attacker) : -1;
    else if (!dies) score = 5 + target.attack;
    else score = -100;
    if (!best || score > best.score || (score === best.score && compareIds(target.instanceId, best.id) < 0)) {
      best = { id: target.instanceId, score, attack: target.attack };
    }
    if (!strongest || target.attack > strongest.attack) strongest = target;
  }
  if (best && best.score > 0) return best.id;
  // A bad trade is not worth it: free damage to the hero when nothing blocks it.
  if (heroAllowed) return battle.enemyHero.id;
  return battle.playerHero.health <= DESPERATE_HERO_HEALTH && strongest ? strongest.instanceId : null;
}

/**
 * Picks one of the two face-down turn-order cards (alternating by seed and battle so both orders get played equally often)
 * and, when the enemy is first, lets its opening turn play out.
 */
export type BotTurnOrderPreference = "alternate" | "first" | "second";

export function startBattleAsBot(run: RunState, preference: BotTurnOrderPreference = "alternate"): RunState {
  const battle = run.battle;
  if (!battle || battle.firstSide !== null || !battle.turnOrderCards) return run;
  const wanted = preference !== "alternate" ? preference : (run.seed + run.completedBattles) % 2 === 0 ? "first" : "second";
  let next = chooseTurnOrder(run, battle.turnOrderCards[0] === wanted ? 0 : 1);
  if (next.battle?.activeSide === "enemy") next = resolveEnemyTurn(next);
  return next;
}

function attackPhase(ctx: TurnContext): void {
  const skipped = new Set<string>();
  for (;;) {
    const battle = activeBattle(ctx);
    if (!battle) return;
    const attacker = battle.playerBoard
      .filter((minion) => minion.attack > 0
        && minion.summonedTurn < battle.turnNumber
        && !minion.hasAttacked
        && !isRooted(minion)
        && !skipped.has(minion.instanceId))
      .sort((left, right) => right.attack - left.attack || compareIds(left.instanceId, right.instanceId))[0];
    if (!attacker) return;
    const targetId = chooseAttackTarget(battle, attacker);
    if (targetId === null) {
      skipped.add(attacker.instanceId);
      continue;
    }
    if (!attempt(ctx, (run) => attackWithMinion(run, attacker.instanceId, targetId))) {
      skipped.add(attacker.instanceId);
      if (ctx.stalled) return;
    }
  }
}

function findFusionPair(battle: BattleState, playerClass: RunState["playerClass"]): [string, string] | null {
  if (!playerClass) return null;
  for (const recipe of FUSION_RECIPES) {
    if (recipe.classId !== playerClass) continue;
    const first = battle.playerBoard.find((minion) => minion.cardId === recipe.sourceCardIds[0]);
    const second = battle.playerBoard.find((minion) => minion.cardId === recipe.sourceCardIds[1] && minion.instanceId !== first?.instanceId);
    if (first && second) return [first.instanceId, second.instanceId];
  }
  return null;
}

function fusionPhase(ctx: TurnContext): void {
  for (let guard = 0; guard < 4; guard += 1) {
    const battle = activeBattle(ctx);
    if (!battle || battle.playerMana.current < 1) return;
    const pair = findFusionPair(battle, ctx.run.playerClass);
    if (!pair) return;
    if (!attempt(ctx, (run) => fuseMinions(run, pair[0], pair[1]))) return;
  }
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export function playBotTurn(run: RunState): BotTurnResult {
  const ctx: TurnContext = { run, actions: 0, stalled: false, blocked: new Set() };
  const initial = activeBattle(ctx);
  if (!initial || initial.activeSide !== "player") {
    throw new GameRuleError("WRONG_TURN", "The bot needs an active player turn.");
  }

  handlePendingDiscard(ctx);
  handleOpeningRedraw(ctx);

  const battleAfterSetup = activeBattle(ctx);
  if (battleAfterSetup) {
    // Fusion results cannot attack this turn, so attack with the sources first.
    if (findFusionPair(battleAfterSetup, ctx.run.playerClass) && battleAfterSetup.playerMana.current >= 1) {
      attackPhase(ctx);
      fusionPhase(ctx);
      spendPhase(ctx);
      heroPowerPhase(ctx);
    } else {
      spendPhase(ctx);
      heroPowerPhase(ctx);
      attackPhase(ctx);
      fusionPhase(ctx);
    }
  }

  if (activeBattle(ctx)) ctx.run = endPlayerTurn(ctx.run);
  return { run: ctx.run, report: { actions: ctx.actions, stalled: ctx.stalled } };
}
