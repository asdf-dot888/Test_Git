import { BOSSES, CARD_BY_ID, CARD_CATALOG, ENEMY_BY_ID, NORMAL_ENEMIES, STARTER_DECK_CARD_IDS } from "./catalog.js";
import { GameRuleError } from "./errors.js";
import { normalizeSeed, pickIndex, shuffle } from "./random.js";
import type {
  BattleState,
  CardDefinition,
  CardInstance,
  EncounterState,
  EnemyCombatRecord,
  EnemyDefinition,
  MinionState,
  PlayerSide,
  RunState,
  SpellEffect,
} from "./types.js";

const MAX_HAND = 10;
const MAX_BOARD = 5;
const HERO_HEALTH = 30;
const INITIAL_MANA = 5;
const MAX_MANA = 10;

function fail(code: ConstructorParameters<typeof GameRuleError>[0], message: string): never {
  throw new GameRuleError(code, message);
}

function cloneRun(run: RunState): RunState {
  return structuredClone(run);
}

function getCard(cardId: string): CardDefinition {
  const card = CARD_BY_ID.get(cardId);
  if (!card) fail("CARD_NOT_FOUND", `Unknown card: ${cardId}`);
  return card;
}

function assertActiveRun(run: RunState): BattleState {
  if (run.status !== "active" || !run.battle || run.battle.status !== "active") {
    fail("TERMINAL_RUN", "The run has no active battle.");
  }
  return run.battle;
}

function assertPlayerTurn(run: RunState): BattleState {
  const battle = assertActiveRun(run);
  if (battle.activeSide !== "player" || battle.pendingDiscardBeforeDraw) {
    fail("WRONG_TURN", "This action is unavailable during the current turn state.");
  }
  return battle;
}

function cardCounts(deck: readonly CardInstance[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const instance of deck) counts.set(instance.cardId, (counts.get(instance.cardId) ?? 0) + 1);
  return counts;
}

function enemyCardWeight(card: CardDefinition, enemy: EnemyDefinition): number {
  const profile = enemy.tactics.profile;
  const effects = card.spellEffects ?? [];
  const minion = card.minion;
  const bossCardBonus = enemy.kind === "boss" && card.rewardTier === "boss" ? 2 : 0;
  let weight = 1 + bossCardBonus;

  if (profile === "aggressor" || profile === "hunter") {
    if (minion) weight += card.cost <= 3 ? 5 : 2;
    if (effects.some((effect) => effect.kind === "damage")) weight += 5;
    if (effects.some((effect) => effect.kind === "summon")) weight += 2;
  } else if (profile === "summoner") {
    if (minion) weight += 5;
    if (minion?.effect?.kind === "battlecrySummon" || effects.some((effect) => effect.kind === "summon")) weight += 5;
    if (effects.some((effect) => effect.kind === "draw")) weight += 2;
  } else if (profile === "controller" || profile === "drain") {
    if (minion && minion.maxHealth >= minion.attack) weight += 4;
    if (effects.some((effect) => effect.kind === "heal" || effect.kind === "buff")) weight += 5;
    if (effects.some((effect) => effect.kind === "damage")) weight += 2;
  } else {
    if (minion && card.cost >= 4) weight += 5;
    if (card.kind === "spell" && card.cost >= 4) weight += 4;
    if (effects.some((effect) => effect.kind === "damage")) weight += 2;
  }
  return weight;
}

function createEnemyDeck(enemy: EnemyDefinition, seed: number, idPrefix: string): { starterDeck: CardInstance[]; shuffledDeck: CardInstance[]; state: number } {
  const starterDeck: CardInstance[] = [];
  const counts = new Map<string, number>();
  let state = normalizeSeed(seed);
  while (starterDeck.length < 30) {
    const candidates = CARD_CATALOG
      .filter((card) => (counts.get(card.id) ?? 0) < 2)
      .map((card) => ({ card, weight: enemyCardWeight(card, enemy) }));
    const totalWeight = candidates.reduce((total, candidate) => total + candidate.weight, 0);
    if (totalWeight <= 0) fail("INVALID_ACTION", `No valid cards are available for ${enemy.id}.`);
    const picked = pickIndex(totalWeight, state);
    state = picked.state;
    let cursor = picked.value;
    const selected = candidates.find(({ weight }) => {
      cursor -= weight;
      return cursor < 0;
    })?.card;
    if (!selected) fail("INVALID_ACTION", `Could not generate a card for ${enemy.id}.`);
    const index = starterDeck.length + 1;
    starterDeck.push({ instanceId: `${idPrefix}-${index}`, cardId: selected.id });
    counts.set(selected.id, (counts.get(selected.id) ?? 0) + 1);
  }
  const shuffled = shuffle(starterDeck, state);
  return { starterDeck, shuffledDeck: shuffled.items, state: shuffled.state };
}

