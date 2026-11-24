import { BOSSES, CARD_BY_ID, COIN_CARD_ID, CARD_CATALOG, ENEMY_BY_ID, FUSION_RECIPES, NORMAL_ENEMIES_BY_PHASE, PLAYER_CLASS_DEFINITIONS, SHARED_STARTER_CARD_IDS } from "./catalog.js";
import { GameRuleError } from "./errors.js";
import { normalizeSeed, pickIndex, shuffle } from "./random.js";
import type {
  BattleState,
  CardDefinition,
  CardInstance,
  EncounterState,
  EnemyCombatRecord,
  EnemyDefinition,
  EnemyTurnPlaybackStep,
  EnemyTurnResolution,
  MinionState,
  PlayerClass,
  PlayerSide,
  RunState,
  RunDifficulty,
  SpellEffect,
  TurnOrderRole,
} from "./types.js";

const MAX_HAND = 10;
const MAX_BOARD = 6;
const HERO_HEALTH = 30;
const MAX_MANA = 10;
/** Hearthstone rule: the maximum mana of turn n is min(10, n) and it is refilled completely every turn; unspent mana does not carry over. */
function manaCapForTurn(turnNumber: number): number {
  return Math.min(MAX_MANA, Math.max(1, turnNumber));
}
const INITIAL_MANA = manaCapForTurn(1);
/** Cards each side draws at the start of its own turn (Hearthstone); cards beyond the hand limit go to the discard pile. */
const TURN_DRAW_COUNT = 1;
/** The cost up to which hard enemy decks favor cards when they are built (the old starting mana). */
const CHEAP_CARD_COST = 5;
/** The boss area attack comes every Nth turn: every 4th on normal, every 3rd on hard. */
export const BOSS_AREA_ATTACK_EVERY_N_TURNS: Record<RunDifficulty, number> = { normal: 4, hard: 3 };
const SOUL_SHARD_HERO_POWER_COST = 2;
type PhaseTable = Record<RunState["phase"], number>;
interface EnemyPhaseBonus {
  heroHealth: PhaseTable;
  minionAttack: PhaseTable;
  minionHealth: PhaseTable;
}

// Per-difficulty enemy bonuses by expedition phase. They never apply to the first battle of a run
// (phase 1 with no completed battles; later phases always follow completed battles in real runs).
// Enemy minions keep the health of the same card the player uses (minionHealth stays 0); difficulty comes from attack, hero health, mana and smarter play.
const ENEMY_PHASE_BONUS: Record<RunDifficulty, EnemyPhaseBonus> = {
  normal: {
    heroHealth: { 1: 0, 2: 0, 3: 0 },
    minionAttack: { 1: 0, 2: 0, 3: 0 },
    minionHealth: { 1: 0, 2: 0, 3: 0 },
  },
  hard: {
    heroHealth: { 1: 0, 2: 0, 3: 0 },
    minionAttack: { 1: 1, 2: 1, 3: 1 },
    minionHealth: { 1: 0, 2: 0, 3: 0 },
  },
};

function enemyPhaseBonus(difficulty: RunDifficulty, phase: RunState["phase"], completedBattles: number, kind: keyof EnemyPhaseBonus): number {
  return phase === 1 && completedBattles === 0 ? 0 : ENEMY_PHASE_BONUS[difficulty][kind][phase];
}

function fail(code: ConstructorParameters<typeof GameRuleError>[0], message: string): never {
  throw new GameRuleError(code, message);
}

/** True for a minion whose card has the taunt keyword. */
export function hasTaunt(minion: Pick<MinionState, "cardId">): boolean {
  return CARD_BY_ID.get(minion.cardId)?.minion?.taunt === true;
}

/**
 * Hearthstone attack legality: while the opposing board holds a taunt minion only taunt minions can be attacked (not the hero);
 * otherwise every opposing minion and the hero can be attacked. Spells and hero powers ignore taunt.
 */
function legalAttackTargets(battle: BattleState, attackerSide: PlayerSide): { minions: MinionState[]; heroAllowed: boolean } {
  const opposing = attackerSide === "player" ? battle.enemyBoard : battle.playerBoard;
  const taunts = opposing.filter(hasTaunt);
  return taunts.length > 0 ? { minions: taunts, heroAllowed: false } : { minions: [...opposing], heroAllowed: true };
}

/** The ids a minion of `attackerSide` may attack right now (shared by the engine and the UI). */
export function getLegalAttackTargets(battle: BattleState, attackerSide: PlayerSide): { minionIds: string[]; heroAllowed: boolean } {
  const legal = legalAttackTargets(battle, attackerSide);
  return { minionIds: legal.minions.map(({ instanceId }) => instanceId), heroAllowed: legal.heroAllowed };
}

function cloneRun(run: RunState): RunState {
  return structuredClone(run);
}

