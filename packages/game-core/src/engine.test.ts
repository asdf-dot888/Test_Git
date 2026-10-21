import { describe, expect, it } from "vitest";
import {
  BOSSES,
  CARD_CATALOG,
  CARD_BY_ID,
  ENEMY_BY_ID,
  NORMAL_ENEMIES,
  STARTER_DECK_CARD_IDS,
} from "./catalog.js";
import {
  advanceRun,
  attackWithMinion,
  castSpell,
  chooseReward,
  createRun,
  discardBeforeDraw,
  endPlayerTurn,
  gameConstants,
  playMinion,
  resolveEnemyTurn,
  skipReward,
  startBattle,
} from "./engine.js";
import { GameRuleError } from "./errors.js";
import { pickIndex, shuffle } from "./random.js";
import type { BattleState, CardInstance, MinionState, RunState } from "./types.js";

function copyRun(run: RunState): RunState {
  return structuredClone(run);
}

function activeBattle(run: RunState): BattleState {
  if (!run.battle) throw new Error("Expected an active battle in test setup.");
  return run.battle;
}

function instance(instanceId: string, cardId: string): CardInstance {
  return { instanceId, cardId };
}

function minion(overrides: Partial<MinionState> = {}): MinionState {
  return {
    instanceId: "test-minion",
    cardId: "ash-wolf",
    owner: "player",
    attack: 8,
    health: 4,
    maxHealth: 4,
    summonedTurn: 0,
    hasAttacked: false,
    ...overrides,
  };
}

function asEnemyTurn(run: RunState): RunState {
  const next = copyRun(run);
  activeBattle(next).activeSide = "enemy";
  return next;
}

function winCurrentBattle(run: RunState): RunState {
  const next = copyRun(run);
  const battle = activeBattle(next);
  battle.enemyBoard = [];
  battle.enemyHero.health = 1;
  battle.playerBoard.push(minion({ instanceId: `winner-${next.completedBattles}`, attack: 10, summonedTurn: battle.turnNumber - 1 }));
  return attackWithMinion(next, `winner-${next.completedBattles}`, battle.enemyHero.id);
}

describe("card and enemy catalog", () => {
  it("contains 30 unique cards split into 20 minions and 10 spells", () => {
    expect(CARD_CATALOG).toHaveLength(30);
    expect(new Set(CARD_CATALOG.map((card) => card.id)).size).toBe(30);
    expect(CARD_CATALOG.filter((card) => card.kind === "minion")).toHaveLength(20);
    expect(CARD_CATALOG.filter((card) => card.kind === "spell")).toHaveLength(10);
    for (const card of CARD_CATALOG) {
      expect(card.cost).toBeGreaterThanOrEqual(0);
      expect(card.cost).toBeLessThanOrEqual(10);
      expect(card.name.length).toBeGreaterThan(0);
      expect(card.description.length).toBeGreaterThan(0);
      expect(card.artKey.length).toBeGreaterThan(0);
      if (card.kind === "minion") expect(card.minion).toBeDefined();
      else expect(card.spellEffects?.length).toBeGreaterThan(0);
    }
  });

  it("has a 30-card, 20-minion/10-spell starter deck with two copies per ID", () => {
    expect(STARTER_DECK_CARD_IDS).toHaveLength(30);
    const counts = new Map<string, number>();
    for (const id of STARTER_DECK_CARD_IDS) counts.set(id, (counts.get(id) ?? 0) + 1);
    expect(counts.size).toBe(15);
    expect([...counts.values()].every((count) => count === 2)).toBe(true);
    expect(STARTER_DECK_CARD_IDS.filter((id) => CARD_BY_ID.get(id)?.kind === "minion")).toHaveLength(20);
    expect(STARTER_DECK_CARD_IDS.filter((id) => CARD_BY_ID.get(id)?.kind === "spell")).toHaveLength(10);
    expect(STARTER_DECK_CARD_IDS.every((id) => CARD_BY_ID.has(id))).toBe(true);
  });

  it("has six normal enemies and three phase bosses with valid actions", () => {
    expect(NORMAL_ENEMIES).toHaveLength(6);
    expect(BOSSES).toHaveLength(3);
    for (const enemy of [...NORMAL_ENEMIES, ...BOSSES]) {
      expect(ENEMY_BY_ID.has(enemy.id)).toBe(true);
      expect(enemy.maxHealth).toBeGreaterThan(0);
      expect(enemy.actions.some((action) => action.kind === "heroDamage")).toBe(true);
      expect(enemy.actions.some((action) => action.kind === "summon")).toBe(true);
      for (const action of enemy.actions) {
        if (action.kind === "summon") expect(CARD_BY_ID.get(action.cardId)?.kind).toBe("minion");
      }
    }
    const effects = BOSSES.map((boss) => boss.actions.find((action) => action.kind === "bossEffect"));
    expect(effects.every((effect) => effect?.kind === "bossEffect")).toBe(true);
    expect(new Set(effects.map((effect) => effect?.kind === "bossEffect" ? effect.effectId : "")).size).toBe(3);
  });
});

