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
  acknowledgeVictory,
  attackWithMinion,
  castSpell,
  chooseReward,
  createRun,
  discardBeforeDraw,
  endPlayerTurn,
  gameConstants,
  hydrateRunForCurrentBattle,
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
  return acknowledgeVictory(attackWithMinion(next, `winner-${next.completedBattles}`, battle.enemyHero.id));
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

    const expectedDescriptions: Record<string, string> = {
      "ash-wolf": "특수 효과 없음",
      "crypt-guard": "특수 효과 없음",
      "cinder-imp": "전투의 함성: 뼈 쥐 1마리를 소환합니다.",
      "bone-rat": "특수 효과 없음",
      "grave-knight": "전투의 함성: 다른 아군 하수인에게 공격력 +1 및 체력 +1을 부여합니다.",
      "mire-witch": "전투의 함성: 뼈 쥐 1마리를 소환합니다.",
      "iron-hound": "특수 효과 없음",
      "ember-priest": "전투의 함성: 자신에게 체력 +2를 부여합니다.",
      "shade-stalker": "특수 효과 없음",
      "thorn-brute": "죽음의 메아리: 뼈 쥐 1마리를 소환합니다.",
      "dusk-raven": "특수 효과 없음",
      "plague-bearer": "죽음의 메아리: 불씨 임프 1마리를 소환합니다.",
      "rune-smith": "전투의 함성: 자신에게 공격력 +1을 부여합니다.",
      "moon-stag": "특수 효과 없음",
      "hollow-giant": "특수 효과 없음",
      "blood-oracle": "전투의 함성: 자신에게 체력 +2를 부여합니다.",
      "frost-wraith": "죽음의 메아리: 뼈 쥐 2마리를 소환합니다.",
      "storm-crow": "특수 효과 없음",
      "ancient-treant": "특수 효과 없음",
      "dread-colossus": "특수 효과 없음",
      "shadow-bolt": "적 영웅에게 2의 피해를 줍니다.",
      "soul-lance": "적 하수인에게 3의 피해를 줍니다.",
      "healing-mist": "내 영웅의 체력을 4 회복합니다.",
      "raise-bones": "뼈 쥐 2마리를 소환합니다.",
      "rune-surge": "아군 하수인에게 공격력 +2 및 체력 +1을 부여합니다.",
      "dark-insight": "카드를 2장 뽑습니다.",
      "meteor-shard": "적 하수인에게 5의 피해를 줍니다.",
      "life-thread": "아군 하수인의 체력을 5 회복합니다.",
      "soul-storm": "적 영웅에게 4의 피해를 줍니다. / 카드를 1장 뽑습니다.",
      eclipse: "적 영웅에게 8의 피해를 줍니다.",
    };
    for (const card of CARD_CATALOG) {
      expect(card.description).toBe(expectedDescriptions[card.id]);
      expect(card.description).not.toMatch(/전투 능력을 가진 하수인|필드에 소환해 공격하는 하수인|마나를 소모해 효과를 발휘하는 주문/);
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

  it("has six normal enemies and three phase bosses with valid tactical profiles", () => {
    expect(NORMAL_ENEMIES).toHaveLength(6);
    expect(BOSSES).toHaveLength(3);
    for (const enemy of [...NORMAL_ENEMIES, ...BOSSES]) {
      expect(ENEMY_BY_ID.has(enemy.id)).toBe(true);
      expect(enemy.maxHealth).toBeGreaterThan(0);
      expect(enemy.tactics.profile).toBeTruthy();
    }
    expect([...NORMAL_ENEMIES, ...BOSSES].every((enemy) => !("actions" in enemy))).toBe(true);
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
    expect(first.battle?.playerMana).toEqual({ current: 5, max: 10 });
    expect(first.battle?.enemyMana).toEqual({ current: 5, max: 10 });
    expect(first.battle?.enemyStarterDeck).toHaveLength(30);
    expect(first.battle?.enemyHand).toHaveLength(3);
    expect(first.battle?.enemyDrawPile).toHaveLength(27);
    expect(first.battle?.playerHero.health).toBe(30);
    expect(first.battle).not.toHaveProperty("pendingEnemyCharge");
    expect(first.starterDeck).toHaveLength(30);
    expect(first.deck).toHaveLength(30);
  });

  it("builds deterministic personality-weighted enemy decks with at most two copies", () => {
    const first = createRun(4567);
    const second = createRun(4567);
    expect(first.battle?.enemyStarterDeck).toEqual(second.battle?.enemyStarterDeck);
    const deck = first.battle!.enemyStarterDeck;
    expect(new Set(deck.map((card) => card.instanceId)).size).toBe(30);
    const counts = new Map<string, number>();
    for (const card of deck) counts.set(card.cardId, (counts.get(card.cardId) ?? 0) + 1);
    expect([...counts.values()].every((count) => count <= 2)).toBe(true);
    expect(first.battle?.enemyDrawPile).toHaveLength(27);
    expect(first.battle?.rngState).toBe(second.battle?.rngState);
  });

  it("hydrates an active legacy battle without changing player state or modern enemy zones", () => {
    const modern = copyRun(createRun(789));
    const modernBattle = activeBattle(modern);
    const expectedDeck = structuredClone(modernBattle.enemyStarterDeck);
    // Simulate an older snapshot while retaining the fields required by the current type.
    const legacy = copyRun(createRun(790));
    const legacyBattle = legacy.battle! as unknown as Record<string, unknown>;
    delete legacyBattle.enemyMana;
    delete legacyBattle.enemyStarterDeck;
    delete legacyBattle.enemyHand;
    delete legacyBattle.enemyDrawPile;
    delete legacyBattle.enemyDiscardPile;
    const playerHand = structuredClone(legacyBattle.hand);
    const playerBoard = structuredClone(legacyBattle.playerBoard);
    legacyBattle.pendingEnemyCharge = { turnsRemaining: 1, damage: 4, target: "hero" };

    const hydrated = hydrateRunForCurrentBattle(legacy);
    expect(hydrated).not.toBe(legacy);
    expect(hydrated.battle?.hand).toEqual(playerHand);
    expect(hydrated.battle?.playerBoard).toEqual(playerBoard);
    expect(hydrated.battle?.enemyMana).toEqual({ current: 5, max: 10 });
    expect(hydrated.battle?.enemyStarterDeck).toHaveLength(30);
    expect(hydrated.battle?.enemyHand).toHaveLength(3);
    expect(hydrated.battle?.enemyDrawPile).toHaveLength(27);
    expect(hydrated.battle).not.toHaveProperty("pendingEnemyCharge");

    const unchanged = hydrateRunForCurrentBattle(modern);
    expect(unchanged).toBe(modern);
    expect(unchanged.battle?.enemyStarterDeck).toEqual(expectedDeck);
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
    expect(next.battle?.playerMana).toEqual({ current: 5, max: 10 });
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

  it("regenerates one remaining mana each turn up to ten", () => {
    let run = createRun(22);
    for (let turn = 2; turn <= 12; turn += 1) {
      activeBattle(run).playerHero.health = 30;
      activeBattle(run).hand = [];
      run = endPlayerTurn(run);
      const expectedMana = Math.min(10, 5 + turn - 1);
      expect(run.battle?.playerMana).toEqual({ current: expectedMana, max: 10 });
    }
    expect(run.battle?.playerMana).toEqual({ current: 10, max: 10 });
    expect(run.battle?.turnNumber).toBe(12);
  });

  it("preserves unspent mana, regenerates from zero, and normalizes legacy caps", () => {
    const preserved = copyRun(createRun(221));
    activeBattle(preserved).playerHero.health = 30;
    activeBattle(preserved).hand = [];
    const next = endPlayerTurn(preserved);
    expect(next.battle?.playerMana).toEqual({ current: 6, max: 10 });

    const empty = copyRun(createRun(222));
    activeBattle(empty).playerMana.current = 0;
    activeBattle(empty).playerHero.health = 30;
    activeBattle(empty).hand = [];
    expect(endPlayerTurn(empty).battle?.playerMana).toEqual({ current: 1, max: 10 });

    const legacy = copyRun(createRun(223));
    activeBattle(legacy).playerMana = { current: 5, max: 6 };
    activeBattle(legacy).playerHero.health = 30;
    activeBattle(legacy).hand = [];
    expect(endPlayerTurn(legacy).battle?.playerMana).toEqual({ current: 6, max: 10 });
  });

  it("enforces minion target priority and applies damage from both minions", () => {
    const run = copyRun(createRun(2));
    const battle = activeBattle(run);
    battle.playerBoard = [minion({ instanceId: "attacker", attack: 3, health: 5, maxHealth: 5, summonedTurn: 0 })];
    battle.enemyBoard = [minion({ instanceId: "defender", owner: "enemy", health: 3, maxHealth: 3, attack: 1 })];
    expect(() => attackWithMinion(run, "attacker", battle.enemyHero.id)).toThrowError(expect.objectContaining({ code: "INVALID_TARGET" }));
    const attacked = attackWithMinion(run, "attacker", "defender");
    expect(attacked.battle?.enemyBoard).toHaveLength(0);
    expect(attacked.battle?.playerBoard[0]).toMatchObject({ hasAttacked: true, health: 4 });
    expect(attacked.battle?.enemyDiscardPile).toContainEqual(instance("defender", "ash-wolf"));
    expect(() => attackWithMinion(attacked, "attacker", attacked.battle!.enemyHero.id)).toThrowError(expect.objectContaining({ code: "INVALID_ACTION" }));
  });

  it("removes both minions after simultaneous lethal combat and resolves both death summons once", () => {
    const run = asEnemyTurn(createRun(224));
    const battle = activeBattle(run);
    battle.enemyMana.current = 0;
    battle.enemyHand = [];
    battle.enemyDrawPile = [instance("enemy-expensive", "eclipse")];
    battle.enemyBoard = [minion({ instanceId: "enemy-thorn", cardId: "thorn-brute", owner: "enemy", attack: 5, health: 5, maxHealth: 5, summonedTurn: 0 })];
    battle.playerBoard = [minion({ instanceId: "player-thorn", cardId: "thorn-brute", attack: 5, health: 5, maxHealth: 5, summonedTurn: 0 })];

    const result = resolveEnemyTurn(run);
    expect(result.battle?.enemyBoard.map((entry) => entry.cardId)).toEqual(["bone-rat"]);
    expect(result.battle?.playerBoard.map((entry) => entry.cardId)).toEqual(["bone-rat"]);
    expect(result.battle?.enemyDiscardPile.filter((entry) => entry.instanceId === "enemy-thorn")).toHaveLength(1);
    expect(result.battle?.discardPile.filter((entry) => entry.instanceId === "player-thorn")).toHaveLength(1);
    expect(result.battle?.enemyTurnEvents?.filter((event) => event.type === "attack")).toHaveLength(1);
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
  it("plays multiple affordable cards with refreshed enemy mana and waits to attack with new minions", () => {
    const run = copyRun(createRun(48));
    const battle = activeBattle(run);
    battle.enemyHand = [instance("enemy-wolf", "ash-wolf"), instance("enemy-guard", "crypt-guard"), instance("enemy-raven", "dusk-raven")];
    battle.enemyDrawPile = [instance("enemy-expensive", "eclipse")];
    const result = endPlayerTurn(run);
    expect(result.battle?.enemyMana).toEqual({ current: 0, max: 10 });
    expect(result.battle?.enemyBoard).toHaveLength(3);
    expect(result.battle?.enemyBoard.every((minion) => minion.summonedTurn === 1 && !minion.hasAttacked)).toBe(true);
    expect(result.battle?.enemyHand.map((card) => card.cardId)).toEqual(["eclipse"]);
    expect(result.battle?.activeSide).toBe("player");

    const nextEnemyTurn = copyRun(result);
    activeBattle(nextEnemyTurn).activeSide = "enemy";
    activeBattle(nextEnemyTurn).enemyHand = [];
    activeBattle(nextEnemyTurn).enemyMana.current = 0;
    activeBattle(nextEnemyTurn).enemyDrawPile = [instance("still-expensive", "eclipse")];
    const refreshed = resolveEnemyTurn(nextEnemyTurn);
    expect(refreshed.battle?.enemyMana.current).toBe(1);
  });

  it("spends mana on targeted damage spells and always chooses player minions first", () => {
    const run = asEnemyTurn(createRun(49));
    const battle = activeBattle(run);
    battle.enemyMana.current = 2;
    battle.enemyHand = [instance("enemy-lance", "soul-lance")];
    battle.enemyDrawPile = [instance("enemy-expensive", "eclipse")];
    battle.playerBoard = [
      minion({ instanceId: "safe-target", attack: 1, health: 5, maxHealth: 5 }),
      minion({ instanceId: "lethal-target", attack: 8, health: 2, maxHealth: 2 }),
    ];
    const result = resolveEnemyTurn(run);
    expect(result.battle?.playerBoard.map((minion) => minion.instanceId)).toEqual(["safe-target"]);
    expect(result.battle?.playerHero.health).toBe(30);
    expect(result.battle?.enemyMana.current).toBe(0);
    expect(result.battle?.enemyDiscardPile).toContainEqual(instance("enemy-lance", "soul-lance"));
  });

  it("makes ready enemy minions trade reciprocal damage before attacking the hero on an empty board", () => {
    const run = asEnemyTurn(createRun(50));
    const battle = activeBattle(run);
    battle.enemyMana.current = 0;
    battle.enemyHand = [];
    battle.enemyDrawPile = [instance("enemy-expensive", "eclipse")];
    battle.enemyBoard = [minion({ instanceId: "enemy-attacker", owner: "enemy", attack: 1, health: 5, maxHealth: 5, summonedTurn: 0 })];
    battle.playerBoard = [minion({ instanceId: "victim", health: 5, maxHealth: 5, attack: 3 })];
    const exchangedDamage = resolveEnemyTurn(run);
    expect(exchangedDamage.battle?.playerBoard[0]?.health).toBe(4);
    expect(exchangedDamage.battle?.enemyBoard[0]).toMatchObject({ health: 2, hasAttacked: true });
    expect(exchangedDamage.battle?.playerHero.health).toBe(30);

    const openBoard = copyRun(exchangedDamage);
    activeBattle(openBoard).activeSide = "enemy";
    activeBattle(openBoard).enemyBoard[0]!.hasAttacked = false;
    activeBattle(openBoard).playerBoard = [];
    activeBattle(openBoard).enemyMana.current = 0;
    activeBattle(openBoard).enemyHand = [];
    activeBattle(openBoard).enemyDrawPile = [instance("enemy-expensive-2", "eclipse")];
    const hitHero = resolveEnemyTurn(openBoard);
    expect(hitHero.battle?.playerHero.health).toBe(29);
  });

  it("uses enemy-owned healing and buffs on its own hero and minions", () => {
    const run = asEnemyTurn(createRun(51));
    const battle = activeBattle(run);
    battle.enemyMana.current = 4;
    battle.enemyHero.health -= 3;
    battle.enemyBoard = [minion({ instanceId: "ally", owner: "enemy", attack: 2, health: 2, maxHealth: 3, summonedTurn: 99 })];
    battle.enemyHand = [instance("enemy-heal", "healing-mist"), instance("enemy-buff", "rune-surge")];
    battle.enemyDrawPile = [instance("enemy-expensive", "eclipse")];
    const result = resolveEnemyTurn(run);
    expect(result.battle?.enemyHero.health).toBe(battle.enemyHero.maxHealth);
    expect(result.battle?.enemyBoard[0]?.attack).toBeGreaterThan(2);
    expect(result.battle?.playerHero.health).toBe(30);
  });

  it("auto-discards the lowest-priority card at hand limit and refills from the seeded starter deck", () => {
    const run = asEnemyTurn(createRun(52));
    const battle = activeBattle(run);
    battle.enemyId = "bandit-scout";
    battle.enemyMana.current = 0;
    battle.enemyHand = Array.from({ length: 10 }, (_, index) => instance(`enemy-hand-${index}`, index === 0 ? "eclipse" : "ash-wolf"));
    battle.enemyDrawPile = [instance("last-draw", "eclipse")];
    const overflow = resolveEnemyTurn(run);
    expect(overflow.battle?.enemyHand).toHaveLength(10);
    expect(overflow.battle?.enemyDiscardPile.some((card) => card.cardId === "ash-wolf")).toBe(true);

    const recycled = asEnemyTurn(createRun(53));
    const recycledBattle = activeBattle(recycled);
    recycledBattle.enemyMana.current = 0;
    recycledBattle.enemyHand = [];
    recycledBattle.enemyDrawPile = [];
    const result = resolveEnemyTurn(recycled);
    expect(result.battle?.enemyHand).toHaveLength(1);
    expect(result.battle?.enemyDrawPile).toHaveLength(29);
    expect(result.battle?.enemyHand[0]?.instanceId).toMatch(/^enemy-recycle-/);
  });

  it("runs the boss area pattern on turns 3, 6, and 9 after cards and before minion attacks", () => {
    for (const turnNumber of [3, 6, 9]) {
      const bossRun = asEnemyTurn(createRun(54 + turnNumber));
      const bossBattle = activeBattle(bossRun);
      bossBattle.enemyId = "boss-grave-king";
      bossBattle.turnNumber = turnNumber;
      bossBattle.enemyMana.current = 0;
      bossBattle.enemyHand = turnNumber === 3 ? [instance("boss-minion", "ash-wolf")] : [];
      bossBattle.enemyDrawPile = [instance(`boss-expensive-${turnNumber}`, "eclipse")];
      bossBattle.playerBoard = [minion({ instanceId: `one-health-${turnNumber}`, health: 1, maxHealth: 1 }), minion({ instanceId: `survivor-${turnNumber}`, health: 3, maxHealth: 3 })];
      bossBattle.enemyBoard = turnNumber === 3 ? [minion({ instanceId: "boss-attacker", owner: "enemy", attack: 1, summonedTurn: 0 })] : [];
      const result = resolveEnemyTurn(bossRun);
      expect(result.battle?.playerHero.health).toBe(29);
      expect(result.battle?.playerBoard.map((minion) => minion.instanceId)).toEqual([`survivor-${turnNumber}`]);
      expect(result.battle?.playerBoard[0]?.health).toBe(turnNumber === 3 ? 1 : 2);
      expect(result.battle?.enemyBoard.some((minion) => minion.cardId === "ash-wolf")).toBe(turnNumber === 3);
      expect(result.battle?.enemyTurnEvents?.some((event) => event.type === "boss-area")).toBe(true);
      if (turnNumber === 3) expect(result.battle?.enemyTurnEvents?.some((event) => event.type === "attack" && event.targetId === `survivor-${turnNumber}`)).toBe(true);
    }

    const offTurn = asEnemyTurn(createRun(55));
    activeBattle(offTurn).enemyId = "boss-grave-king";
    activeBattle(offTurn).turnNumber = 2;
    activeBattle(offTurn).enemyMana.current = 0;
    activeBattle(offTurn).enemyHand = [];
    activeBattle(offTurn).enemyDrawPile = [instance("boss-expensive", "eclipse")];
    const secondTurn = resolveEnemyTurn(offTurn);
    expect(secondTurn.battle?.enemyTurnEvents?.some((event) => event.type === "boss-area")).toBe(false);

    const lethal = asEnemyTurn(createRun(56));
    activeBattle(lethal).enemyId = "boss-grave-king";
    activeBattle(lethal).turnNumber = 3;
    activeBattle(lethal).enemyMana.current = 0;
    activeBattle(lethal).enemyHand = [];
    activeBattle(lethal).enemyDrawPile = [instance("boss-expensive", "eclipse")];
    activeBattle(lethal).playerHero.health = 1;
    const defeated = resolveEnemyTurn(lethal);
    expect(defeated.status).toBe("defeat");
    expect(defeated.battle).toBeNull();
  });

  it("ignores legacy fixed charge actions and stops when an enemy card defeats the player", () => {
    const legacy = asEnemyTurn(createRun(56));
    const legacyBattle = activeBattle(legacy);
    legacyBattle.enemyMana.current = 0;
    legacyBattle.enemyHand = [];
    legacyBattle.enemyDrawPile = [instance("enemy-expensive", "eclipse")];
    (legacyBattle as BattleState & { pendingEnemyCharge?: unknown }).pendingEnemyCharge = { turnsRemaining: 1, damage: 30, target: "hero" };
    legacyBattle.enemyBoard = [];
    const noCharge = resolveEnemyTurn(legacy);
    expect(noCharge.status).toBe("active");
    expect(noCharge.battle?.playerHero.health).toBe(30);
    expect(noCharge.battle).not.toHaveProperty("pendingEnemyCharge");

    const lethal = asEnemyTurn(createRun(57));
    const lethalBattle = activeBattle(lethal);
    lethalBattle.enemyMana.current = 1;
    lethalBattle.enemyHand = [instance("lethal-bolt", "shadow-bolt")];
    lethalBattle.enemyDrawPile = [instance("enemy-expensive", "eclipse")];
    lethalBattle.playerHero.health = 2;
    const defeated = resolveEnemyTurn(lethal);
    expect(defeated.status).toBe("defeat");
    expect(defeated.battle).toBeNull();
  });

  it("requires a saved victory acknowledgement before normal or final-boss rewards", () => {
    const run = copyRun(createRun(70));
    const battle = activeBattle(run);
    battle.enemyBoard = [];
    battle.enemyHero.health = 1;
    battle.playerBoard.push(minion({ instanceId: "victory-tap", attack: 10, summonedTurn: battle.turnNumber - 1 }));
    const won = attackWithMinion(run, "victory-tap", battle.enemyHero.id);
    expect(won.pendingVictoryAcknowledgement).toBe(true);
    expect(won.pendingReward).not.toBeNull();
    expect(() => chooseReward(won, won.pendingReward!.choices[0]!)).toThrowError(expect.objectContaining({ code: "ENCOUNTER_NOT_READY" }));
    expect(() => skipReward(won)).toThrowError(expect.objectContaining({ code: "ENCOUNTER_NOT_READY" }));
    const confirmed = acknowledgeVictory(won);
    expect(confirmed.pendingVictoryAcknowledgement).toBe(false);
    expect(confirmed.pendingReward).toEqual(won.pendingReward);
    expect(() => acknowledgeVictory(confirmed)).toThrowError(expect.objectContaining({ code: "ENCOUNTER_NOT_READY" }));

    const finalRun = copyRun(createRun(700));
    finalRun.completedBattles = 11;
    finalRun.phase = 3;
    finalRun.encounterInPhase = 3;
    finalRun.encounters.forEach((encounter, index) => { encounter.status = index === 11 ? "active" : "complete"; });
    const finalBattle = activeBattle(finalRun);
    finalBattle.enemyId = "boss-void-titan";
    finalBattle.enemyHero.health = 1;
    finalBattle.enemyBoard = [];
    finalBattle.playerBoard.push(minion({ instanceId: "final-victory-tap", attack: 10, summonedTurn: finalBattle.turnNumber - 1 }));
    const finalWon = attackWithMinion(finalRun, "final-victory-tap", finalBattle.enemyHero.id);
    expect(finalWon.status).toBe("victory");
    expect(finalWon.battle).toBeNull();
    expect(finalWon.pendingVictoryAcknowledgement).toBe(true);
    const finalConfirmed = acknowledgeVictory(finalWon);
    expect(finalConfirmed.pendingVictoryAcknowledgement).toBe(false);
    expect(skipReward(finalConfirmed).status).toBe("victory");
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
    expect(next.battle?.playerMana).toEqual({ current: 5, max: 10 });
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