export function hydrateRunForCurrentBattle(run: RunState): RunState {
  const battle = run.battle;
  if (!battle || run.status !== "active" || battle.status !== "active") return run;
  const hasEnemyZones = Boolean(battle.enemyMana && battle.enemyStarterDeck && battle.enemyHand && battle.enemyDrawPile && battle.enemyDiscardPile);
  const hasObsoleteCharge = Object.prototype.hasOwnProperty.call(battle, "pendingEnemyCharge");
  if (hasEnemyZones && !hasObsoleteCharge) return run;

  const next = cloneRun(run);
  const current = next.battle!;
  if (!hasEnemyZones) {
    const enemy = ENEMY_BY_ID.get(current.enemyId);
    if (!enemy) fail("INVALID_ACTION", `Unknown enemy: ${current.enemyId}`);
    const generated = createEnemyDeck(enemy, current.rngState, `${current.battleId}-enemy-card`);
    current.enemyMana = { current: INITIAL_MANA, max: MAX_MANA };
    current.enemyStarterDeck = generated.starterDeck;
    current.enemyHand = generated.shuffledDeck.slice(0, 3);
    current.enemyDrawPile = generated.shuffledDeck.slice(3);
    current.enemyDiscardPile = [];
    current.rngState = generated.state;
  }
  delete (current as BattleState & { pendingEnemyCharge?: unknown }).pendingEnemyCharge;
  return next;
}

function makeInstance(run: RunState, cardId: string, prefix = "card"): CardInstance {
  return { instanceId: `${prefix}-${run.nextInstanceNumber}`, cardId };
}

function createMinion(
  run: RunState,
  cardId: string,
  owner: PlayerSide,
  turnNumber: number,
  fromCard?: CardInstance,
): { run: RunState; minion: MinionState } {
  const definition = getCard(cardId);
  if (!definition.minion) fail("INVALID_ACTION", `${cardId} is not a minion card.`);

  const instance = fromCard ?? makeInstance(run, cardId, "summon");
  const nextRun = fromCard ? run : { ...run, nextInstanceNumber: run.nextInstanceNumber + 1 };
  return {
    run: nextRun,
    minion: {
      instanceId: instance.instanceId,
      cardId,
      owner,
      attack: definition.minion.attack,
      health: definition.minion.maxHealth,
      maxHealth: definition.minion.maxHealth,
      summonedTurn: turnNumber,
      hasAttacked: false,
    },
  };
}

function dealDamageToPlayerHero(run: RunState, amount: number): RunState {
  const battle = run.battle;
  if (!battle) return run;
  battle.playerHero.health = Math.max(0, battle.playerHero.health - amount);
  if (battle.playerHero.health === 0) return finishDefeat(run);
  return run;
}

function dealDamageToEnemyHero(run: RunState, amount: number): RunState {
  const battle = run.battle;
  if (!battle) return run;
  battle.enemyHero.health = Math.max(0, battle.enemyHero.health - amount);
  if (battle.enemyHero.health === 0) return finishVictory(run);
  return run;
}

function finishDefeat(run: RunState): RunState {
  const next = cloneRun(run);
  next.status = "defeat";
  next.battle = null;
  next.pendingReward = null;
  next.pendingVictoryAcknowledgement = false;
  return next;
}

function rewardChoices(run: RunState, tier: "normal" | "boss", seed: number): { state: number; choices: string[] } {
  const counts = cardCounts(run.deck);
  const eligible = CARD_CATALOG
    .filter((card) => card.rewardTier === tier && (counts.get(card.id) ?? 0) < 2)
    .map((card) => card.id);
  const result = shuffle(eligible, seed);
  return { state: result.state, choices: result.items.slice(0, 3) };
}

function finishVictory(run: RunState): RunState {
  if (!run.battle) return run;
  const next = cloneRun(run);
  const battle = next.battle;
  if (!battle) return next;
  const encounterIndex = next.encounters.findIndex((encounter) => encounter.status === "active");
  if (encounterIndex < 0) fail("ENCOUNTER_NOT_READY", "No encounter is active.");

  const encounter = next.encounters[encounterIndex]!;
  encounter.status = "complete";
  next.completedBattles += 1;
  if (encounter.kind === "normal") {
    next.encounterInPhase = Math.min(3, next.encounterInPhase + 1) as 1 | 2 | 3;
  } else {
    next.encounterInPhase = 0;
  }

  battle.status = "playerWon";
  battle.playerHero.health = HERO_HEALTH;
  const rewardTier = encounter.kind === "boss" ? "boss" : "normal";
  const offers = rewardChoices(next, rewardTier, battle.rngState);
  battle.rngState = offers.state;
  next.pendingReward = { tier: rewardTier, choices: offers.choices, encounterIndex };
  next.pendingVictoryAcknowledgement = true;

  const finalBoss = encounter.kind === "boss" && encounter.phase === 3;
  if (finalBoss) {
    next.status = "victory";
    next.battle = null;
  }
  return next;
}

