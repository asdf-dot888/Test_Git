import { BOSSES, CARD_BY_ID, CARD_CATALOG, ENEMY_BY_ID, NORMAL_ENEMIES, STARTER_DECK_CARD_IDS } from "./catalog.js";
import { GameRuleError } from "./errors.js";
import { normalizeSeed, pickIndex, shuffle } from "./random.js";
import type {
  BattleState,
  CardDefinition,
  CardInstance,
  EncounterState,
  EnemyAction,
  EnemyChargeState,
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
  delete current.pendingEnemyCharge;
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

function drawForSpell(run: RunState, battle: BattleState, count: number): void {
  for (let drawn = 0; drawn < count; drawn += 1) {
    const card = takeDraw(run, battle);
    if (!card) return;
    if (battle.hand.length < MAX_HAND) battle.hand.push(card);
    else battle.discardPile.push(card);
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
    battle.discardPile.push({ instanceId: minion.instanceId, cardId: minion.cardId });
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

function applySpellEffect(run: RunState, effect: SpellEffect, targetId?: string): RunState {
  const battle = run.battle;
  if (!battle) return run;

  switch (effect.kind) {
    case "damage": {
      if (effect.target === "enemyHero") return dealDamageToEnemyHero(run, effect.amount);
      validateTargetId(targetId);
      const target = battle.enemyBoard.find((minion) => minion.instanceId === targetId);
      if (!target) fail("INVALID_TARGET", "The selected enemy minion is unavailable.");
      target.health -= effect.amount;
      return removeDeadMinions(run, "enemy");
    }
    case "heal": {
      if (effect.target === "playerHero") {
        battle.playerHero.health = Math.min(battle.playerHero.maxHealth, battle.playerHero.health + effect.amount);
        return run;
      }
      validateTargetId(targetId);
      const target = battle.playerBoard.find((minion) => minion.instanceId === targetId);
      if (!target) fail("INVALID_TARGET", "The selected friendly minion is unavailable.");
      target.health = Math.min(target.maxHealth, target.health + effect.amount);
      return run;
    }
    case "summon":
      return summonOnBoard(run, battle, "player", effect.cardId, effect.count);
    case "buff": {
      validateTargetId(targetId);
      const target = battle.playerBoard.find((minion) => minion.instanceId === targetId);
      if (!target) fail("INVALID_TARGET", "The selected friendly minion is unavailable.");
      target.attack += effect.attack;
      target.maxHealth += effect.health;
      target.health += effect.health;
      return run;
    }
    case "draw":
      drawForSpell(run, battle, effect.count);
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

function eligibleEnemyActions(enemyId: string, battle: BattleState): EnemyAction[] {
  const enemy = ENEMY_BY_ID.get(enemyId);
  if (!enemy) fail("INVALID_ACTION", `Unknown enemy: ${enemyId}`);
  return enemy.actions.filter((action) => action.kind !== "summon" || battle.enemyBoard.length < MAX_BOARD);
}

function scoreEnemyAction(action: EnemyAction, enemy: EnemyDefinition, battle: BattleState): number {
  const profile = enemy.tactics.profile;
  if (action.kind === "summon") {
    let score = battle.enemyBoard.length === 0 ? 50 : battle.enemyBoard.length === 1 ? 25 : battle.enemyBoard.length >= MAX_BOARD ? -100 : 0;
    if (profile === "summoner" && battle.enemyBoard.length < 3) score += 25;
    if (profile === "controller" && battle.playerBoard.length >= 3 && battle.enemyBoard.length < 2) score += 30;
    return score;
  }
  if (action.kind === "heroDamage") {
    let score = profile === "aggressor" ? 40 : 25;
    if (battle.playerHero.health <= Math.floor(battle.playerHero.maxHealth / 3)) score += 30;
    if (profile === "hunter" && battle.playerBoard.length === 0) score += 25;
    return score;
  }

  const effectIsRelevant = action.effectId === "blood-tithe"
    ? battle.enemyHero.health < Math.floor(battle.enemyHero.maxHealth / 2)
    : (action.effectId === "bone-storm" || action.effectId === "void-pulse") && battle.playerBoard.length >= 2;
  return effectIsRelevant ? 60 : 10;
}

function selectEnemyAction(actions: readonly EnemyAction[], enemy: EnemyDefinition, battle: BattleState): EnemyAction | null {
  if (actions.length === 0) return null;
  const scored = actions.map((action) => ({ action, score: scoreEnemyAction(action, enemy, battle) }));
  const highest = Math.max(...scored.map((candidate) => candidate.score));
  const tied = scored.filter((candidate) => candidate.score === highest);
  if (tied.length === 1) return tied[0]!.action;
  const choice = pickIndex(tied.length, battle.rngState);
  battle.rngState = choice.state;
  return tied[choice.value]!.action;
}

function playerBoardWillBeCleared(action: EnemyAction, battle: BattleState): boolean {
  if (battle.playerBoard.length === 0) return true;
  if (action.kind !== "bossEffect" || action.effectId === "blood-tithe") return false;
  const damage = action.effectId === "bone-storm" ? action.amount : Math.max(1, Math.floor(action.amount / 2));
  return battle.playerBoard.every((minion) => minion.health <= damage);
}

function isGuaranteedLethalAction(action: EnemyAction, battle: BattleState): boolean {
  const immediateDamage = action.kind === "heroDamage" || action.kind === "bossEffect" ? action.amount : 0;
  if (immediateDamage >= battle.playerHero.health) return true;
  if (!playerBoardWillBeCleared(action, battle)) return false;
  const faceDamage = battle.enemyBoard
    .filter((minion) => minion.summonedTurn < battle.turnNumber && !minion.hasAttacked)
    .reduce((total, minion) => total + minion.attack, 0);
  return immediateDamage + faceDamage >= battle.playerHero.health;
}

function chargeTriggerMet(enemy: EnemyDefinition, battle: BattleState): boolean {
  switch (enemy.tactics.chargeTrigger) {
    case "hero-at-half":
      return battle.playerHero.health <= Math.floor(battle.playerHero.maxHealth / 2);
    case "board-empty":
      return battle.playerBoard.length === 0;
    case "board-wide":
      return battle.playerBoard.length >= 3;
    case "hero-low-and-board-empty":
      return battle.playerHero.health <= Math.floor(battle.playerHero.maxHealth / 2) && battle.playerBoard.length === 0;
    case "turn-four":
      return battle.turnNumber >= 4;
  }
}

function startEnemyCharge(enemy: EnemyDefinition, battle: BattleState): void {
  const charge: EnemyChargeState = {
    turnsRemaining: enemy.tactics.chargeDelayTurns,
    damage: enemy.tactics.chargeDamage,
    target: enemy.kind === "boss" ? "board-and-hero" : "hero",
  };
  battle.pendingEnemyCharge = charge;
}

function resolveEnemyCharge(run: RunState, charge: EnemyChargeState): RunState {
  const battle = run.battle;
  if (!battle) return run;
  if (charge.target === "board-and-hero") {
    for (const minion of battle.playerBoard) minion.health -= charge.damage;
    run = removeDeadMinions(run, "player");
  }
  return dealDamageToPlayerHero(run, charge.damage);
}

function applyBossEffect(run: RunState, effectId: string, amount: number): RunState {
  const battle = run.battle;
  if (!battle) return run;
  switch (effectId) {
    case "blood-tithe":
      battle.enemyHero.health = Math.min(battle.enemyHero.maxHealth, battle.enemyHero.health + amount);
      return dealDamageToPlayerHero(run, amount);
    case "bone-storm":
      for (const minion of battle.playerBoard) minion.health -= amount;
      run = removeDeadMinions(run, "player");
      return dealDamageToPlayerHero(run, amount);
    case "void-pulse":
      for (const minion of battle.playerBoard) minion.health -= Math.max(1, Math.floor(amount / 2));
      run = removeDeadMinions(run, "player");
      return dealDamageToPlayerHero(run, amount);
    default:
      fail("INVALID_ACTION", `Unknown boss effect: ${effectId}`);
  }
}

function applyEnemyAction(run: RunState, action: EnemyAction): RunState {
  const battle = run.battle;
  if (!battle) return run;
  if (action.kind === "heroDamage") return dealDamageToPlayerHero(run, action.amount);
  if (action.kind === "summon") return summonOnBoard(run, battle, "enemy", action.cardId, 1);
  return applyBossEffect(run, action.effectId, action.amount);
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
      target.health -= attacker.attack;
      attacker.hasAttacked = true;
      run = removeDeadMinions(run, "player");
    } else {
      attacker.hasAttacked = true;
      run = dealDamageToPlayerHero(run, attacker.attack);
      if (run.status !== "active") return run;
    }
  }
  return run;
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
  const next = cloneRun(run);
  const battle = assertActiveRun(next);
  if (battle.activeSide !== "enemy") fail("WRONG_TURN", "The enemy turn is not active.");
  const enemy = ENEMY_BY_ID.get(battle.enemyId);
  if (!enemy) fail("INVALID_ACTION", `Unknown enemy: ${battle.enemyId}`);
  const pendingCharge = battle.pendingEnemyCharge ?? null;
  if (pendingCharge) {
    const turnsRemaining = pendingCharge.turnsRemaining - 1;
    if (turnsRemaining > 0) {
      battle.pendingEnemyCharge = { ...pendingCharge, turnsRemaining };
      run = next;
    } else {
      battle.pendingEnemyCharge = null;
      run = resolveEnemyCharge(next, pendingCharge);
      if (run.status !== "active") return run;
    }
  } else {
    const actions = eligibleEnemyActions(battle.enemyId, battle);
    const lethalActions = actions.filter((action) => isGuaranteedLethalAction(action, battle));
    if (lethalActions.length > 0) {
      const lethal = selectEnemyAction(lethalActions, enemy, battle);
      if (lethal) {
        run = applyEnemyAction(next, lethal);
        if (run.status !== "active") return run;
      }
    } else if (chargeTriggerMet(enemy, battle)) {
      startEnemyCharge(enemy, battle);
      run = next;
    } else {
      const selected = selectEnemyAction(actions, enemy, battle);
      run = selected ? applyEnemyAction(next, selected) : next;
      if (run.status !== "active") return run;
    }
  }

  run = resolveEnemyMinionAttacks(run);
  if (run.status !== "active") return run;
  return startPlayerTurn(run);
}

export function endPlayerTurn(run: RunState): RunState {
  const next = cloneRun(run);
  const battle = assertPlayerTurn(next);
  battle.activeSide = "enemy";
  battle.enemyBoard = battle.enemyBoard.map((minion) => ({ ...minion, hasAttacked: false }));
  return resolveEnemyTurn(next);
}

export function chooseReward(run: RunState, cardId: string): RunState {
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
  if (!run.pendingReward) fail("REWARD_NOT_PENDING", "There is no card reward to skip.");
  const next = cloneRun(run);
  next.pendingReward = null;
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