function consumeOpeningHandRedraw(run: RunState): RunState {
  if (run.openingHandRedrawAvailable) run.openingHandRedrawAvailable = false;
  return run;
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

function assertTurnOrderChosen(battle: BattleState): void {
  if (battle.firstSide === null) fail("TURN_ORDER_PENDING", "Choose who plays first before the battle starts.");
}

function assertPlayerTurn(run: RunState): BattleState {
  const battle = assertActiveRun(run);
  assertTurnOrderChosen(battle);
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

function enemyCardWeight(card: CardDefinition, enemy: EnemyDefinition, difficulty: RunDifficulty): number {
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
  if (difficulty === "hard") {
    if (card.cost <= CHEAP_CARD_COST) weight += 2;
    if (effects.some((effect) => effect.kind === "damage" || effect.kind === "damageAllEnemyMinions")) weight += 3;
    if (minion?.attack && minion.attack >= 3) weight += 2;
  }
  return weight;
}

function createEnemyDeck(enemy: EnemyDefinition, seed: number, idPrefix: string, difficulty: RunDifficulty): { starterDeck: CardInstance[]; shuffledDeck: CardInstance[]; state: number } {
  const starterDeck: CardInstance[] = [];
  const counts = new Map<string, number>();
  let state = normalizeSeed(seed);
  const hardBossCards = CARD_CATALOG.filter((card) => card.enemyOnly && card.bossId === enemy.id);
  const guaranteedCards = difficulty === "hard" && enemy.kind === "boss" ? hardBossCards : [];
  for (const card of guaranteedCards) {
    starterDeck.push({ instanceId: `${idPrefix}-${starterDeck.length + 1}`, cardId: card.id });
    counts.set(card.id, 1);
  }
  while (starterDeck.length < 30) {
    const candidates = CARD_CATALOG
      .filter((card) => !card.playerOnly && !card.enemyOnly && !card.classId && !card.tokenOnly && (counts.get(card.id) ?? 0) < 2)
      .map((card) => ({ card, weight: enemyCardWeight(card, enemy, difficulty) }));
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
  const hasClassResources = Number.isInteger(battle.playerArmor) && Number.isInteger(battle.soulShards) && typeof battle.heroPowerUsed === "boolean";
  const hasTemporaryMana = Number.isInteger(battle.playerMana?.temporary) && Number.isInteger(battle.enemyMana?.temporary);
  const hasObsoleteCharge = Object.prototype.hasOwnProperty.call(battle, "pendingEnemyCharge");
  const hasFatigue = Number.isInteger(battle.playerFatigue) && Number.isInteger(battle.enemyFatigue);
  const hasTurnOrder = battle.firstSide !== undefined;
  if (hasEnemyZones && hasClassResources && hasTemporaryMana && hasFatigue && hasTurnOrder && !hasObsoleteCharge && run.openingHandRedrawAvailable !== undefined) return run;

  const next = cloneRun(run);
  next.openingHandRedrawAvailable ??= false;
  const current = next.battle!;
  if (!hasEnemyZones) {
    const enemy = ENEMY_BY_ID.get(current.enemyId);
    if (!enemy) fail("INVALID_ACTION", `Unknown enemy: ${current.enemyId}`);
    const generated = createEnemyDeck(enemy, current.rngState, `${current.battleId}-enemy-card`, next.difficulty);
    current.enemyMana = { current: INITIAL_MANA, max: INITIAL_MANA, temporary: 0 };
    current.enemyStarterDeck = generated.starterDeck;
    current.enemyHand = generated.shuffledDeck.slice(0, 3);
    current.enemyDrawPile = generated.shuffledDeck.slice(3);
    current.enemyDiscardPile = [];
    current.rngState = generated.state;
  }
  current.playerMana.temporary ??= 0;
  current.enemyMana.temporary ??= 0;
  current.playerArmor ??= 0;
  current.soulShards ??= 0;
  current.heroPowerUsed ??= false;
  current.playerFatigue ??= 0;
  current.enemyFatigue ??= 0;
  // A battle saved before the turn-order pick existed was always player-first.
  if (current.firstSide === undefined) current.firstSide = "player";
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
  const attackBonus = owner === "enemy" ? enemyPhaseBonus(run.difficulty, run.phase, run.completedBattles, "minionAttack") : 0;
  const healthBonus = owner === "enemy" ? enemyPhaseBonus(run.difficulty, run.phase, run.completedBattles, "minionHealth") : 0;
  return {
    run: nextRun,
    minion: {
      instanceId: instance.instanceId,
      cardId,
      owner,
      attack: definition.minion.attack + attackBonus,
      health: definition.minion.maxHealth + healthBonus,
      maxHealth: definition.minion.maxHealth + healthBonus,
      summonedTurn: turnNumber,
      hasAttacked: false,
    },
  };
}

function dealDamageToPlayerHero(run: RunState, amount: number, deferDefeat = false): RunState {
  const battle = run.battle;
  if (!battle) return run;
  const absorbed = Math.min(battle.playerArmor, amount);
  battle.playerArmor -= absorbed;
  battle.playerHero.health = Math.max(0, battle.playerHero.health - (amount - absorbed));
  if (battle.playerHero.health === 0 && !deferDefeat) return finishDefeat(run);
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
    .filter((card) => card.rewardTier === tier
      && !card.tokenOnly
      && !card.enemyOnly
      && (run.playerClass ? (!card.classId || card.classId === run.playerClass) : !card.classId)
      && (counts.get(card.id) ?? 0) < 2)
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
  }
  return next;
}

function ensureMana(run: RunState, cost: number): BattleState {
  const battle = assertPlayerTurn(run);
  if (battle.playerMana.current < cost) fail("INSUFFICIENT_MANA", "Not enough mana to play this card.");
  return battle;
}

function spendMana(battle: BattleState, side: PlayerSide, cost: number): void {
  const mana = side === "player" ? battle.playerMana : battle.enemyMana;
  mana.current -= cost;
  mana.temporary -= Math.min(mana.temporary, cost);
}

function expireTemporaryMana(mana: BattleState["playerMana"]): void {
  mana.current -= mana.temporary;
  mana.temporary = 0;
}

/**
 * The opening hand is the first `handSize` cards of the shuffled deck (3 for the first player, 4 for the second), except that
 * it always holds a card the player can pay for on turn 1 (cost 1 or less, as turn 1 has 1 mana): if there is none, the first
 * such card of the deck replaces the last card of the hand.
 */
function openingHandAndDrawPile(shuffled: CardInstance[], handSize = 3): { hand: CardInstance[]; drawPile: CardInstance[] } {
  const hand = shuffled.slice(0, handSize);
  const rest = shuffled.slice(handSize);
  const isCheap = (card: CardInstance) => getCard(card.cardId).cost <= INITIAL_MANA;
  if (!hand.some(isCheap)) {
    const cheapIndex = rest.findIndex(isCheap);
    if (cheapIndex >= 0 && hand.length === handSize) {
      const [cheap] = rest.splice(cheapIndex, 1);
      rest.splice(cheapIndex, 0, hand[handSize - 1]!);
      hand[handSize - 1] = cheap!;
    }
  }
  return { hand, drawPile: rest };
}

/**
 * Fatigue (Hearthstone): drawing from an empty draw pile does not reshuffle anything; it deals 1, then 2, then 3, ...
 * damage to the drawing side's hero. Armor absorbs it for the player.
 */
function applyFatigue(run: RunState, side: PlayerSide, deferDefeat = false): RunState {
  const battle = run.battle;
  if (!battle) return run;
  if (side === "player") {
    battle.playerFatigue = (battle.playerFatigue ?? 0) + 1;
    return dealDamageToPlayerHero(run, battle.playerFatigue, deferDefeat);
  }
  battle.enemyFatigue = (battle.enemyFatigue ?? 0) + 1;
  return dealDamageToEnemyHero(run, battle.enemyFatigue);
}

/** Draws one card for a side into its hand (overflow goes to its discard pile), or applies fatigue when its draw pile is empty. */
function drawIntoHand(run: RunState, side: PlayerSide, deferDefeat = false): RunState {
  const battle = run.battle;
  if (!battle) return run;
  const pile = side === "player" ? battle.drawPile : battle.enemyDrawPile;
  const card = pile.shift();
  if (!card) return applyFatigue(run, side, deferDefeat);
  const hand = side === "player" ? battle.hand : battle.enemyHand;
  const discard = side === "player" ? battle.discardPile : battle.enemyDiscardPile;
  if (hand.length < MAX_HAND) hand.push(card);
  else discard.push(card);
  return run;
}

function drawForSpell(run: RunState, count: number, side: PlayerSide, deferDefeat = false): RunState {
  for (let drawn = 0; drawn < count; drawn += 1) {
    run = drawIntoHand(run, side, deferDefeat);
    if (run.status !== "active" || run.battle?.status !== "active") break;
  }
  return run;
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
    if (minion.owner === "enemy" && run.playerClass === "demonist") {
      battle.soulShards = Math.min(6, battle.soulShards + 1);
    }
    const effect = getCard(minion.cardId).minion?.effect;
    if (effect?.kind === "deathSummon") {
      run = summonOnBoard(run, battle, minion.owner, effect.cardId, effect.count);
    }
  }
  return run;
}

function applyMinionCombatDamage(attacker: MinionState, defender: MinionState): void {
  const attackerDamage = attacker.attack;
  const defenderDamage = defender.attack;
  defender.health -= attackerDamage;
  attacker.health -= defenderDamage;
}

function validateTargetId(targetId: string | undefined): asserts targetId is string {
  if (!targetId) fail("INVALID_TARGET", "Select a valid target for this effect.");
}

type TargetedDamageEffect = Extract<SpellEffect, { kind: "damage" | "randomDamage" | "cleave" }>;

function validateDamageSpellTarget(battle: BattleState, effect: TargetedDamageEffect, targetId: string | undefined, caster: PlayerSide): void {
  const opposingHero = caster === "player" ? battle.enemyHero : battle.playerHero;
  const heroTargetId = caster === "player" ? "enemy-hero" : "player-hero";
  if (effect.kind === "damage" && effect.target === "enemyHero") {
    if (targetId === undefined || targetId === opposingHero.id || targetId === heroTargetId) return;
    fail("INVALID_TARGET", "This spell can only target the opposing hero.");
  }
  if (effect.kind === "randomDamage" && targetId === heroTargetId) return;
  const opposingBoard = caster === "player" ? battle.enemyBoard : battle.playerBoard;
  if (!opposingBoard.some((minion) => minion.instanceId === targetId && minion.health > 0)) {
    fail("INVALID_TARGET", "Select a living opposing minion or an allowed hero target.");
  }
}

function applySpellEffect(
  run: RunState,
  effect: SpellEffect,
  targetId?: string,
  caster: PlayerSide = "player",
  deferDefeat = false,
  resolved?: { amount?: number; transferredCardInstanceId?: string },
): RunState {
  const battle = run.battle;
  if (!battle) return run;
  const ownHero = caster === "player" ? battle.playerHero : battle.enemyHero;
  const ownBoard = caster === "player" ? battle.playerBoard : battle.enemyBoard;
  const opposingBoard = caster === "player" ? battle.enemyBoard : battle.playerBoard;

  if (effect.kind === "damage" || effect.kind === "randomDamage" || effect.kind === "cleave") {
    validateDamageSpellTarget(battle, effect, targetId, caster);
  }
  switch (effect.kind) {
    case "damage": {
      if (effect.target === "enemyHero") {
        return caster === "player" ? dealDamageToEnemyHero(run, effect.amount) : dealDamageToPlayerHero(run, effect.amount, deferDefeat);
      }
      validateTargetId(targetId);
      const target = opposingBoard.find((minion) => minion.instanceId === targetId);
      if (!target) fail("INVALID_TARGET", "The selected opposing minion is unavailable.");
      target.health -= effect.amount;
      return removeDeadMinions(run, caster === "player" ? "enemy" : "player");
    }
    case "randomDamage": {
      const picked = pickIndex(effect.max - effect.min + 1, battle.rngState);
      battle.rngState = picked.state;
      const amount = effect.min + picked.value;
      if (resolved) resolved.amount = amount;
      if (targetId === "enemy-hero" && caster === "player") return dealDamageToEnemyHero(run, amount);
      if (targetId === "player-hero" && caster === "enemy") return dealDamageToPlayerHero(run, amount, deferDefeat);
      const target = opposingBoard.find((minion) => minion.instanceId === targetId);
      if (!target) fail("INVALID_TARGET", "Select an opposing minion or hero for random damage.");
      target.health -= amount;
      return removeDeadMinions(run, caster === "player" ? "enemy" : "player");
    }
    case "cleave": {
      validateTargetId(targetId);
      const snapshot = [...opposingBoard];
      const center = snapshot.findIndex((minion) => minion.instanceId === targetId);
      if (center < 0) fail("INVALID_TARGET", "Select a living opposing minion for cleave.");
      const sideDamage = Math.max(1, Math.floor(effect.amount / 2));
      snapshot[center]!.health -= effect.amount;
      if (snapshot[center - 1]) snapshot[center - 1]!.health -= sideDamage;
      if (snapshot[center + 1]) snapshot[center + 1]!.health -= sideDamage;
      return removeDeadMinions(run, caster === "player" ? "enemy" : "player");
    }
    case "stealFromOpponentDeck": {
      const hand = caster === "player" ? battle.hand : battle.enemyHand;
      if (hand.length >= MAX_HAND) fail("MAX_HAND", "The hand is full; a card cannot be stolen.");
      const pile = caster === "player" ? battle.enemyDrawPile : battle.drawPile;
      if (pile.length === 0) return run;
      const picked = pickIndex(pile.length, battle.rngState);
      battle.rngState = picked.state;
      const [stolen] = pile.splice(picked.value, 1);
      if (stolen) {
        hand.push(stolen);
        if (resolved) resolved.transferredCardInstanceId = stolen.instanceId;
      }
      return run;
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
      return drawForSpell(run, effect.count, caster, deferDefeat);
    case "gainMana": {
      // Like Hearthstone's Coin: extra mana for this turn only, up to 10 in total.
      const mana = caster === "player" ? battle.playerMana : battle.enemyMana;
      const gained = Math.max(0, Math.min(effect.amount, MAX_MANA - mana.current));
      mana.current += gained;
      mana.temporary += gained;
      return run;
    }
    case "discardRandom": {
      const hand = caster === "player" ? battle.hand : battle.enemyHand;
      if (hand.length === 0) return run;
      const picked = pickIndex(hand.length, battle.rngState);
      battle.rngState = picked.state;
      const [discarded] = hand.splice(picked.value, 1);
      if (discarded) {
        const discardPile = caster === "player" ? battle.discardPile : battle.enemyDiscardPile;
        discardPile.push(discarded);
      }
      return run;
    }
    case "gainTemporaryMana": {
      const mana = caster === "player" ? battle.playerMana : battle.enemyMana;
      mana.current += effect.amount;
      mana.temporary += effect.amount;
      return run;
    }
    case "rootMinion": {
      validateTargetId(targetId);
      const target = opposingBoard.find((minion) => minion.instanceId === targetId);
      if (!target) fail("INVALID_TARGET", "The selected opposing minion is unavailable.");
      target.statusEffects = [...(target.statusEffects ?? []).filter((status) => status.kind !== "root"), { kind: "root", turnsRemaining: effect.turns }];
      return run;
    }
    case "curseAllEnemyMinions": {
      for (const target of opposingBoard) {
        const previousCurses = (target.statusEffects ?? []).filter((status) => status.kind === "curse");
        target.attack += previousCurses.reduce((total, status) => total + status.attackReduction, 0);
        const appliedReduction = Math.min(target.attack, effect.attackReduction);
        target.attack -= appliedReduction;
        target.statusEffects = [...(target.statusEffects ?? []).filter((status) => status.kind !== "curse"), ...(appliedReduction > 0 ? [{ kind: "curse" as const, turnsRemaining: effect.turns, attackReduction: appliedReduction }] : [])];
      }
      return run;
    }
    case "burnEnemyHero": {
      const targetHero = caster === "player" ? battle.enemyHero : battle.playerHero;
      targetHero.statusEffects = [...(targetHero.statusEffects ?? []).filter((status) => status.kind !== "burn"), { kind: "burn", turnsRemaining: effect.turns, amount: effect.damagePerTurn }];
      return run;
    }
    case "damageAllEnemyMinions": {
      if (resolved) resolved.amount = effect.amount;
      for (const minion of opposingBoard) minion.health -= effect.amount;
      return removeDeadMinions(run, caster === "player" ? "enemy" : "player");
    }
    case "soulHarvest": {
      const target = [...battle.playerBoard].sort((left, right) => right.attack - left.attack || left.health - right.health)[0];
      if (target) {
        target.health -= effect.damage;
        run = removeDeadMinions(run, "player");
      } else {
        run = dealDamageToPlayerHero(run, effect.damage, deferDefeat);
      }
      if (run.battle) run.battle.enemyHero.health = Math.min(run.battle.enemyHero.maxHealth, run.battle.enemyHero.health + effect.heal);
      if (resolved) resolved.amount = effect.damage;
      return run;
    }
  }
}

/**
 * Starts the player's turn. The round number grows after the second side of a round has played, so it grows here only when the
 * player is the first side; the very first turn of a battle never advances it.
 */
function startPlayerTurn(run: RunState, advanceRound = true): RunState {
  const battle = run.battle;
  if (!battle || battle.status !== "active") return run;
  const burns = battle.playerHero.statusEffects?.filter((status) => status.kind === "burn") ?? [];
  for (const burn of burns) run = dealDamageToPlayerHero(run, burn.amount, true);
  if (battle.playerHero.statusEffects) {
    battle.playerHero.statusEffects = battle.playerHero.statusEffects
      .map((status) => status.kind === "burn" ? { ...status, turnsRemaining: status.turnsRemaining - 1 } : status)
      .filter((status) => status.turnsRemaining > 0);
  }
  if (battle.playerHero.health === 0) return finishDefeat(run);
  if (advanceRound && battle.firstSide !== "enemy") battle.turnNumber += 1;
  battle.activeSide = "player";
  // A fresh full mana every turn; temporary mana and carried-over mana from earlier rules are dropped.
  const playerCap = manaCapForTurn(battle.turnNumber);
  battle.playerMana = { current: playerCap, max: playerCap, temporary: 0 };
  battle.playerBoard = battle.playerBoard.map((minion) => ({ ...minion, hasAttacked: false }));
  battle.heroPowerUsed = false;
  return drawIntoHand(run, "player");
}

function selectEnemySpellTarget(effect: SpellEffect, battle: BattleState, difficulty: RunDifficulty = "normal"): string | undefined {
  if (effect.kind === "damage" && effect.target === "enemyHero") return "player-hero";
  if (effect.kind === "damage" || effect.kind === "randomDamage") {
    const targets = battle.playerBoard.filter((minion) => minion.health > 0);
    if (targets.length === 0) return effect.kind === "randomDamage" ? "player-hero" : undefined;
    const anticipatedDamage = effect.kind === "damage" ? effect.amount : Math.floor((effect.min + effect.max) / 2);
    return targets
      .sort((left, right) => Number(right.health <= anticipatedDamage) - Number(left.health <= anticipatedDamage)
        || (difficulty === "hard" ? Number(right.attack >= 3) - Number(left.attack >= 3) : 0)
        || right.attack - left.attack || left.health - right.health)[0]?.instanceId;
  }
  if (effect.kind === "cleave") {
    return battle.playerBoard.filter((minion) => minion.health > 0)
      .sort((left, right) => right.attack - left.attack || left.health - right.health)[0]?.instanceId;
  }
  if (effect.kind === "rootMinion" || effect.kind === "soulHarvest") {
    return [...battle.playerBoard]
      .sort((left, right) => right.attack - left.attack || left.health - right.health)[0]?.instanceId;
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

/** An effect that would change nothing right now: healing a hero at full health, mana already at the maximum, a draw into a full hand. */
function isEnemySpellEffectWasted(effect: SpellEffect, battle: BattleState): boolean {
  if (effect.kind === "heal") {
    return effect.target === "playerHero"
      ? battle.enemyHero.health >= battle.enemyHero.maxHealth
      : !battle.enemyBoard.some((minion) => minion.health < minion.maxHealth);
  }
  if (effect.kind === "gainMana") return battle.enemyMana.current >= MAX_MANA;
  if (effect.kind === "draw") return battle.enemyHand.length >= MAX_HAND;
  return false;
}

function isEnemyCardTargetPlayable(card: CardDefinition, battle: BattleState): boolean {
  if (card.kind === "minion") return battle.enemyBoard.length < MAX_BOARD;
  // A spell whose every effect would be wasted is never cast (no healing at full health).
  const effects = card.spellEffects ?? [];
  if (effects.length > 0 && effects.every((effect) => isEnemySpellEffectWasted(effect, battle))) return false;
  return (card.spellEffects ?? []).every((effect) => {
    if (effect.kind === "summon") return battle.enemyBoard.length < MAX_BOARD;
    if (effect.kind === "cleave" || (effect.kind === "damage" && effect.target === "enemyMinion")) {
      return battle.playerBoard.some((minion) => minion.health > 0);
    }
    if (effect.kind === "stealFromOpponentDeck") return battle.enemyHand.length < MAX_HAND;
    if (effect.kind === "buff") return battle.enemyBoard.length > 0;
    if (effect.kind === "rootMinion" || effect.kind === "curseAllEnemyMinions" || effect.kind === "damageAllEnemyMinions") return battle.playerBoard.length > 0;
    if (effect.kind === "heal" && effect.target === "playerMinion") return battle.enemyBoard.some((minion) => minion.health < minion.maxHealth);
    return true;
  });
}

function getSoulBargainFollowUps(card: CardDefinition, battle: BattleState): CardDefinition[] {
  if (card.id !== "soul-bargain") return [];
  const otherCards = battle.enemyHand
    .filter((instance) => instance.cardId !== card.id)
    .map((instance) => getCard(instance.cardId));
  if (otherCards.length < 2) return [];

  const manaAfterCost = battle.enemyMana.current - card.cost;
  const projectedBattle: BattleState = {
    ...battle,
    enemyMana: {
      ...battle.enemyMana,
      current: manaAfterCost + 3,
      temporary: battle.enemyMana.temporary + 3,
    },
  };
  return otherCards.filter((candidate) => candidate.id !== "soul-bargain"
    && candidate.cost > manaAfterCost
    && candidate.cost <= manaAfterCost + 3
    && isEnemyCardTargetPlayable(candidate, projectedBattle));
}

function isEnemyCardPlayable(card: CardDefinition, battle: BattleState): boolean {
  if (card.cost > battle.enemyMana.current) return false;
  if (card.id === "soul-bargain" && card.spellEffects?.some((effect) => effect.kind === "discardRandom")) {
    return getSoulBargainFollowUps(card, battle).length >= 2;
  }
  return isEnemyCardTargetPlayable(card, battle);
}

function hasBoardClearSpellInHand(battle: BattleState): boolean {
  return battle.hand.some((instance) => {
    const card = getCard(instance.cardId);
    if (card.kind !== "spell") return false;
    return (card.spellEffects ?? []).some((effect) => {
      if (effect.kind === "damage" && effect.target === "enemyMinion") return effect.amount >= 3;
      if (effect.kind === "damageAllEnemyMinions") return effect.amount * battle.enemyBoard.length >= 3;
      if (effect.kind === "cleave") return effect.amount * Math.min(3, battle.enemyBoard.length) >= 3;
      if (effect.kind === "randomDamage") return effect.max * battle.enemyBoard.length >= 3;
      return false;
    });
  });
}

function hasHighCostMinionInNextDraws(battle: BattleState): boolean {
  return battle.drawPile.slice(0, 3).some((instance) => {
    const card = getCard(instance.cardId);
    return card.kind === "minion" && card.cost >= 5;
  });
}

function removalDamage(effect: SpellEffect): number {
  if (effect.kind === "damage" && effect.target === "enemyMinion") return effect.amount;
  if (effect.kind === "damageAllEnemyMinions") return effect.amount;
  if (effect.kind === "randomDamage") return effect.max;
  if (effect.kind === "cleave") return effect.amount;
  return 0;
}

function highestAttackMinion(board: readonly MinionState[]): MinionState | undefined {
  return [...board].sort((left, right) => right.attack - left.attack || right.health - left.health)[0];
}

function hasIncomingRemovalFor(minion: MinionState, battle: BattleState): boolean {
  const highestDrawDamage = battle.drawPile.slice(0, 3).reduce((damage, instance) => {
    const card = getCard(instance.cardId);
    if (card.kind !== "spell") return damage;
    return Math.max(damage, ...(card.spellEffects ?? []).map(removalDamage));
  }, 0);
  return highestDrawDamage >= minion.health;
}

function scoreEnemyCard(
  card: CardDefinition,
  battle: BattleState,
  enemy: EnemyDefinition,
  difficulty: RunDifficulty = "normal",
  completedBattles = 0,
): number {
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
      const target = selectEnemySpellTarget(effect, battle, difficulty);
      const minion = battle.playerBoard.find((candidate) => candidate.instanceId === target);
      score += minion ? 24 + minion.attack + (minion.health <= effect.amount ? 30 : 0) : 20 + effect.amount * 3;
      if (!minion && effect.amount >= battle.playerHero.health) score += 1000;
      if (difficulty === "hard" && completedBattles > 0 && battle.playerBoard.length === 0 && effect.target === "enemyHero") {
        score += 2 * completedBattles;
      }
    } else if (effect.kind === "randomDamage") {
      const target = selectEnemySpellTarget(effect, battle, difficulty);
      const minion = battle.playerBoard.find((candidate) => candidate.instanceId === target);
      score += minion ? 22 + minion.attack + (minion.health <= 2 ? 18 : 0) : 24;
    } else if (effect.kind === "cleave") {
      const target = selectEnemySpellTarget(effect, battle, difficulty);
      const index = battle.playerBoard.findIndex((minion) => minion.instanceId === target);
      const covered = [battle.playerBoard[index - 1], battle.playerBoard[index], battle.playerBoard[index + 1]].filter(Boolean);
      score += 12 + covered.reduce((total, minion) => total + (minion!.health <= effect.amount ? 15 : 4), 0);
    } else if (effect.kind === "stealFromOpponentDeck") {
      score += battle.drawPile.length > 0 ? 20 : 0;
    } else if (effect.kind === "heal") {
      const missingHealth = battle.enemyHero.maxHealth - battle.enemyHero.health;
      const target = effect.target === "playerHero" ? missingHealth : Math.max(0, ...ownBoard.map((minion) => minion.maxHealth - minion.health));
      score += target > 0 ? 20 + Math.min(target, effect.amount) * 5 : 0;
    } else if (effect.kind === "summon") score += 30 + effect.count * 8;
    else if (effect.kind === "buff") score += 20 + Math.max(0, ...ownBoard.map((minion) => minion.attack)) * 2;
    else if (effect.kind === "draw") score += 15 + effect.count * 4;
    else if (effect.kind === "rootMinion") {
      const target = battle.playerBoard.find((minion) => minion.instanceId === selectEnemySpellTarget(effect, battle, difficulty));
      score += target ? 20 + target.attack : 0;
    } else if (effect.kind === "curseAllEnemyMinions") score += 12 * battle.playerBoard.length;
    else if (effect.kind === "burnEnemyHero") score += effect.damagePerTurn * effect.turns;
    else if (effect.kind === "damageAllEnemyMinions") {
      score += battle.playerBoard.reduce((total, minion) => total + (minion.health <= effect.amount ? 18 : 5), 0);
    } else if (effect.kind === "soulHarvest") {
      const target = [...battle.playerBoard].sort((left, right) => right.attack - left.attack || left.health - right.health)[0];
      score += target ? (target.health <= effect.damage ? 30 : 0) : 20 + effect.damage;
      score += Math.min(effect.heal, battle.enemyHero.maxHealth - battle.enemyHero.health);
    }
  }
  if (card.id === "soul-bargain") {
    const projectedBattle: BattleState = {
      ...battle,
      enemyMana: {
        ...battle.enemyMana,
        current: battle.enemyMana.current - card.cost + 3,
        temporary: battle.enemyMana.temporary + 3,
      },
    };
    const bestFollowUp = Math.max(0, ...getSoulBargainFollowUps(card, battle)
      .map((followUp) => scoreEnemyCard(followUp, projectedBattle, enemy, difficulty)));
    score = Math.max(score, bestFollowUp + 1);
  }
  const profile = enemy.tactics.profile;
  if ((profile === "aggressor" || profile === "hunter") && (card.kind === "minion" || effects.some((effect) => effect.kind === "damage"))) score += 16;
  if (profile === "summoner" && (card.kind === "minion" || effects.some((effect) => effect.kind === "summon"))) score += ownBoard.length < 3 ? 20 : 8;
  if ((profile === "controller" || profile === "drain") && effects.some((effect) => effect.kind === "heal" || effect.kind === "buff")) score += 18;
  if ((profile === "board-clear" || profile === "ravager") && effects.some((effect) => effect.kind === "damage")) score += 18;
  if (enemy.kind === "boss" && card.rewardTier === "boss") score += 5;
  if (difficulty === "hard") {
    if (hasBoardClearSpellInHand(battle)) {
      if (effects.some((effect) => effect.kind === "damage" && effect.target === "enemyHero")) score += 4;
      if (card.kind === "minion" && card.minion && card.minion.maxHealth >= card.minion.attack + 2) score += 4;
      const summonedCount = effects.reduce((total, effect) => total + (effect.kind === "summon" ? effect.count : 0), 0)
        + (card.minion?.effect?.kind === "battlecrySummon" ? card.minion.effect.count : 0);
      if (summonedCount >= 2) score -= 6;
    }
    if (hasHighCostMinionInNextDraws(battle)) {
      if ((card.kind === "minion" && card.minion?.attack && card.minion.attack >= 5)
        || ownBoard.some((minion) => minion.attack >= 5 && !minion.hasAttacked)) score += 3;
    }
    const threatenedAttacker = highestAttackMinion(ownBoard);
    if (threatenedAttacker && hasIncomingRemovalFor(threatenedAttacker, battle)) {
      if (effects.some((effect) => effect.kind === "buff" || effect.kind === "heal")
        || (card.kind === "minion" && card.minion && card.minion.maxHealth > 3)) score += 4;
      if (card.kind === "minion" && card.minion && card.minion.maxHealth <= 3) score -= 3;
    }
  }
  return score;
}

function selectEnemyCard(battle: BattleState, enemy: EnemyDefinition, difficulty: RunDifficulty, completedBattles = 0): CardInstance | null {
  const playable = battle.enemyHand
    .map((instance, handSlot) => ({ instance, handSlot, card: getCard(instance.cardId) }))
    .filter(({ card }) => isEnemyCardPlayable(card, battle))
    .map((entry) => ({ ...entry, score: scoreEnemyCard(entry.card, battle, enemy, difficulty, completedBattles) }));
  if (playable.length === 0) return null;
  const highest = Math.max(...playable.map((entry) => entry.score));
  const tied = playable.filter((entry) => entry.score === highest);
  if (tied.length === 1) return tied[0]!.instance;
  const picked = pickIndex(tied.length, battle.rngState);
  battle.rngState = picked.state;
  return tied[picked.value]!.instance;
}

interface HardPlanNode {
  run: RunState;
  sequence: string[];
  score: number;
  /** Mana the plan spends; equal-scoring plans prefer spending more. */
  manaSpent: number;
  tieBreak: Array<{ handSlot: number; instanceId: string }>;
}

/**
 * Added to a plan for every card it plays. Plan scores subtract the value of the player's board, so against a much stronger
 * board every extra card used to lower the score and the enemy would play nothing at all; this keeps "play more" ahead of that.
 */
const ENEMY_PLAN_PLAY_BONUS = 200;
/** Extra score per mana spent by a plan (0 = only a tie-break); a difficulty knob for the balance simulation. */
const ENEMY_MANA_USE_WEIGHT = 0;

function betterPlan(candidate: HardPlanNode, current: HardPlanNode | null): boolean {
  if (!current) return true;
  if (candidate.score !== current.score) return candidate.score > current.score;
  if (candidate.manaSpent !== current.manaSpent) return candidate.manaSpent > current.manaSpent;
  return comparePlanTieBreak(candidate, current) < 0;
}

/** Extra value of an own taunt minion on the enemy board: it shields the hero and the other minions. A tuning knob. */
const ENEMY_TAUNT_BOARD_BONUS = 6;

function enemyBoardValue(battle: BattleState): number {
  return battle.enemyBoard.reduce((total, minion) => total + 3 * minion.attack + 2 * minion.health + (hasTaunt(minion) ? ENEMY_TAUNT_BOARD_BONUS : 0), 0)
    - battle.playerBoard.reduce((total, minion) => total + 4 * minion.attack + minion.health, 0);
}

function comparePlanTieBreak(left: HardPlanNode, right: HardPlanNode): number {
  const sharedLength = Math.min(left.tieBreak.length, right.tieBreak.length);
  for (let index = 0; index < sharedLength; index += 1) {
    const a = left.tieBreak[index]!;
    const b = right.tieBreak[index]!;
    if (a.handSlot !== b.handSlot) return a.handSlot - b.handSlot;
    const idOrder = a.instanceId.localeCompare(b.instanceId);
    if (idOrder !== 0) return idOrder;
  }
  return left.tieBreak.length - right.tieBreak.length;
}

function hardAiBeamWidth(completedBattles: number): number {
  return Math.min(32, 8 + 2 * completedBattles);
}

function normalAiBeamWidth(completedBattles: number): number {
  return Math.min(16, 4 + completedBattles);
}

// Plans a whole enemy turn from the second battle onward. Hard keeps its hidden-information scoring;
// Normal scores with its own difficulty (so it never reads the player's hand or draw pile) and
// re-seeds each simulated step so the plan cannot rely on the real random outcomes.
function planEnemyTurn(run: RunState, enemy: EnemyDefinition): string[] {
  const initialBattle = run.battle;
  if (!initialBattle || run.completedBattles === 0) return [];
  const initialSlots = new Map(initialBattle.enemyHand.map((instance, index) => [instance.instanceId, index]));
  const isHard = run.difficulty === "hard";
  const beamWidth = isHard ? hardAiBeamWidth(run.completedBattles) : normalAiBeamWidth(run.completedBattles);
  let beam: HardPlanNode[] = [{ run: cloneRun(run), sequence: [], score: 0, manaSpent: 0, tieBreak: [] }];
  // Best plan that plays at least one card: the enemy only plays nothing when nothing is playable.
  let best: HardPlanNode | null = null;
  const maxDepth = Math.min(30, initialBattle.enemyHand.length + initialBattle.enemyDrawPile.length + 1);

  for (let depth = 0; depth < maxDepth; depth += 1) {
    const expanded: HardPlanNode[] = [];
    for (const node of beam) {
      const battle = node.run.battle;
      if (!battle || node.run.status !== "active" || battle.playerHero.health === 0) continue;
      const candidates = battle.enemyHand
        .map((instance) => ({ instance, handSlot: initialSlots.get(instance.instanceId) ?? Number.MAX_SAFE_INTEGER }))
        .filter(({ instance }) => isEnemyCardPlayable(getCard(instance.cardId), battle))
        .sort((left, right) => left.handSlot - right.handSlot || left.instance.instanceId.localeCompare(right.instance.instanceId));
      for (const { instance, handSlot } of candidates) {
        const card = getCard(instance.cardId);
        const transitionScore = scoreEnemyCard(card, battle, enemy, run.difficulty, run.completedBattles);
        const simulated = playEnemyCard(cloneRun(node.run), instance.instanceId, true);
        if (!simulated.battle) continue;
        if (!isHard) simulated.battle.rngState = normalizeSeed(simulated.battle.rngState ^ 0x9e3779b9);
        const candidate: HardPlanNode = {
          run: simulated,
          sequence: [...node.sequence, instance.instanceId],
          score: node.score + transitionScore + enemyBoardValue(simulated.battle) + ENEMY_PLAN_PLAY_BONUS + ENEMY_MANA_USE_WEIGHT * card.cost,
          manaSpent: node.manaSpent + card.cost,
          tieBreak: [...node.tieBreak, { handSlot, instanceId: instance.instanceId }],
        };
        expanded.push(candidate);
        if (betterPlan(candidate, best)) best = candidate;
      }
    }
    if (expanded.length === 0) break;
    expanded.sort((left, right) => right.score - left.score || right.manaSpent - left.manaSpent || comparePlanTieBreak(left, right));
    beam = expanded.slice(0, beamWidth);
  }
  return best?.sequence ?? [];
}

function playEnemyCard(run: RunState, handInstanceId: string, deferDefeat = false): RunState {
  const battle = run.battle;
  if (!battle) return run;
  const handSlot = battle.enemyHand.findIndex((card) => card.instanceId === handInstanceId);
  if (handSlot < 0) return run;
  const instance = battle.enemyHand[handSlot]!;
  const card = getCard(instance.cardId);
  if (!isEnemyCardPlayable(card, battle)) return run;
  battle.enemyHand.splice(handSlot, 1);
  spendMana(battle, "enemy", card.cost);
  if (card.kind === "minion" && card.minion) {
    const before = new Set(battle.enemyBoard.map((minion) => minion.instanceId));
    const made = createMinion(run, card.id, "enemy", battle.turnNumber, instance);
    made.run.battle!.enemyBoard.push(made.minion);
    run = triggerMinionEffect(made.run, made.minion);
    const summonedIds = run.battle?.enemyBoard.filter((minion) => !before.has(minion.instanceId)).map((minion) => minion.instanceId) ?? [];
    run.battle?.enemyTurnEvents?.push({ type: "play-minion", cardId: card.id, instanceId: instance.instanceId, handSlot, summonedIds });
    return run;
  }

  if (card.id !== COIN_CARD_ID) battle.enemyDiscardPile.push(instance);
  const eventEffects: Array<{ kind: SpellEffect["kind"]; targetId: string | null; amount?: number; transferredCardInstanceId?: string }> = [];
  for (const effect of card.spellEffects ?? []) {
    const targetId = selectEnemySpellTarget(effect, battle, run.difficulty);
    const resolved: { amount?: number; transferredCardInstanceId?: string } = {};
    run = applySpellEffect(run, effect, targetId, "enemy", deferDefeat, resolved);
    eventEffects.push({ kind: effect.kind, targetId: targetId ?? null, ...resolved });
    if (run.status !== "active" || (deferDefeat && run.battle?.playerHero.health === 0)) break;
  }
  run.battle?.enemyTurnEvents?.push({ type: "cast-spell", cardId: card.id, instanceId: instance.instanceId, handSlot, effects: eventEffects });
  return run;
}

function addEnemyTurnStep(
  steps: EnemyTurnPlaybackStep[],
  action: EnemyCombatRecord,
  beforeRun: RunState,
  presentationRun: RunState,
): void {
  const before = cloneRun(beforeRun);
  const presentation = cloneRun(presentationRun);
  if (before.battle) delete before.battle.enemyTurnEvents;
  if (presentation.battle) delete presentation.battle.enemyTurnEvents;
  steps.push({ action: structuredClone(action), beforeRun: before, presentationRun: presentation });
}

// ---- Enemy attack planning (second battle onward) -------------------------------------------------------------------
// A side can only attack the opposing hero while the opposing board is empty, so attack planning is about the order of
// attackers, which minion each one hits, and holding an attack back when it would only lose value. The search runs on a
// small copy of both boards (not on the whole run) and the real combat code then executes the chosen steps.

interface EnemyAttackStep {
  attackerId: string;
  /** A player minion's instance id, or the player hero's id once the player board is empty. */
  targetId: string;
}

/** How many partial attack plans the search keeps per depth. Normal sees fewer options than Hard. */
const ENEMY_ATTACK_BEAM_WIDTH: Record<RunDifficulty, number> = { normal: 3, hard: 8 };
const ENEMY_ATTACK_WEIGHTS = { playerMinion: 1.2, heroDamage: 4, lethal: 100_000 } as const;

interface AttackSimMinion {
  id: string;
  attack: number;
  health: number;
  taunt: boolean;
}

interface AttackSimState {
  enemy: AttackSimMinion[];
  player: AttackSimMinion[];
  ready: string[];
  heroHealth: number;
  armor: number;
  heroDamage: number;
  steps: EnemyAttackStep[];
  key: string;
}

function attackSimMinionValue(minion: AttackSimMinion): number {
  return 3 * minion.attack + 2 * Math.max(0, minion.health);
}

function attackSimScore(state: AttackSimState): number {
  const own = state.enemy.reduce((total, minion) => total + attackSimMinionValue(minion), 0);
  const opposing = state.player.reduce((total, minion) => total + attackSimMinionValue(minion), 0);
  return own - ENEMY_ATTACK_WEIGHTS.playerMinion * opposing + ENEMY_ATTACK_WEIGHTS.heroDamage * state.heroDamage + (state.heroHealth <= 0 ? ENEMY_ATTACK_WEIGHTS.lethal : 0);
}

function isEnemyAttackReady(minion: MinionState, battle: BattleState): boolean {
  return minion.attack > 0 && minion.summonedTurn < battle.turnNumber && !minion.hasAttacked && !minion.statusEffects?.some((status) => status.kind === "root");
}

function planEnemyAttacks(run: RunState): EnemyAttackStep[] {
  const battle = run.battle;
  if (!battle) return [];
  const toSim = (minion: MinionState): AttackSimMinion => ({ id: minion.instanceId, attack: minion.attack, health: minion.health, taunt: hasTaunt(minion) });
  const initial: AttackSimState = {
    enemy: battle.enemyBoard.map(toSim),
    player: battle.playerBoard.map(toSim),
    ready: battle.enemyBoard.filter((minion) => isEnemyAttackReady(minion, battle)).map((minion) => minion.instanceId),
    heroHealth: battle.playerHero.health,
    armor: battle.playerArmor,
    heroDamage: 0,
    steps: [],
    key: "",
  };
  if (initial.ready.length === 0) return [];
  const heroId = battle.playerHero.id;
  const width = ENEMY_ATTACK_BEAM_WIDTH[run.difficulty === "hard" ? "hard" : "normal"];
  let best = { state: initial, score: attackSimScore(initial) };
  let beam: AttackSimState[] = [initial];

  for (let depth = 0; depth < initial.ready.length && beam.length > 0; depth += 1) {
    const children: Array<{ state: AttackSimState; score: number }> = [];
    for (const node of beam) {
      for (const attackerId of node.ready) {
        const taunts = node.player.filter((minion) => minion.taunt);
        const targets = taunts.length > 0 ? taunts.map((minion) => minion.id) : [...node.player.map((minion) => minion.id), heroId];
        for (const targetId of targets) {
          const child = applySimAttack(node, attackerId, targetId, heroId);
          children.push({ state: child, score: attackSimScore(child) });
        }
      }
    }
    if (children.length === 0) break;
    children.sort((left, right) => right.score - left.score || (left.state.key < right.state.key ? -1 : left.state.key > right.state.key ? 1 : 0));
    beam = children.slice(0, width).map((entry) => entry.state);
    // Every ready minion attacks: only complete plans (one step per ready attacker) are candidates, so nothing is held back.
    if (depth === initial.ready.length - 1) best = { state: beam[0]!, score: children[0]!.score };
  }
  return best.state.steps;
}

function applySimAttack(node: AttackSimState, attackerId: string, targetId: string, heroId: string): AttackSimState {
  const enemy = node.enemy.map((minion) => ({ ...minion }));
  const player = node.player.map((minion) => ({ ...minion }));
  const attacker = enemy.find((minion) => minion.id === attackerId)!;
  let heroHealth = node.heroHealth;
  let armor = node.armor;
  let heroDamage = node.heroDamage;
  if (targetId === heroId) {
    const absorbed = Math.min(armor, attacker.attack);
    armor -= absorbed;
    const dealt = Math.min(heroHealth, attacker.attack - absorbed);
    heroHealth -= dealt;
    heroDamage += dealt;
  } else {
    const target = player.find((minion) => minion.id === targetId)!;
    target.health -= attacker.attack;
    attacker.health -= target.attack;
  }
  return {
    enemy: enemy.filter((minion) => minion.health > 0),
    player: player.filter((minion) => minion.health > 0),
    ready: node.ready.filter((id) => id !== attackerId),
    heroHealth,
    armor,
    heroDamage,
    steps: [...node.steps, { attackerId, targetId }],
    key: `${node.key}|${attackerId}>${targetId}`,
  };
}

/**
 * The attack choice of the first battle: among the legal targets kill what can be killed, then the strongest minion; the hero is
 * attacked when the ready minions together are lethal, or when no minion can be attacked.
 */
function greedyEnemyAttackTarget(battle: BattleState, attacker: MinionState, difficulty: RunDifficulty): string | null {
  const legal = legalAttackTargets(battle, "enemy");
  if (legal.heroAllowed) {
    const readyDamage = battle.enemyBoard.filter((minion) => isEnemyAttackReady(minion, battle)).reduce((total, minion) => total + minion.attack, 0);
    if (readyDamage >= battle.playerHero.health + battle.playerArmor) return battle.playerHero.id;
  }
  const target = legal.minions
    .map((minion, index) => ({ minion, index }))
    .sort((left, right) => {
      if (difficulty === "hard") {
        const leftKillable = left.minion.health <= attacker.attack;
        const rightKillable = right.minion.health <= attacker.attack;
        const leftReady = left.minion.summonedTurn < battle.turnNumber && left.minion.attack > 0 && !left.minion.hasAttacked && !left.minion.statusEffects?.some((status) => status.kind === "root");
        const rightReady = right.minion.summonedTurn < battle.turnNumber && right.minion.attack > 0 && !right.minion.hasAttacked && !right.minion.statusEffects?.some((status) => status.kind === "root");
        return Number(rightKillable) - Number(leftKillable)
          || Number(rightReady) - Number(leftReady)
          || right.minion.attack - left.minion.attack
          || left.minion.health - right.minion.health
          || left.index - right.index;
      }
      const leftKillable = left.minion.health <= attacker.attack;
      const rightKillable = right.minion.health <= attacker.attack;
      return Number(rightKillable) - Number(leftKillable)
        || right.minion.attack - left.minion.attack
        || left.minion.health - right.minion.health
        || left.index - right.index;
    })[0]?.minion;
  if (target) return target.instanceId;
  return legal.heroAllowed ? battle.playerHero.id : null;
}

function resolveEnemyMinionAttacks(
  run: RunState,
  onAttack?: (action: EnemyCombatRecord, beforeRun: RunState, afterRun: RunState) => void,
  deferDefeat = false,
): RunState {
  const initialBattle = run.battle;
  if (!initialBattle) return run;
  // From the second battle on the attacks are planned; the first battle keeps the greedy choice.
  const plan = run.completedBattles > 0 ? planEnemyAttacks(run) : null;
  const queue: Array<{ attackerId: string; plannedTargetId?: string }> = plan
    ? plan.map((step) => ({ attackerId: step.attackerId, plannedTargetId: step.targetId }))
    : initialBattle.enemyBoard.map((minion) => ({ attackerId: minion.instanceId }));
  const done = new Set<number>();

  // The target of one queued attacker right now, or null when its planned target is no longer legal.
  const targetFor = (battle: BattleState, attacker: MinionState, plannedTargetId: string | undefined): string | null => {
    if (plannedTargetId === undefined) return greedyEnemyAttackTarget(battle, attacker, run.difficulty);
    const legal = legalAttackTargets(battle, "enemy");
    if (plannedTargetId === battle.playerHero.id) return legal.heroAllowed ? plannedTargetId : null;
    return legal.minions.some((minion) => minion.instanceId === plannedTargetId) ? plannedTargetId : null;
  };

  for (const [stepIndex, entry] of queue.entries()) {
    if (done.has(stepIndex)) continue;
    const battle = run.battle;
    if (!battle) break;
    const attacker = battle.enemyBoard.find((minion) => minion.instanceId === entry.attackerId);
    if (!attacker || !isEnemyAttackReady(attacker, battle)) continue;
    const targetId = targetFor(battle, attacker, entry.plannedTargetId);
    if (targetId === null) continue;
    const beforeRun = onAttack ? cloneRun(run) : run;
    if (targetId !== battle.playerHero.id) {
      const target = battle.playerBoard.find((minion) => minion.instanceId === targetId)!;
      const action: EnemyCombatRecord = { type: "attack", cardId: attacker.cardId, attackerId: attacker.instanceId, targetId: target.instanceId };
      battle.enemyTurnEvents?.push(action);
      applyMinionCombatDamage(attacker, target);
      attacker.hasAttacked = true;
      run = removeDeadMinions(run, "player");
      run = removeDeadMinions(run, "enemy");
      onAttack?.(action, beforeRun, run);
      continue;
    }
    // The hero is attacked: the following queued attackers that also hit the hero join in as one all-attack action.
    const group = [attacker];
    for (let next = stepIndex + 1; next < queue.length; next += 1) {
      const member = battle.enemyBoard.find((minion) => minion.instanceId === queue[next]!.attackerId);
      if (!member || group.includes(member) || !isEnemyAttackReady(member, battle)) continue;
      if (targetFor(battle, member, queue[next]!.plannedTargetId) !== battle.playerHero.id) break;
      group.push(member);
      done.add(next);
    }
    const attackers: Array<{ attackerId: string; cardId: string }> = [];
    for (const member of group) {
      attackers.push({ attackerId: member.instanceId, cardId: member.cardId });
      member.hasAttacked = true;
      run = dealDamageToPlayerHero(run, member.attack, deferDefeat);
      if (run.status !== "active" || run.battle?.playerHero.health === 0) break;
    }
    const action: EnemyCombatRecord = attackers.length > 1
      ? { type: "all-attack", attackers, targetId: battle.playerHero.id }
      : { type: "attack", cardId: attacker.cardId, attackerId: attacker.instanceId, targetId: battle.playerHero.id };
    run.battle?.enemyTurnEvents?.push(action);
    onAttack?.(action, beforeRun, run);
    if (run.status !== "active" || run.battle?.playerHero.health === 0) return run;
  }
  return run;
}

function resolveBossAreaAttack(run: RunState, deferDefeat = false): RunState {
  const battle = run.battle;
  if (!battle) return run;
  const targetMinionIds = battle.playerBoard.map((minion) => minion.instanceId);
  battle.enemyTurnEvents?.push({ type: "boss-area", damage: 1, targetMinionIds, targetHeroId: "player" });
  for (const minion of [...battle.playerBoard]) minion.health -= 1;
  run = removeDeadMinions(run, "player");
  return dealDamageToPlayerHero(run, 1, deferDefeat);
}

function expirePlayerTurnStatuses(battle: BattleState): void {
  for (const minion of battle.playerBoard) {
    if (!minion.statusEffects?.length) continue;
    const expiringCurses = minion.statusEffects.filter((status) => status.kind === "curse" && status.turnsRemaining <= 1);
    if (expiringCurses.length) minion.attack += expiringCurses.reduce((total, status) => total + (status.kind === "curse" ? status.attackReduction : 0), 0);
    minion.statusEffects = minion.statusEffects
      .map((status) => status.kind === "burn" ? status : { ...status, turnsRemaining: status.turnsRemaining - 1 })
      .filter((status) => status.turnsRemaining > 0);
  }
}

function beginEncounter(run: RunState, encounterIndex: number, battleSeed: number, pickTurnOrder = false): RunState {
  const encounter = run.encounters[encounterIndex];
  if (!encounter || encounter.status !== "pending") fail("ENCOUNTER_NOT_READY", "The next encounter is not pending.");
  const enemy = ENEMY_BY_ID.get(encounter.enemyId);
  if (!enemy) fail("INVALID_ACTION", `Unknown enemy: ${encounter.enemyId}`);

  encounter.status = "active";
  const shuffled = shuffle(run.deck, battleSeed);
  const enemyDeck = createEnemyDeck(enemy, shuffled.state, `${run.runId}-enemy-${encounterIndex + 1}`, run.difficulty);
  const existingHardBonus = run.difficulty === "hard" ? (enemy.kind === "boss" ? 3 : 2) : 0;
  const phaseHealthBonus = enemyPhaseBonus(run.difficulty, encounter.phase, run.completedBattles, "heroHealth");
  const enemyMaxHealth = enemy.maxHealth + existingHardBonus + phaseHealthBonus;
  const nextRun = { ...run, phase: encounter.phase, battle: null } as RunState;
  const battle: BattleState = {
    battleId: `${run.runId}-battle-${encounterIndex + 1}`,
    turnNumber: 1,
    activeSide: "player",
    playerHero: { id: "player", health: HERO_HEALTH, maxHealth: HERO_HEALTH },
    enemyHero: { id: "enemy", health: enemyMaxHealth, maxHealth: enemyMaxHealth },
    playerMana: { current: INITIAL_MANA, max: INITIAL_MANA, temporary: 0 },
    enemyMana: { current: INITIAL_MANA, max: INITIAL_MANA, temporary: 0 },
    playerArmor: 0,
    soulShards: 0,
    heroPowerUsed: false,
    // The hands are dealt when the turn order is chosen (3 cards for the first side, 4 and the Coin for the second).
    hand: [],
    drawPile: shuffled.items,
    discardPile: [],
    enemyStarterDeck: enemyDeck.starterDeck,
    enemyHand: [],
    enemyDrawPile: enemyDeck.shuffledDeck,
    enemyDiscardPile: [],
    playerBoard: [],
    enemyBoard: [],
    enemyId: encounter.enemyId,
    rngState: enemyDeck.state,
    status: "active",
    playerFatigue: 0,
    enemyFatigue: 0,
    firstSide: null,
    turnOrderCards: normalizeSeed(battleSeed ^ 0x5bd1e995) % 2 === 0 ? ["first", "second"] : ["second", "first"],
  };
  nextRun.battle = battle;
  // Without a pick (tests, the tutorial, the simulation default) the player simply goes first.
  return pickTurnOrder ? nextRun : dealTurnOrder(nextRun, "first");
}

/** Applies the chosen role: deals the opening hands, gives the second side the Coin and starts the first side's turn. */
function dealTurnOrder(run: RunState, role: TurnOrderRole): RunState {
  const battle = run.battle!;
  const playerFirst = role === "first";
  battle.firstSide = playerFirst ? "player" : "enemy";
  Object.assign(battle, openingHandAndDrawPile(battle.drawPile, playerFirst ? 3 : 4));
  const enemyHandSize = playerFirst ? 4 : 3;
  battle.enemyHand = battle.enemyDrawPile.slice(0, enemyHandSize);
  battle.enemyDrawPile = battle.enemyDrawPile.slice(enemyHandSize);
  const coin = makeInstance(run, COIN_CARD_ID, "coin");
  run.nextInstanceNumber += 1;
  (playerFirst ? battle.enemyHand : battle.hand).push(coin);
  if (playerFirst) return startPlayerTurn(run, false);
  battle.activeSide = "enemy";
  return run;
}

/**
 * The player picks one of the two face-down cards of a new battle; what is behind it decides whether the player plays first or
 * second. When the enemy is first the caller runs `resolveEnemyTurnWithPlayback` next.
 */
export function chooseTurnOrder(run: RunState, cardIndex: 0 | 1): RunState {
  const next = cloneRun(run);
  const battle = assertActiveRun(next);
  if (battle.firstSide !== null || !battle.turnOrderCards) fail("INVALID_ACTION", "The turn order was already chosen.");
  if (cardIndex !== 0 && cardIndex !== 1) fail("INVALID_ACTION", "Choose one of the two cards.");
  return dealTurnOrder(next, battle.turnOrderCards[cardIndex]);
}

export function createRun(seed: number, playerClass: PlayerClass = "warrior", difficulty: RunDifficulty = "normal", options: { pickTurnOrder?: boolean } = {}): RunState {
  const normalizedSeed = normalizeSeed(seed);
  let randomState = normalizedSeed;
  const encounters: EncounterState[] = [];
  for (let phase = 1 as 1 | 2 | 3; phase <= 3; phase = (phase + 1) as 1 | 2 | 3) {
    for (let normal = 0; normal < 3; normal += 1) {
      const phaseEnemies = NORMAL_ENEMIES_BY_PHASE[phase];
      const picked = pickIndex(phaseEnemies.length, randomState);
      randomState = picked.state;
      encounters.push({ phase, kind: "normal", enemyId: phaseEnemies[picked.value]!.id, status: "pending" });
    }
    encounters.push({ phase, kind: "boss", enemyId: BOSSES[phase - 1]!.id, status: "pending" });
  }

  const classDefinition = PLAYER_CLASS_DEFINITIONS.find((definition) => definition.id === playerClass);
  if (!classDefinition) fail("INVALID_ACTION", `Unknown player class: ${playerClass}`);
  const starterCardIds = [...SHARED_STARTER_CARD_IDS, ...classDefinition.starterCardIds];
  const starterDeck = starterCardIds.map((cardId, index) => ({ instanceId: `starter-template-${index + 1}`, cardId }));
  const deck = starterCardIds.map((cardId, index) => ({ instanceId: `card-${index + 1}`, cardId }));
  const run: RunState = {
    runId: `run-${normalizedSeed.toString(36)}`,
    seed: normalizedSeed,
    difficulty,
    nextInstanceNumber: deck.length + 1,
    phase: 1,
    encounterInPhase: 0,
    completedBattles: 0,
    status: "active",
    openingHandRedrawAvailable: true,
    playerClass,
    deck,
    starterDeck,
    battle: null,
    pendingReward: null,
    encounters,
  };
  return beginEncounter(run, 0, randomState, options.pickTurnOrder === true);
}

export function redrawOpeningHand(run: RunState): RunState {
  const battle = run.battle;
  if (battle && battle.firstSide === null) assertTurnOrderChosen(battle);
  if (run.openingHandRedrawAvailable !== true || run.completedBattles !== 0 || run.encounterInPhase !== 0
    || run.status !== "active" || !battle || battle.status !== "active" || battle.firstSide === null || battle.firstSide === undefined
    || battle.activeSide !== "player" || battle.turnNumber !== 1) {
    fail("INVALID_ACTION", "The opening hand redraw is no longer available.");
  }
  const next = cloneRun(run);
  const currentBattle = next.battle!;
  // The Coin stays in the hand; every other card is shuffled back and the same number of cards is dealt again.
  const coins = currentBattle.hand.filter((card) => card.cardId === COIN_CARD_ID);
  const others = currentBattle.hand.filter((card) => card.cardId !== COIN_CARD_ID);
  const shuffled = shuffle([...others, ...currentBattle.drawPile], currentBattle.rngState);
  const dealt = openingHandAndDrawPile(shuffled.items, others.length);
  currentBattle.hand = [...dealt.hand, ...coins];
  currentBattle.drawPile = dealt.drawPile;
  currentBattle.rngState = shuffled.state;
  next.openingHandRedrawAvailable = false;
  return next;
}

export function useHeroPower(run: RunState, targetId?: string): RunState {
  const next = cloneRun(run);
  const battle = assertPlayerTurn(next);
  if (!next.playerClass) fail("INVALID_ACTION", "Legacy runs do not have a hero power.");
  if (battle.heroPowerUsed) fail("INVALID_ACTION", "The hero power was already used this turn.");
  if (battle.playerMana.current < 2) fail("INSUFFICIENT_MANA", "A hero power costs 2 mana.");

  if (next.playerClass === "assassin") {
    validateTargetId(targetId);
    if (targetId !== "enemy-hero" && !battle.enemyBoard.some((minion) => minion.instanceId === targetId)) {
      fail("INVALID_TARGET", "Select a living enemy minion or the enemy hero.");
    }
  }
  if (next.playerClass === "demonist") {
    if (battle.soulShards < SOUL_SHARD_HERO_POWER_COST) {
      fail("INVALID_ACTION", `Demonist needs ${SOUL_SHARD_HERO_POWER_COST} soul shards to use this power.`);
    }
    if (battle.playerBoard.length >= MAX_BOARD) fail("MAX_BOARD", "The player board is full.");
  }

  spendMana(battle, "player", 2);
  battle.heroPowerUsed = true;
  if (next.playerClass === "assassin") {
    if (targetId === "enemy-hero") return consumeOpeningHandRedraw(dealDamageToEnemyHero(next, 2));
    const target = battle.enemyBoard.find((minion) => minion.instanceId === targetId)!;
    target.health -= 2;
    return consumeOpeningHandRedraw(removeDeadMinions(next, "enemy"));
  }
  if (next.playerClass === "warrior") {
    battle.playerArmor += 4;
    return consumeOpeningHandRedraw(next);
  }

  {
    const demonIds = ["demon-lesser-imp", "demon-ashling", "demon-cinder-fiend"];
    const picked = pickIndex(demonIds.length, battle.rngState);
    battle.rngState = picked.state;
    const cardId = demonIds[picked.value]!;
    battle.soulShards -= SOUL_SHARD_HERO_POWER_COST;
    const summoned = createMinion(next, cardId, "player", battle.turnNumber);
    summoned.run.battle!.playerBoard.push(summoned.minion);
    return consumeOpeningHandRedraw(summoned.run);
  }
}

export function fuseMinions(run: RunState, firstMinionId: string, secondMinionId: string): RunState {
  const next = cloneRun(run);
  const battle = assertPlayerTurn(next);
  if (firstMinionId === secondMinionId) fail("INVALID_TARGET", "Select two different friendly minions to fuse.");
  const firstIndex = battle.playerBoard.findIndex((minion) => minion.instanceId === firstMinionId);
  const secondIndex = battle.playerBoard.findIndex((minion) => minion.instanceId === secondMinionId);
  if (firstIndex < 0 || secondIndex < 0) fail("INVALID_TARGET", "Both fusion materials must be on your board.");
  const first = battle.playerBoard[firstIndex]!;
  const second = battle.playerBoard[secondIndex]!;
  const recipe = FUSION_RECIPES.find(({ classId, sourceCardIds }) =>
    classId === next.playerClass
      && ((sourceCardIds[0] === first.cardId && sourceCardIds[1] === second.cardId)
        || (sourceCardIds[0] === second.cardId && sourceCardIds[1] === first.cardId)));
  if (!recipe) fail("INVALID_ACTION", "These minions do not form a class fusion recipe.");
  if (battle.playerBoard.length - 1 > MAX_BOARD) fail("MAX_BOARD", "There is no space for the fused minion.");
  ensureMana(next, 1);

  const insertionIndex = Math.min(firstIndex, secondIndex);
  const removed = [first, second];
  spendMana(battle, "player", 1);
  battle.discardPile.push(...removed.map(({ instanceId, cardId }) => ({ instanceId, cardId })));
  battle.playerBoard.splice(Math.max(firstIndex, secondIndex), 1);
  battle.playerBoard.splice(insertionIndex, 1);

  const resultInstance = makeInstance(next, recipe.resultCardId, "fusion");
  next.nextInstanceNumber += 1;
  const made = createMinion(next, recipe.resultCardId, "player", battle.turnNumber, resultInstance);
  made.minion.hasAttacked = true;
  made.run.battle!.playerBoard.splice(insertionIndex, 0, made.minion);
  return consumeOpeningHandRedraw(triggerMinionEffect(made.run, made.minion));
}

export function startBattle(run: RunState, enemyId: string, options: { pickTurnOrder?: boolean } = {}): RunState {
  if (run.status !== "active" || run.battle) fail("ENCOUNTER_NOT_READY", "A new battle cannot start now.");
  const encounterIndex = run.encounters.findIndex((encounter) => encounter.status === "pending");
  if (encounterIndex < 0 || run.encounters[encounterIndex]?.enemyId !== enemyId) {
    fail("ENCOUNTER_NOT_READY", "The requested enemy is not the next encounter.");
  }
  return beginEncounter(cloneRun(run), encounterIndex, normalizeSeed(run.seed + run.completedBattles + 1), options.pickTurnOrder === true);
}

export function playMinion(run: RunState, handInstanceId: string, slotIndex?: number): RunState {
  const next = cloneRun(run);
  const battle = ensureMana(next, 0);
  const handIndex = battle.hand.findIndex((instance) => instance.instanceId === handInstanceId);
  if (handIndex < 0) fail("CARD_NOT_FOUND", "The card is not in the player's hand.");
  const card = getCard(battle.hand[handIndex]!.cardId);
  if (card.kind !== "minion" || !card.minion) fail("INVALID_ACTION", "This card is not a minion.");
  if (battle.playerBoard.length >= MAX_BOARD) fail("MAX_BOARD", "The player's board is full.");
  const insertionIndex = slotIndex ?? battle.playerBoard.length;
  if (insertionIndex < 0 || insertionIndex > battle.playerBoard.length) fail("INVALID_TARGET", "Choose an empty player board slot.");
  ensureMana(next, card.cost);

  const [instance] = battle.hand.splice(handIndex, 1);
  spendMana(battle, "player", card.cost);
  const made = createMinion(next, card.id, "player", battle.turnNumber, instance);
  made.run.battle!.playerBoard.splice(insertionIndex, 0, made.minion);
  return consumeOpeningHandRedraw(triggerMinionEffect(made.run, made.minion));
}

export interface ResolvedSpellEffect {
  effectIndex: number;
  kind: SpellEffect["kind"];
  targetId: string | null;
  amount?: number;
}

export interface SpellCastResolution {
  run: RunState;
  effects: ResolvedSpellEffect[];
}

export function castSpellWithResolution(run: RunState, handInstanceId: string, targetId?: string): SpellCastResolution {
  const next = cloneRun(run);
  const battle = ensureMana(next, 0);
  const handIndex = battle.hand.findIndex((instance) => instance.instanceId === handInstanceId);
  if (handIndex < 0) fail("CARD_NOT_FOUND", "The card is not in the player's hand.");
  const card = getCard(battle.hand[handIndex]!.cardId);
  if (card.kind !== "spell" || !card.spellEffects) fail("INVALID_ACTION", "This card is not a spell.");
  ensureMana(next, card.cost);
  if (card.spellEffects.some((effect) => effect.kind === "stealFromOpponentDeck") && battle.hand.length >= MAX_HAND) {
    fail("MAX_HAND", "The hand is full; a card cannot be stolen.");
  }
  for (const effect of card.spellEffects) {
    if (effect.kind === "summon" && battle.playerBoard.length >= MAX_BOARD) {
      fail("MAX_BOARD", "The player's board is full.");
    }
    if ((effect.kind === "buff" || (effect.kind === "heal" && effect.target === "playerMinion")) && !targetId) {
      fail("INVALID_TARGET", "Select a valid target for this spell.");
    }
    if (effect.kind === "damage" || effect.kind === "randomDamage" || effect.kind === "cleave") {
      validateDamageSpellTarget(battle, effect, targetId, "player");
    }
  }

  const [instance] = battle.hand.splice(handIndex, 1);
  // The Coin leaves the game after use; every other spell goes to the discard pile.
  if (card.id !== COIN_CARD_ID) battle.discardPile.push(instance!);
  spendMana(battle, "player", card.cost);
  let current = next;
  const effects: ResolvedSpellEffect[] = [];
  for (const [effectIndex, effect] of card.spellEffects.entries()) {
    const resolved: { amount?: number; transferredCardInstanceId?: string } = {};
    current = applySpellEffect(current, effect, targetId, "player", false, resolved);
    effects.push({
      effectIndex,
      kind: effect.kind,
      targetId: targetId ?? null,
      ...(resolved.amount !== undefined ? { amount: resolved.amount } : {}),
    });
    if (current.status !== "active") return { run: consumeOpeningHandRedraw(current), effects };
  }
  return { run: consumeOpeningHandRedraw(current), effects };
}

export function castSpell(run: RunState, handInstanceId: string, targetId?: string): RunState {
  return castSpellWithResolution(run, handInstanceId, targetId).run;
}

export function attackWithMinion(run: RunState, attackerId: string, targetId: string): RunState {
  const next = cloneRun(run);
  const battle = assertPlayerTurn(next);
  const attacker = battle.playerBoard.find((minion) => minion.instanceId === attackerId);
  if (!attacker) fail("INVALID_ACTION", "The selected attacker is not on the player's board.");
  if (attacker.summonedTurn >= battle.turnNumber || attacker.hasAttacked || attacker.statusEffects?.some((status) => status.kind === "root")) {
    fail("INVALID_ACTION", "This minion cannot attack again this turn.");
  }

  const legal = legalAttackTargets(battle, "player");
  if (targetId !== battle.enemyHero.id) {
    const target = battle.enemyBoard.find((minion) => minion.instanceId === targetId);
    if (!target) fail("INVALID_TARGET", "Attack an enemy minion or the enemy hero.");
    if (!legal.minions.includes(target)) fail("INVALID_TARGET", "A taunt minion must be attacked first.");
    applyMinionCombatDamage(attacker, target);
    attacker.hasAttacked = true;
    const afterEnemyCleanup = removeDeadMinions(next, "enemy");
    return consumeOpeningHandRedraw(removeDeadMinions(afterEnemyCleanup, "player"));
  }
  if (!legal.heroAllowed) fail("INVALID_TARGET", "A taunt minion must be attacked first.");
  attacker.hasAttacked = true;
  return consumeOpeningHandRedraw(dealDamageToEnemyHero(next, attacker.attack));
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
  return drawIntoHand(next, "player");
}

export function resolveEnemyTurnWithPlayback(run: RunState): EnemyTurnResolution {
  let next = cloneRun(run);
  const steps: EnemyTurnPlaybackStep[] = [];
  let battle = assertActiveRun(next);
  assertTurnOrderChosen(battle);
  if (battle.activeSide !== "enemy") fail("WRONG_TURN", "The enemy turn is not active.");
  const enemy = ENEMY_BY_ID.get(battle.enemyId);
  if (!enemy) fail("INVALID_ACTION", `Unknown enemy: ${battle.enemyId}`);
  battle.enemyTurnEvents = [];
  delete (battle as BattleState & { pendingEnemyCharge?: unknown }).pendingEnemyCharge;
  const enemyCap = manaCapForTurn(battle.turnNumber);
  battle.enemyMana = { current: enemyCap, max: enemyCap, temporary: 0 };

  // The enemy draws at the start of each of its turns (its first included); an empty draw pile means fatigue.
  for (let drawn = 0; drawn < TURN_DRAW_COUNT; drawn += 1) {
    next = drawIntoHand(next, "enemy", true);
    if (next.status !== "active" || next.battle?.status !== "active") return { run: next, steps };
  }

  const turnPlan = next.completedBattles > 0 ? planEnemyTurn(next, enemy) : null;
  let plays = 0;
  while (plays < 30 && next.status === "active" && next.battle?.playerHero.health !== 0) {
    battle = next.battle!;
    const selected = turnPlan
      ? battle.enemyHand.find((instance) => instance.instanceId === turnPlan[plays]) ?? null
      : selectEnemyCard(battle, enemy, next.difficulty, next.completedBattles);
    if (!selected) break;
    const beforeHandSize = battle.enemyHand.length;
    const priorEventCount = battle.enemyTurnEvents?.length ?? 0;
    const beforeRun = cloneRun(next);
    next = playEnemyCard(next, selected.instanceId, true);
    plays += 1;
    if (!next.battle) return { run: next, steps };
    const eventList = next.battle.enemyTurnEvents ?? [];
    const action = eventList.length > priorEventCount ? eventList[eventList.length - 1] : undefined;
    if (action) addEnemyTurnStep(steps, action, beforeRun, next);
    if (next.battle.playerHero.health === 0) return { run: finishDefeat(next), steps };
    if (next.battle.enemyHand.length >= beforeHandSize && plays >= 30) break;
  }

  if (next.battle?.playerHero.health === 0) return { run: finishDefeat(next), steps };
  next = resolveEnemyMinionAttacks(next, (action, beforeRun, afterRun) => {
    addEnemyTurnStep(steps, action, beforeRun, afterRun);
  }, true);
  if (next.battle?.playerHero.health === 0) return { run: finishDefeat(next), steps };
  battle = next.battle!;
  const bossAreaTurn = battle.turnNumber % BOSS_AREA_ATTACK_EVERY_N_TURNS[next.difficulty === "hard" ? "hard" : "normal"] === 0;
  if (enemy.kind === "boss" && bossAreaTurn) {
    const beforeRun = cloneRun(next);
    const priorEventCount = battle.enemyTurnEvents?.length ?? 0;
    next = resolveBossAreaAttack(next, true);
    const eventList = next.battle?.enemyTurnEvents ?? [];
    const action = eventList.length > priorEventCount ? eventList[eventList.length - 1] : undefined;
    if (action) addEnemyTurnStep(steps, action, beforeRun, next);
    if (next.battle?.playerHero.health === 0) return { run: finishDefeat(next), steps };
  }
  if (next.status !== "active" || !next.battle) return { run: next, steps };
  expireTemporaryMana(next.battle.enemyMana);
  return { run: startPlayerTurn(next), steps };
}

export function resolveEnemyTurn(run: RunState): RunState {
  return resolveEnemyTurnWithPlayback(run).run;
}

export function endPlayerTurnWithPlayback(run: RunState): EnemyTurnResolution {
  const next = cloneRun(run);
  const battle = assertPlayerTurn(next);
  consumeOpeningHandRedraw(next);
  expirePlayerTurnStatuses(battle);
  battle.activeSide = "enemy";
  // The player was the second side of this round: the next round starts with the enemy.
  if (battle.firstSide === "enemy") battle.turnNumber += 1;
  expireTemporaryMana(battle.playerMana);
  battle.enemyBoard = battle.enemyBoard.map((minion) => ({ ...minion, hasAttacked: false }));
  return resolveEnemyTurnWithPlayback(next);
}

export function endPlayerTurn(run: RunState): RunState {
  return endPlayerTurnWithPlayback(run).run;
}

export function chooseReward(run: RunState, cardId: string): RunState {
  if (run.pendingVictoryAcknowledgement) fail("ENCOUNTER_NOT_READY", "Acknowledge the battle victory before choosing a reward.");
  if (!run.pendingReward) fail("REWARD_NOT_PENDING", "There is no card reward to choose.");
  if (!run.pendingReward.choices.includes(cardId)) fail("INVALID_TARGET", "Choose one of the offered cards.");
  if (run.deck.length >= 35) fail("MAX_DECK", "The deck is full; discard one card to take this reward.");
  const next = cloneRun(run);
  const counts = cardCounts(next.deck);
  if ((counts.get(cardId) ?? 0) >= 2) fail("MAX_COPIES", "The run deck already has two copies of this card.");
  next.deck.push(makeInstance(next, cardId, "reward"));
  next.nextInstanceNumber += 1;
  next.pendingReward = null;
  return next;
}

export function chooseRewardAndDiscard(run: RunState, cardId: string, discardInstanceId: string): RunState {
  if (run.deck.length < 35) fail("INVALID_ACTION", "A discard is only required when the deck already has 35 cards.");
  if (run.pendingVictoryAcknowledgement) fail("ENCOUNTER_NOT_READY", "Acknowledge the battle victory before choosing a reward.");
  if (!run.pendingReward) fail("REWARD_NOT_PENDING", "There is no card reward to choose.");
  if (!run.pendingReward.choices.includes(cardId)) fail("INVALID_TARGET", "Choose one of the offered cards.");
  if (!run.deck.some(({ instanceId }) => instanceId === discardInstanceId)) {
    fail("INVALID_TARGET", "Choose a card from the current deck to discard.");
  }
  const discardedCard = run.deck.find(({ instanceId }) => instanceId === discardInstanceId)!;
  const counts = cardCounts(run.deck);
  const remainingCopies = (counts.get(cardId) ?? 0) - (discardedCard.cardId === cardId ? 1 : 0);
  if (remainingCopies >= 2) fail("MAX_COPIES", "The run deck already has two copies of this card.");
  const next = cloneRun(run);
  next.deck.push(makeInstance(next, cardId, "reward"));
  next.nextInstanceNumber += 1;
  next.pendingReward = null;
  const discardIndex = next.deck.findIndex(({ instanceId }) => instanceId === discardInstanceId);
  if (discardIndex < 0) fail("INVALID_TARGET", "The selected deck card cannot be discarded.");
  next.deck.splice(discardIndex, 1);
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
  if (next.status === "victory") next.battle = null;
  return next;
}

export function advanceRun(run: RunState, nextSeed: number, options: { pickTurnOrder?: boolean } = {}): RunState {
  if (run.status !== "active" || run.pendingReward || !run.battle || run.battle.status !== "playerWon") {
    fail("ENCOUNTER_NOT_READY", "Resolve the battle reward before advancing.");
  }
  const encounterIndex = run.encounters.findIndex((encounter) => encounter.status === "pending");
  if (encounterIndex < 0) {
    return { ...cloneRun(run), status: "victory", battle: null };
  }
  return beginEncounter(cloneRun(run), encounterIndex, normalizeSeed(nextSeed), options.pickTurnOrder === true);
}

export const gameConstants = {
  maxBoard: MAX_BOARD,
  maxHand: MAX_HAND,
  heroHealth: HERO_HEALTH,
  initialMana: INITIAL_MANA,
  maxMana: MAX_MANA,
  soulShardHeroPowerCost: SOUL_SHARD_HERO_POWER_COST,
  hardAiBeamWidth,
  normalAiBeamWidth,
  enemyPhaseBonus: ENEMY_PHASE_BONUS,
  bossAreaCadence: BOSS_AREA_ATTACK_EVERY_N_TURNS,
  turnDrawCount: TURN_DRAW_COUNT,
  coinCardId: COIN_CARD_ID,
  turnOrderRoles: ["first", "second"] as const,
  enemyTauntBoardBonus: ENEMY_TAUNT_BOARD_BONUS,
} as const;