function ensureMana(run: RunState, cost: number): BattleState {
  const battle = assertPlayerTurn(run);
  if (battle.playerMana.current < cost) fail("INSUFFICIENT_MANA", "Not enough mana to play this card.");
  return battle;
}

function refillDrawPile(run: RunState, battle: BattleState): void {
  const recycled = run.starterDeck.map((instance) => {
    const copy = makeInstance(run, instance.cardId, "recycle");
    run.nextInstanceNumber += 1;
    return copy;
  });
  const result = shuffle(recycled, battle.rngState);
  battle.rngState = result.state;
  battle.drawPile.push(...result.items);
}

function takeDraw(run: RunState, battle: BattleState): CardInstance | null {
  if (battle.drawPile.length === 0) refillDrawPile(run, battle);
  return battle.drawPile.shift() ?? null;
}

function drawForPlayerTurn(run: RunState, battle: BattleState): void {
  if (battle.hand.length >= MAX_HAND) {
    battle.pendingDiscardBeforeDraw = true;
    return;
  }
  const card = takeDraw(run, battle);
  if (card) battle.hand.push(card);
}

function refillEnemyDrawPile(run: RunState, battle: BattleState): void {
  const recycled = battle.enemyStarterDeck.map((instance) => {
    const copy = makeInstance(run, instance.cardId, "enemy-recycle");
    run.nextInstanceNumber += 1;
    return copy;
  });
  const result = shuffle(recycled, battle.rngState);
  battle.rngState = result.state;
  battle.enemyDrawPile.push(...result.items);
}

function takeEnemyDraw(run: RunState, battle: BattleState): CardInstance | null {
  if (battle.enemyDrawPile.length === 0) refillEnemyDrawPile(run, battle);
  return battle.enemyDrawPile.shift() ?? null;
}

function drawForSpell(run: RunState, battle: BattleState, count: number, side: PlayerSide): void {
  for (let drawn = 0; drawn < count; drawn += 1) {
    const hand = side === "player" ? battle.hand : battle.enemyHand;
    const discard = side === "player" ? battle.discardPile : battle.enemyDiscardPile;
    const card = side === "player" ? takeDraw(run, battle) : takeEnemyDraw(run, battle);
    if (!card) return;
    if (hand.length < MAX_HAND) hand.push(card);
    else discard.push(card);
  }
}

function summonOnBoard(
  run: RunState,
  battle: BattleState,
  side: PlayerSide,
  cardId: string,
  count: number,
  fromCard?: CardInstance,
): RunState {
  const board = side === "player" ? battle.playerBoard : battle.enemyBoard;
  for (let index = 0; index < count && board.length < MAX_BOARD; index += 1) {
    const made = createMinion(run, cardId, side, battle.turnNumber, index === 0 ? fromCard : undefined);
    run = made.run;
    board.push(made.minion);
  }
  return run;
}

function triggerMinionEffect(run: RunState, minion: MinionState): RunState {
  const battle = run.battle;
  const effect = getCard(minion.cardId).minion?.effect;
  if (!battle || !effect) return run;
  const board = minion.owner === "player" ? battle.playerBoard : battle.enemyBoard;

  if (effect.kind === "battlecrySummon") {
    return summonOnBoard(run, battle, minion.owner, effect.cardId, effect.count);
  }
  if (effect.kind === "battlecryBuff") {
    const target = effect.target === "self"
      ? minion
      : board.find((candidate) => candidate.instanceId !== minion.instanceId) ?? minion;
    target.attack += effect.attack;
    target.maxHealth += effect.health;
    target.health += effect.health;
  }
  return run;
}

function removeDeadMinions(run: RunState, side: PlayerSide): RunState {
  const battle = run.battle;
  if (!battle) return run;
  const board = side === "player" ? battle.playerBoard : battle.enemyBoard;
  const survivors: MinionState[] = [];
  const fallen = board.filter((minion) => minion.health <= 0);
  for (const minion of board) if (minion.health > 0) survivors.push(minion);
  if (side === "player") battle.playerBoard = survivors;
  else battle.enemyBoard = survivors;

  for (const minion of fallen) {
    const discard = minion.owner === "player" ? battle.discardPile : battle.enemyDiscardPile;
    discard.push({ instanceId: minion.instanceId, cardId: minion.cardId });
    const effect = getCard(minion.cardId).minion?.effect;
    if (effect?.kind === "deathSummon") {
      run = summonOnBoard(run, battle, minion.owner, effect.cardId, effect.count);
    }
  }
  return run;
}

function validateTargetId(targetId: string | undefined): asserts targetId is string {
  if (!targetId) fail("INVALID_TARGET", "Select a valid target for this effect.");
}