describe("seeded run setup and random helpers", () => {
  it("produces the same run from the same seed and plans 3 normals plus a boss per phase", () => {
    const first = createRun(1234);
    const second = createRun(1234);
    expect(first).toEqual(second);
    expect(first.encounters).toHaveLength(12);
    for (let phase = 1; phase <= 3; phase += 1) {
      const encounters = first.encounters.filter((encounter) => encounter.phase === phase);
      expect(encounters.map((encounter) => encounter.kind)).toEqual(["normal", "normal", "normal", "boss"]);
      expect(encounters[3]?.enemyId).toBe(BOSSES[phase - 1]?.id);
    }
    expect(first.battle?.hand).toHaveLength(3);
    expect(first.battle?.playerMana).toEqual({ current: 5, max: 5 });
    expect(first.battle?.playerHero.health).toBe(30);
    expect(first.starterDeck).toHaveLength(30);
    expect(first.deck).toHaveLength(30);
  });

  it("shuffles deterministically without changing the source array", () => {
    const input = [1, 2, 3, 4, 5, 6];
    const first = shuffle(input, 42);
    const second = shuffle(input, 42);
    expect(first).toEqual(second);
    expect(first.items).not.toBe(input);
    expect(input).toEqual([1, 2, 3, 4, 5, 6]);
    expect([...first.items].sort()).toEqual(input);
    const firstPick = pickIndex(5, 9);
    expect(pickIndex(5, 9)).toEqual(firstPick);
    expect(firstPick.value).toBeGreaterThanOrEqual(0);
    expect(firstPick.value).toBeLessThan(5);
  });
});