function applySpellEffect(run: RunState, effect: SpellEffect, targetId?: string, caster: PlayerSide = "player"): RunState {
  const battle = run.battle;
  if (!battle) return run;
  const ownHero = caster === "player" ? battle.playerHero : battle.enemyHero;
  const opposingHero = caster === "player" ? battle.enemyHero : battle.playerHero;
  const ownBoard = caster === "player" ? battle.playerBoard : battle.enemyBoard;
  const opposingBoard = caster === "player" ? battle.enemyBoard : battle.playerBoard;

  switch (effect.kind) {
    case "damage": {
      if (caster === "player" && effect.target === "enemyHero") return dealDamageToEnemyHero(run, effect.amount);
      if (caster === "enemy" && battle.playerBoard.length === 0) return dealDamageToPlayerHero(run, effect.amount);
      validateTargetId(targetId);
      const target = opposingBoard.find((minion) => minion.instanceId === targetId);
      if (!target) fail("INVALID_TARGET", "The selected opposing minion is unavailable.");
      target.health -= effect.amount;
      return removeDeadMinions(run, caster === "player" ? "enemy" : "player");
    }
    case "heal": {
      if (effect.target === "playerHero") {
        ownHero.health = Math.min(ownHero.maxHealth, ownHero.health + effect.amount);
        return run;
      }
      validateTargetId(targetId);
      const target = ownBoard.find((minion) => minion.instanceId === targetId);
      if (!target) fail("INVALID_TARGET", "The selected friendly minion is unavailable.");
      target.health = Math.min(target.maxHealth, target.health + effect.amount);
      return run;
    }
    case "summon":
      return summonOnBoard(run, battle, caster, effect.cardId, effect.count);
    case "buff": {
      validateTargetId(targetId);
      const target = ownBoard.find((minion) => minion.instanceId === targetId);
      if (!target) fail("INVALID_TARGET", "The selected friendly minion is unavailable.");
      target.attack += effect.attack;
      target.maxHealth += effect.health;
      target.health += effect.health;
      return run;
    }
    case "draw":
      drawForSpell(run, battle, effect.count, caster);
      return run;
  }
}

function startPlayerTurn(run: RunState): RunState {
  const battle = run.battle;
  if (!battle || battle.status !== "active") return run;
  battle.turnNumber += 1;
  battle.activeSide = "player";
  // Normalize saved runs created under the previous, growing-cap rule.
  battle.playerMana.max = MAX_MANA;
  battle.playerMana.current = Math.min(MAX_MANA, battle.playerMana.current + 1);
  battle.playerBoard = battle.playerBoard.map((minion) => ({ ...minion, hasAttacked: false }));
  drawForPlayerTurn(run, battle);
  return run;
}

function selectEnemySpellTarget(effect: SpellEffect, battle: BattleState): string | undefined {
  if (effect.kind === "damage") {
    if (battle.playerBoard.length === 0) return undefined;
    return [...battle.playerBoard]
      .sort((left, right) => Number(right.health <= effect.amount) - Number(left.health <= effect.amount)
        || right.attack - left.attack || left.health - right.health)[0]?.instanceId;
  }
  if (effect.kind === "heal" && effect.target === "playerMinion") {
    return [...battle.enemyBoard]
      .filter((minion) => minion.health < minion.maxHealth)
      .sort((left, right) => (right.maxHealth - right.health) - (left.maxHealth - left.health))[0]?.instanceId;
  }
  if (effect.kind === "buff") {
    return [...battle.enemyBoard]
      .sort((left, right) => right.attack - left.attack || left.health - right.health)[0]?.instanceId;
  }
  return undefined;
}

function isEnemyCardPlayable(card: CardDefinition, battle: BattleState): boolean {
  if (card.cost > battle.enemyMana.current) return false;
  if (card.kind === "minion") return battle.enemyBoard.length < MAX_BOARD;
  return (card.spellEffects ?? []).every((effect) => {
    if (effect.kind === "summon") return battle.enemyBoard.length < MAX_BOARD;
    if (effect.kind === "buff") return battle.enemyBoard.length > 0;
    if (effect.kind === "heal" && effect.target === "playerMinion") return battle.enemyBoard.some((minion) => minion.health < minion.maxHealth);
    return true;
  });
}

function scoreEnemyCard(card: CardDefinition, battle: BattleState, enemy: EnemyDefinition): number {
  const effects = card.spellEffects ?? [];
  const ownBoard = battle.enemyBoard;
  let score = 25 + card.cost * 3;
  if (card.kind === "minion" && card.minion) {
    score += 24 + card.minion.attack * 2 + card.minion.maxHealth;
    if (card.minion.effect?.kind === "battlecrySummon") score += 14;
    if (ownBoard.length === 0) score += 18;
  }
  for (const effect of effects) {
    if (effect.kind === "damage") {
      const target = selectEnemySpellTarget(effect, battle);
      const minion = battle.playerBoard.find((candidate) => candidate.instanceId === target);
      score += minion ? 24 + minion.attack + (minion.health <= effect.amount ? 30 : 0) : 20 + effect.amount * 3;
      if (!minion && effect.amount >= battle.playerHero.health) score += 1000;
    } else if (effect.kind === "heal") {
      const missingHealth = battle.enemyHero.maxHealth - battle.enemyHero.health;
      const target = effect.target === "playerHero" ? missingHealth : Math.max(0, ...ownBoard.map((minion) => minion.maxHealth - minion.health));
      score += target > 0 ? 20 + Math.min(target, effect.amount) * 5 : 0;
    } else if (effect.kind === "summon") score += 30 + effect.count * 8;
    else if (effect.kind === "buff") score += 20 + Math.max(0, ...ownBoard.map((minion) => minion.attack)) * 2;
    else if (effect.kind === "draw") score += 15 + effect.count * 4;
  }
  const profile = enemy.tactics.profile;
  if ((profile === "aggressor" || profile === "hunter") && (card.kind === "minion" || effects.some((effect) => effect.kind === "damage"))) score += 16;
  if (profile === "summoner" && (card.kind === "minion" || effects.some((effect) => effect.kind === "summon"))) score += ownBoard.length < 3 ? 20 : 8;
  if ((profile === "controller" || profile === "drain") && effects.some((effect) => effect.kind === "heal" || effect.kind === "buff")) score += 18;
  if ((profile === "board-clear" || profile === "ravager") && effects.some((effect) => effect.kind === "damage")) score += 18;
  if (enemy.kind === "boss" && card.rewardTier === "boss") score += 5;
  return score;
}

function selectEnemyCard(battle: BattleState, enemy: EnemyDefinition): CardInstance | null {
  const playable = battle.enemyHand
    .map((instance, handSlot) => ({ instance, handSlot, card: getCard(instance.cardId) }))
    .filter(({ card }) => isEnemyCardPlayable(card, battle))
    .map((entry) => ({ ...entry, score: scoreEnemyCard(entry.card, battle, enemy) }));
  if (playable.length === 0) return null;
  const highest = Math.max(...playable.map((entry) => entry.score));
  const tied = playable.filter((entry) => entry.score === highest);
  if (tied.length === 1) return tied[0]!.instance;
  const picked = pickIndex(tied.length, battle.rngState);
  battle.rngState = picked.state;
  return tied[picked.value]!.instance;
}

function playEnemyCard(run: RunState, handInstanceId: string): RunState {
  const battle = run.battle;
  if (!battle) return run;
  const handSlot = battle.enemyHand.findIndex((card) => card.instanceId === handInstanceId);
  if (handSlot < 0) return run;
  const instance = battle.enemyHand[handSlot]!;
  const card = getCard(instance.cardId);
  if (!isEnemyCardPlayable(card, battle)) return run;
  battle.enemyHand.splice(handSlot, 1);
  battle.enemyMana.current -= card.cost;
  if (card.kind === "minion" && card.minion) {
    const before = new Set(battle.enemyBoard.map((minion) => minion.instanceId));
    const made = createMinion(run, card.id, "enemy", battle.turnNumber, instance);
    made.run.battle!.enemyBoard.push(made.minion);
    run = triggerMinionEffect(made.run, made.minion);
    const summonedIds = run.battle?.enemyBoard.filter((minion) => !before.has(minion.instanceId)).map((minion) => minion.instanceId) ?? [];
    run.battle?.enemyTurnEvents?.push({ type: "play-minion", cardId: card.id, instanceId: instance.instanceId, handSlot, summonedIds });
    return run;
  }

  battle.enemyDiscardPile.push(instance);
  const eventEffects: Array<{ kind: "damage" | "heal" | "summon" | "buff" | "draw"; targetId: string | null }> = [];
  for (const effect of card.spellEffects ?? []) {
    const targetId = selectEnemySpellTarget(effect, battle);
    const kind = effect.kind;
    run = applySpellEffect(run, effect, targetId, "enemy");
    eventEffects.push({ kind, targetId: targetId ?? null });
    if (run.status !== "active") break;
  }
  run.battle?.enemyTurnEvents?.push({ type: "cast-spell", cardId: card.id, instanceId: instance.instanceId, handSlot, effects: eventEffects });
  return run;
}