describe("player actions and battle rules", () => {
  it("uses mana to play minions, keeps the input state unchanged, and prevents same-turn attacks", () => {
    const run = createRun(7);
    const next = copyRun(run);
    const battle = activeBattle(next);
    const handCard = instance("test-iron-hound", "iron-hound");
    battle.hand = [handCard];

    const played = playMinion(next, handCard.instanceId);
    expect(played.battle?.playerMana.current).toBe(2);
    expect(played.battle?.hand).toHaveLength(0);
    expect(played.battle?.playerBoard[0]).toMatchObject({ attack: 3, health: 4, hasAttacked: false });
    expect(next.battle?.playerMana.current).toBe(5);
    expect(() => attackWithMinion(played, handCard.instanceId, played.battle!.enemyHero.id)).toThrow(GameRuleError);
  });

  it("rejects insufficient mana, wrong card kind, and a sixth minion without mutation", () => {
    const run = copyRun(createRun(8));
    const battle = activeBattle(run);
    battle.playerMana.current = 0;
    battle.hand = [instance("expensive", "shade-stalker")];
    expect(() => playMinion(run, "expensive")).toThrowError(expect.objectContaining({ code: "INSUFFICIENT_MANA" }));
    expect(run.battle?.hand[0]?.instanceId).toBe("expensive");

    battle.playerMana.current = 10;
    battle.hand = [instance("spell", "shadow-bolt")];
    expect(() => playMinion(run, "spell")).toThrowError(expect.objectContaining({ code: "INVALID_ACTION" }));

    battle.playerBoard = Array.from({ length: gameConstants.maxBoard }, (_, index) => minion({ instanceId: `full-${index}` }));
    battle.hand = [instance("sixth", "ash-wolf")];
    expect(() => playMinion(run, "sixth")).toThrowError(expect.objectContaining({ code: "MAX_BOARD" }));
  });

  it("grows and refills mana each turn up to ten", () => {
    let run = createRun(22);
    for (let turn = 2; turn <= 7; turn += 1) {
      activeBattle(run).playerHero.health = 30;
      activeBattle(run).hand = [];
      run = endPlayerTurn(run);
      const expectedMana = Math.min(10, turn + 4);
      expect(run.battle?.playerMana).toEqual({ current: expectedMana, max: expectedMana });
    }
    for (let turn = 8; turn <= 12; turn += 1) {
      activeBattle(run).playerHero.health = 30;
      activeBattle(run).hand = [];
      run = endPlayerTurn(run);
    }
    expect(run.battle?.playerMana).toEqual({ current: 10, max: 10 });
    expect(run.battle?.turnNumber).toBe(12);
  });

  it("enforces minion target priority, once-per-turn attacks, and no retaliation", () => {
    const run = copyRun(createRun(2));
    const battle = activeBattle(run);
    battle.playerBoard = [minion({ instanceId: "attacker", attack: 4, summonedTurn: 0 })];
    battle.enemyBoard = [minion({ instanceId: "defender", owner: "enemy", health: 3, maxHealth: 3, attack: 9 })];
    expect(() => attackWithMinion(run, "attacker", battle.enemyHero.id)).toThrowError(expect.objectContaining({ code: "INVALID_TARGET" }));
    const attacked = attackWithMinion(run, "attacker", "defender");
    expect(attacked.battle?.enemyBoard).toHaveLength(0);
    expect(attacked.battle?.playerBoard[0]?.hasAttacked).toBe(true);
    expect(attacked.battle?.playerBoard[0]?.health).toBe(4);
    expect(attacked.battle?.discardPile).toContainEqual(instance("defender", "ash-wolf"));
    expect(() => attackWithMinion(attacked, "attacker", attacked.battle!.enemyHero.id)).toThrowError(expect.objectContaining({ code: "INVALID_ACTION" }));
  });

  it("allows hero attacks only after the enemy board is clear", () => {
    const run = copyRun(createRun(18));
    const battle = activeBattle(run);
    battle.playerBoard = [minion({ instanceId: "hero-attacker", attack: 5, summonedTurn: 0 })];
    const attacked = attackWithMinion(run, "hero-attacker", battle.enemyHero.id);
    expect(attacked.battle?.enemyHero.health).toBe(battle.enemyHero.health - 5);
  });

  it("requires a valid spell target and applies damage, healing, buffs, summons, and draws", () => {
    const run = copyRun(createRun(31));
    const battle = activeBattle(run);
    battle.hand = [instance("lance", "soul-lance")];
    battle.enemyBoard = [minion({ instanceId: "enemy-target", owner: "enemy", health: 2, maxHealth: 2 })];
    expect(() => castSpell(run, "lance")).toThrowError(expect.objectContaining({ code: "INVALID_TARGET" }));
    const damaged = castSpell(run, "lance", "enemy-target");
    expect(damaged.battle?.enemyBoard).toHaveLength(0);
    expect(damaged.battle?.discardPile).toContainEqual(instance("lance", "soul-lance"));

    const buffRun = copyRun(createRun(32));
    activeBattle(buffRun).hand = [instance("rune", "rune-surge")];
    activeBattle(buffRun).playerBoard = [minion({ instanceId: "friend", attack: 1, health: 2, maxHealth: 2 })];
    const buffed = castSpell(buffRun, "rune", "friend");
    expect(buffed.battle?.playerBoard[0]).toMatchObject({ attack: 3, health: 3, maxHealth: 3 });

    const summonRun = copyRun(createRun(33));
    activeBattle(summonRun).hand = [instance("bones", "raise-bones")];
    const summoned = castSpell(summonRun, "bones");
    expect(summoned.battle?.playerBoard).toHaveLength(2);

    const drawRun = copyRun(createRun(34));
    activeBattle(drawRun).hand = [instance("insight", "dark-insight"), ...Array.from({ length: 9 }, (_, index) => instance(`held-${index}`, "ash-wolf"))];
    const drawn = castSpell(drawRun, "insight");
    expect(drawn.battle?.hand).toHaveLength(10);
    expect(drawn.battle?.discardPile.some((card) => card.instanceId.startsWith("card-") || card.instanceId.startsWith("recycle-"))).toBe(true);
  });

  it("rejects a summon spell on a full board and does not consume its card", () => {
    const run = copyRun(createRun(12));
    const battle = activeBattle(run);
    battle.playerBoard = Array.from({ length: gameConstants.maxBoard }, (_, index) => minion({ instanceId: `board-${index}` }));
    battle.hand = [instance("bones", "raise-bones")];
    expect(() => castSpell(run, "bones")).toThrowError(expect.objectContaining({ code: "MAX_BOARD" }));
    expect(run.battle?.hand[0]?.instanceId).toBe("bones");
  });

  it("requires a hand discard before drawing when the hand is full", () => {
    let run = copyRun(createRun(13));
    const battle = activeBattle(run);
    battle.hand = Array.from({ length: gameConstants.maxHand }, (_, index) => instance(`held-${index}`, "ash-wolf"));
    battle.drawPile = [instance("next-draw", "shadow-bolt")];
    run = endPlayerTurn(run);
    expect(run.battle?.pendingDiscardBeforeDraw).toBe(true);
    expect(run.battle?.hand).toHaveLength(10);
    expect(() => discardBeforeDraw(run, "missing")).toThrowError(expect.objectContaining({ code: "CARD_NOT_FOUND" }));
    const discarded = discardBeforeDraw(run, "held-4");
    expect(discarded.battle?.pendingDiscardBeforeDraw).toBe(false);
    expect(discarded.battle?.hand).toHaveLength(10);
    expect(discarded.battle?.hand.some((card) => card.instanceId === "next-draw")).toBe(true);
    expect(discarded.battle?.discardPile.some((card) => card.instanceId === "held-4")).toBe(true);
  });

  it("refills an empty draw pile from a shuffled fresh copy of the initial 30 cards", () => {
    const run = copyRun(createRun(14));
    const battle = activeBattle(run);
    battle.drawPile = [];
    battle.hand = [instance("one", "ash-wolf")];
    battle.enemyBoard = Array.from({ length: gameConstants.maxBoard }, (_, index) => minion({ instanceId: `full-enemy-${index}`, owner: "enemy", summonedTurn: 99 }));
    const drawn = endPlayerTurn(run);
    expect(drawn.battle?.hand).toHaveLength(2);
    expect(drawn.battle?.drawPile).toHaveLength(29);
    expect(drawn.battle?.drawPile.every((card) => run.starterDeck.some((starter) => starter.cardId === card.cardId))).toBe(true);
    expect(drawn.battle?.drawPile.every((card) => card.instanceId.startsWith("recycle-") || card.instanceId.startsWith("card-"))).toBe(true);
    expect(drawn.nextInstanceNumber).toBe(run.nextInstanceNumber + 30);
    expect(run.battle?.drawPile).toHaveLength(0);
  });

  it("runs battlecry and death summon effects without exceeding five board slots", () => {
    const run = copyRun(createRun(15));
    const battle = activeBattle(run);
    battle.hand = [instance("imp", "cinder-imp")];
    const summoned = playMinion(run, "imp");
    expect(summoned.battle?.playerBoard.map((entry) => entry.cardId)).toEqual(["cinder-imp", "bone-rat"]);

    const deathRun = copyRun(createRun(16));
    const deathBattle = activeBattle(deathRun);
    deathBattle.playerBoard = [minion({ instanceId: "thorn", cardId: "thorn-brute", health: 1, maxHealth: 6 })];
    deathBattle.enemyBoard = [minion({ instanceId: "killer", owner: "enemy", attack: 2, summonedTurn: 0 })];
    const resolved = endPlayerTurn(deathRun);
    expect(resolved.battle?.playerBoard.some((entry) => entry.instanceId === "thorn")).toBe(false);
    expect(resolved.battle?.playerBoard.some((entry) => entry.cardId === "bone-rat")).toBe(true);
  });
});