function resolveEnemyMinionAttacks(run: RunState): RunState {
  const battle = run.battle;
  if (!battle) return run;
  for (const attacker of battle.enemyBoard) {
    if (!run.battle || attacker.summonedTurn >= battle.turnNumber || attacker.hasAttacked) continue;
    const target = [...battle.playerBoard]
      .map((minion, index) => ({ minion, index }))
      .sort((left, right) => {
        const leftKillable = left.minion.health <= attacker.attack;
        const rightKillable = right.minion.health <= attacker.attack;
        return Number(rightKillable) - Number(leftKillable)
          || right.minion.attack - left.minion.attack
          || left.minion.health - right.minion.health
          || left.index - right.index;
      })[0]?.minion;
    if (target) {
      battle.enemyTurnEvents?.push({ type: "attack", cardId: attacker.cardId, attackerId: attacker.instanceId, targetId: target.instanceId });
      target.health -= attacker.attack;
      attacker.hasAttacked = true;
      run = removeDeadMinions(run, "player");
    } else {
      battle.enemyTurnEvents?.push({ type: "attack", cardId: attacker.cardId, attackerId: attacker.instanceId, targetId: battle.playerHero.id });
      attacker.hasAttacked = true;
      run = dealDamageToPlayerHero(run, attacker.attack);
      if (run.status !== "active") return run;
    }
  }
  return run;
}

function resolveBossAreaAttack(run: RunState): RunState {
  const battle = run.battle;
  if (!battle) return run;
  const targetMinionIds = battle.playerBoard.map((minion) => minion.instanceId);
  battle.enemyTurnEvents?.push({ type: "boss-area", damage: 1, targetMinionIds, targetHeroId: "player" });
  for (const minion of [...battle.playerBoard]) minion.health -= 1;
  run = removeDeadMinions(run, "player");
  return dealDamageToPlayerHero(run, 1);
}

function beginEncounter(run: RunState, encounterIndex: number, battleSeed: number): RunState {
  const encounter = run.encounters[encounterIndex];
  if (!encounter || encounter.status !== "pending") fail("ENCOUNTER_NOT_READY", "The next encounter is not pending.");
  const enemy = ENEMY_BY_ID.get(encounter.enemyId);
  if (!enemy) fail("INVALID_ACTION", `Unknown enemy: ${encounter.enemyId}`);

  encounter.status = "active";
  const shuffled = shuffle(run.deck, battleSeed);
  const enemyDeck = createEnemyDeck(enemy, shuffled.state, `${run.runId}-enemy-${encounterIndex + 1}`);
  const nextRun = { ...run, phase: encounter.phase, battle: null } as RunState;
  const battle: BattleState = {
    battleId: `${run.runId}-battle-${encounterIndex + 1}`,
    turnNumber: 1,
    activeSide: "player",
    playerHero: { id: "player", health: HERO_HEALTH, maxHealth: HERO_HEALTH },
    enemyHero: { id: "enemy", health: enemy.maxHealth, maxHealth: enemy.maxHealth },
    playerMana: { current: INITIAL_MANA, max: MAX_MANA },
    enemyMana: { current: INITIAL_MANA, max: MAX_MANA },
    hand: shuffled.items.slice(0, 3),
    drawPile: shuffled.items.slice(3),
    discardPile: [],
    enemyStarterDeck: enemyDeck.starterDeck,
    enemyHand: enemyDeck.shuffledDeck.slice(0, 3),
    enemyDrawPile: enemyDeck.shuffledDeck.slice(3),
    enemyDiscardPile: [],
    playerBoard: [],
    enemyBoard: [],
    enemyId: encounter.enemyId,
    rngState: enemyDeck.state,
    status: "active",
  };
  nextRun.battle = battle;
  return nextRun;
}

export function createRun(seed: number): RunState {
  const normalizedSeed = normalizeSeed(seed);
  let randomState = normalizedSeed;
  const encounters: EncounterState[] = [];
  for (let phase = 1 as 1 | 2 | 3; phase <= 3; phase = (phase + 1) as 1 | 2 | 3) {
    for (let normal = 0; normal < 3; normal += 1) {
      const picked = pickIndex(NORMAL_ENEMIES.length, randomState);
      randomState = picked.state;
      encounters.push({ phase, kind: "normal", enemyId: NORMAL_ENEMIES[picked.value]!.id, status: "pending" });
    }
    encounters.push({ phase, kind: "boss", enemyId: BOSSES[phase - 1]!.id, status: "pending" });
  }

  const starterDeck = STARTER_DECK_CARD_IDS.map((cardId, index) => ({ instanceId: `starter-template-${index + 1}`, cardId }));
  const deck = STARTER_DECK_CARD_IDS.map((cardId, index) => ({ instanceId: `card-${index + 1}`, cardId }));
  const run: RunState = {
    runId: `run-${normalizedSeed.toString(36)}`,
    seed: normalizedSeed,
    nextInstanceNumber: deck.length + 1,
    phase: 1,
    encounterInPhase: 0,
    completedBattles: 0,
    status: "active",
    deck,
    starterDeck,
    battle: null,
    pendingReward: null,
    encounters,
  };
  return beginEncounter(run, 0, randomState);
}

export function startBattle(run: RunState, enemyId: string): RunState {
  if (run.status !== "active" || run.battle) fail("ENCOUNTER_NOT_READY", "A new battle cannot start now.");
  const encounterIndex = run.encounters.findIndex((encounter) => encounter.status === "pending");
  if (encounterIndex < 0 || run.encounters[encounterIndex]?.enemyId !== enemyId) {
    fail("ENCOUNTER_NOT_READY", "The requested enemy is not the next encounter.");
  }
  return beginEncounter(cloneRun(run), encounterIndex, normalizeSeed(run.seed + run.completedBattles + 1));
}

export function playMinion(run: RunState, handInstanceId: string): RunState {
  const next = cloneRun(run);
  const battle = ensureMana(next, 0);
  const handIndex = battle.hand.findIndex((instance) => instance.instanceId === handInstanceId);
  if (handIndex < 0) fail("CARD_NOT_FOUND", "The card is not in the player's hand.");
  const card = getCard(battle.hand[handIndex]!.cardId);
  if (card.kind !== "minion" || !card.minion) fail("INVALID_ACTION", "This card is not a minion.");
  if (battle.playerBoard.length >= MAX_BOARD) fail("MAX_BOARD", "The player's board is full.");
  ensureMana(next, card.cost);

  const [instance] = battle.hand.splice(handIndex, 1);
  battle.playerMana.current -= card.cost;
  const made = createMinion(next, card.id, "player", battle.turnNumber, instance);
  made.run.battle!.playerBoard.push(made.minion);
  return triggerMinionEffect(made.run, made.minion);
}

export function castSpell(run: RunState, handInstanceId: string, targetId?: string): RunState {
  const next = cloneRun(run);
  const battle = ensureMana(next, 0);
  const handIndex = battle.hand.findIndex((instance) => instance.instanceId === handInstanceId);
  if (handIndex < 0) fail("CARD_NOT_FOUND", "The card is not in the player's hand.");
  const card = getCard(battle.hand[handIndex]!.cardId);
  if (card.kind !== "spell" || !card.spellEffects) fail("INVALID_ACTION", "This card is not a spell.");
  ensureMana(next, card.cost);
  for (const effect of card.spellEffects) {
    if (effect.kind === "summon" && battle.playerBoard.length >= MAX_BOARD) {
      fail("MAX_BOARD", "The player's board is full.");
    }
    if ((effect.kind === "buff" || (effect.kind === "heal" && effect.target === "playerMinion") || (effect.kind === "damage" && effect.target === "enemyMinion")) && !targetId) {
      fail("INVALID_TARGET", "Select a valid target for this spell.");
    }
  }

  const [instance] = battle.hand.splice(handIndex, 1);
  battle.discardPile.push(instance!);
  battle.playerMana.current -= card.cost;
  let current = next;
  for (const effect of card.spellEffects) {
    current = applySpellEffect(current, effect, targetId);
    if (current.status !== "active") return current;
  }
  return current;
}

export function attackWithMinion(run: RunState, attackerId: string, targetId: string): RunState {
  const next = cloneRun(run);
  const battle = assertPlayerTurn(next);
  const attacker = battle.playerBoard.find((minion) => minion.instanceId === attackerId);
  if (!attacker) fail("INVALID_ACTION", "The selected attacker is not on the player's board.");
  if (attacker.summonedTurn >= battle.turnNumber || attacker.hasAttacked) {
    fail("INVALID_ACTION", "This minion cannot attack again this turn.");
  }

  if (battle.enemyBoard.length > 0) {
    const target = battle.enemyBoard.find((minion) => minion.instanceId === targetId);
    if (!target) fail("INVALID_TARGET", "Attack an enemy minion while any are on the board.");
    target.health -= attacker.attack;
    attacker.hasAttacked = true;
    return removeDeadMinions(next, "enemy");
  }
  if (targetId !== battle.enemyHero.id) fail("INVALID_TARGET", "The enemy hero is the only available target.");
  attacker.hasAttacked = true;
  return dealDamageToEnemyHero(next, attacker.attack);
}

export function discardBeforeDraw(run: RunState, handInstanceId: string): RunState {
  const next = cloneRun(run);
  const battle = assertActiveRun(next);
  if (battle.activeSide !== "player" || !battle.pendingDiscardBeforeDraw) {
    fail("DISCARD_NOT_PENDING", "There is no full-hand discard to resolve.");
  }
  const index = battle.hand.findIndex((instance) => instance.instanceId === handInstanceId);
  if (index < 0) fail("CARD_NOT_FOUND", "Choose a card currently in the player's hand.");
  const [discarded] = battle.hand.splice(index, 1);
  battle.discardPile.push(discarded!);
  battle.pendingDiscardBeforeDraw = false;
  const card = takeDraw(next, battle);
  if (card) battle.hand.push(card);
  return next;
}