describe("enemy turns, rewards, and run progression", () => {
  it("filters impossible summon actions on a full enemy board and keeps intent hidden", () => {
    const run = copyRun(createRun(48));
    const battle = activeBattle(run);
    battle.enemyBoard = Array.from({ length: gameConstants.maxBoard }, (_, index) => minion({ instanceId: `enemy-${index}`, owner: "enemy", summonedTurn: 99 }));
    const result = endPlayerTurn(run);
    expect(result.battle?.enemyBoard).toHaveLength(5);
    expect(Object.keys(result.battle ?? {}).some((key) => key.toLowerCase().includes("intent") || key.toLowerCase().includes("action"))).toBe(false);
    expect(result.battle?.activeSide).toBe("player");
  });

  it("makes enemy minions attack once without retaliation and ends the run at zero hero health", () => {
    const run = copyRun(createRun(49));
    const battle = activeBattle(run);
    battle.playerBoard = [minion({ instanceId: "victim", health: 2, maxHealth: 2, attack: 99 })];
    battle.enemyBoard = [minion({ instanceId: "enemy-attacker", owner: "enemy", attack: 2, summonedTurn: 0 })];
    const resolved = resolveEnemyTurn(asEnemyTurn(run));
    expect(resolved.battle?.playerBoard).toHaveLength(0);
    expect(resolved.battle?.enemyBoard[0]?.hasAttacked).toBe(true);
    expect(resolved.battle?.enemyBoard[0]?.health).toBe(4);

    const defeated = copyRun(createRun(50));
    activeBattle(defeated).playerHero.health = 1;
    activeBattle(defeated).enemyBoard = Array.from({ length: 5 }, (_, index) => minion({ instanceId: `full-${index}`, owner: "enemy", summonedTurn: 99 }));
    activeBattle(defeated).rngState = findRandomSeed(2, 0);
    const loss = resolveEnemyTurn(asEnemyTurn(defeated));
    expect(loss.status).toBe("defeat");
    expect(loss.battle).toBeNull();
  });

  it("resolves each boss's unique hidden effect", () => {
    const bloodRun = asEnemyTurn(createRun(81));
    const bloodBattle = activeBattle(bloodRun);
    bloodBattle.enemyId = "boss-blood-matron";
    bloodBattle.rngState = findRandomSeed(3, 2);
    const blood = resolveEnemyTurn(bloodRun);
    expect(blood.battle?.playerHero.health).toBe(27);
    expect(blood.battle?.enemyHero.health).toBe(blood.battle?.enemyHero.maxHealth);

    const boneRun = asEnemyTurn(createRun(82));
    const boneBattle = activeBattle(boneRun);
    boneBattle.enemyId = "boss-grave-king";
    boneBattle.rngState = findRandomSeed(3, 2);
    boneBattle.playerBoard = [minion({ instanceId: "storm-victim", health: 1, maxHealth: 1 })];
    const bone = resolveEnemyTurn(boneRun);
    expect(bone.battle?.playerHero.health).toBe(28);
    expect(bone.battle?.playerBoard).toHaveLength(0);

    const voidRun = asEnemyTurn(createRun(83));
    const voidBattle = activeBattle(voidRun);
    voidBattle.enemyId = "boss-void-titan";
    voidBattle.rngState = findRandomSeed(3, 2);
    voidBattle.playerBoard = [minion({ instanceId: "pulse-victim", health: 3, maxHealth: 3 })];
    const pulse = resolveEnemyTurn(voidRun);
    expect(pulse.battle?.playerHero.health).toBe(26);
    expect(pulse.battle?.playerBoard[0]?.health).toBe(1);
  });

  it("offers tier-matched rewards, adds only a chosen copy, and permits skipping", () => {
    let run = winCurrentBattle(createRun(71));
    expect(run.pendingReward?.tier).toBe("normal");
    expect(run.pendingReward?.choices).toHaveLength(3);
    expect(run.pendingReward?.choices.every((id) => CARD_BY_ID.get(id)?.rewardTier === "normal")).toBe(true);
    expect(run.battle?.playerHero.health).toBe(30);
    const chosen = run.pendingReward!.choices[0]!;
    const before = run.deck.length;
    run = chooseReward(run, chosen);
    expect(run.deck).toHaveLength(before + 1);
    expect(run.pendingReward).toBeNull();
    expect(run.deck.filter((card) => card.cardId === chosen).length).toBeLessThanOrEqual(2);
    expect(() => chooseReward(run, chosen)).toThrowError(expect.objectContaining({ code: "REWARD_NOT_PENDING" }));

    const skipped = skipReward(winCurrentBattle(createRun(72)));
    expect(skipped.deck).toHaveLength(30);
    expect(skipped.pendingReward).toBeNull();
  });

  it("advances through nine normal fights and three bosses, then reaches victory", () => {
    let run = createRun(991);
    for (let index = 0; index < 12; index += 1) {
      run = winCurrentBattle(run);
      expect(run.completedBattles).toBe(index + 1);
      expect(run.pendingReward?.tier).toBe(index % 4 === 3 ? "boss" : "normal");
      expect(run.pendingReward?.choices).toHaveLength(3);
      run = skipReward(run);
      if (index < 11) run = advanceRun(run, 5000 + index);
    }
    expect(run.status).toBe("victory");
    expect(run.battle).toBeNull();
    expect(run.encounters.every((encounter) => encounter.status === "complete")).toBe(true);
  });

  it("starts only the next planned encounter and resets battle health, mana, and fields", () => {
    const run = skipReward(winCurrentBattle(createRun(741)));
    const nextEncounter = run.encounters.find((encounter) => encounter.status === "pending");
    expect(nextEncounter).toBeDefined();
    const waiting = copyRun(run);
    waiting.battle = null;
    const next = startBattle(waiting, nextEncounter!.enemyId);
    expect(next.battle?.enemyId).toBe(nextEncounter!.enemyId);
    expect(next.battle?.playerHero.health).toBe(30);
    expect(next.battle?.playerMana).toEqual({ current: 5, max: 5 });
    expect(next.battle?.hand).toHaveLength(3);
    expect(next.battle?.playerBoard).toHaveLength(0);
    expect(next.encounters[next.completedBattles]?.status).toBe("active");
    expect(() => startBattle(waiting, "boss-void-titan")).toThrowError(expect.objectContaining({ code: "ENCOUNTER_NOT_READY" }));
  });

  it("rejects invalid encounter advances, bad targets, and actions after terminal state", () => {
    const run = createRun(88);
    expect(() => advanceRun(run, 9)).toThrowError(expect.objectContaining({ code: "ENCOUNTER_NOT_READY" }));
    expect(() => attackWithMinion(run, "missing", "enemy")).toThrow(GameRuleError);
    const loss = copyRun(run);
    loss.status = "defeat";
    expect(() => endPlayerTurn(loss)).toThrowError(expect.objectContaining({ code: "TERMINAL_RUN" }));
  });
});

function findRandomSeed(length: number, desiredIndex: number): number {
  for (let seed = 1; seed < 100_000; seed += 1) {
    if (pickIndex(length, seed).value === desiredIndex) return seed;
  }
  throw new Error("Could not find a seed for the desired random index.");
}