export function resolveEnemyTurn(run: RunState): RunState {
  let next = cloneRun(run);
  let battle = assertActiveRun(next);
  if (battle.activeSide !== "enemy") fail("WRONG_TURN", "The enemy turn is not active.");
  const enemy = ENEMY_BY_ID.get(battle.enemyId);
  if (!enemy) fail("INVALID_ACTION", `Unknown enemy: ${battle.enemyId}`);
  battle.enemyTurnEvents = [];
  delete (battle as BattleState & { pendingEnemyCharge?: unknown }).pendingEnemyCharge;
  battle.enemyMana.max = MAX_MANA;
  if (battle.turnNumber > 1) battle.enemyMana.current = Math.min(MAX_MANA, battle.enemyMana.current + 1);

  if (battle.enemyHand.length >= MAX_HAND) {
    const scored = battle.enemyHand.map((instance) => ({ instance, score: scoreEnemyCard(getCard(instance.cardId), battle, enemy) }));
    const lowest = Math.min(...scored.map((entry) => entry.score));
    const candidates = scored.filter((entry) => entry.score === lowest);
    const picked = candidates.length > 1 ? pickIndex(candidates.length, battle.rngState) : { value: 0, state: battle.rngState };
    battle.rngState = picked.state;
    const discarded = candidates[picked.value]!.instance;
    battle.enemyHand = battle.enemyHand.filter((card) => card.instanceId !== discarded.instanceId);
    battle.enemyDiscardPile.push(discarded);
  }
  const drawn = takeEnemyDraw(next, battle);
  if (drawn) battle.enemyHand.push(drawn);

  let plays = 0;
  while (plays < 30 && next.status === "active") {
    battle = next.battle!;
    const selected = selectEnemyCard(battle, enemy);
    if (!selected) break;
    const beforeHandSize = battle.enemyHand.length;
    next = playEnemyCard(next, selected.instanceId);
    plays += 1;
    if (next.status !== "active" || !next.battle) return next;
    if (next.battle.enemyHand.length >= beforeHandSize && plays >= 30) break;
  }

  battle = next.battle!;
  if (enemy.kind === "boss" && battle.turnNumber % 3 === 0) {
    next = resolveBossAreaAttack(next);
    if (next.status !== "active" || !next.battle) return next;
  }
  next = resolveEnemyMinionAttacks(next);
  if (next.status !== "active" || !next.battle) return next;
  return startPlayerTurn(next);
}

export function endPlayerTurn(run: RunState): RunState {
  const next = cloneRun(run);
  const battle = assertPlayerTurn(next);
  battle.activeSide = "enemy";
  battle.enemyBoard = battle.enemyBoard.map((minion) => ({ ...minion, hasAttacked: false }));
  return resolveEnemyTurn(next);
}

export function chooseReward(run: RunState, cardId: string): RunState {
  if (run.pendingVictoryAcknowledgement) fail("ENCOUNTER_NOT_READY", "Acknowledge the battle victory before choosing a reward.");
  if (!run.pendingReward) fail("REWARD_NOT_PENDING", "There is no card reward to choose.");
  if (!run.pendingReward.choices.includes(cardId)) fail("INVALID_TARGET", "Choose one of the offered cards.");
  const next = cloneRun(run);
  const counts = cardCounts(next.deck);
  if ((counts.get(cardId) ?? 0) >= 2) fail("MAX_COPIES", "The run deck already has two copies of this card.");
  next.deck.push(makeInstance(next, cardId, "reward"));
  next.nextInstanceNumber += 1;
  next.pendingReward = null;
  return next;
}

export function skipReward(run: RunState): RunState {
  if (run.pendingVictoryAcknowledgement) fail("ENCOUNTER_NOT_READY", "Acknowledge the battle victory before skipping the reward.");
  if (!run.pendingReward) fail("REWARD_NOT_PENDING", "There is no card reward to skip.");
  const next = cloneRun(run);
  next.pendingReward = null;
  return next;
}

export function acknowledgeVictory(run: RunState): RunState {
  if (!run.pendingReward || run.pendingVictoryAcknowledgement !== true) {
    fail("ENCOUNTER_NOT_READY", "There is no battle victory waiting for acknowledgement.");
  }
  const next = cloneRun(run);
  next.pendingVictoryAcknowledgement = false;
  return next;
}

export function advanceRun(run: RunState, nextSeed: number): RunState {
  if (run.status !== "active" || run.pendingReward || !run.battle || run.battle.status !== "playerWon") {
    fail("ENCOUNTER_NOT_READY", "Resolve the battle reward before advancing.");
  }
  const encounterIndex = run.encounters.findIndex((encounter) => encounter.status === "pending");
  if (encounterIndex < 0) {
    return { ...cloneRun(run), status: "victory", battle: null };
  }
  return beginEncounter(cloneRun(run), encounterIndex, normalizeSeed(nextSeed));
}

export const gameConstants = {
  maxBoard: MAX_BOARD,
  maxHand: MAX_HAND,
  heroHealth: HERO_HEALTH,
  initialMana: INITIAL_MANA,
  maxMana: MAX_MANA,
} as const;
