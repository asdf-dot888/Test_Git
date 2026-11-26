import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  BOSSES,
  CARD_CATALOG,
  CARD_BY_ID,
  ENEMY_BY_ID,
  FUSION_RECIPES,
  NORMAL_ENEMIES_BY_PHASE,
  PLAYER_CLASS_DEFINITIONS,
  SHARED_STARTER_CARD_IDS,
  NORMAL_ENEMIES,
  STARTER_DECK_CARD_IDS,
  TAUNT_CARD_IDS,
} from "./catalog.js";
import {
  advanceRun,
  acknowledgeVictory,
  attackWithMinion,
  castSpell,
  castSpellWithResolution,
  chooseReward,
  chooseTurnOrder,
  chooseRewardAndDiscard,
  createRun as createRunWithRealMana,
  discardBeforeDraw,
  endPlayerTurn,
  endPlayerTurnWithPlayback,
  fuseMinions,
  gameConstants,
  getLegalAttackTargets,
  hasTaunt,
  hydrateRunForCurrentBattle,
  playMinion,
  redrawOpeningHand,
  resolveEnemyTurn,
  resolveEnemyTurnWithPlayback,
  skipReward,
  startBattle,
  useHeroPower,
} from "./engine.js";
import { GameRuleError } from "./errors.js";
import { pickIndex, shuffle } from "./random.js";
import type { BattleState, CardInstance, MinionState, RunState } from "./types.js";

/**
 * Most scenarios here are about cards and combat, not the mana curve, so a run starts with 10 mana like a late turn (the real
 * Hearthstone-style curve, 1 mana on turn 1, is covered with `createRunWithRealMana`).
 */
function createRun(...args: Parameters<typeof createRunWithRealMana>): RunState {
  const run = createRunWithRealMana(...args);
  if (run.battle) {
    run.battle.playerMana = { current: 10, max: 10, temporary: 0 };
    run.battle.enemyMana = { current: 10, max: 10, temporary: 0 };
  }
  return run;
}

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
  // Enemy mana is min(10, turn number): scenarios play on a late turn so the enemy has its full 10 mana.
  activeBattle(next).turnNumber = Math.max(activeBattle(next).turnNumber, 10);
  // Scenarios start with an empty enemy draw pile so only the cards a test sets up are in play. An empty draw is fatigue
  // (1, 2, 3 ... damage); the counter starts at -1 here so the first empty draw of a scenario deals 0 and leaves hero health untouched.
  activeBattle(next).enemyDrawPile = [];
  activeBattle(next).enemyStarterDeck = [];
  activeBattle(next).enemyFatigue = -1;
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

describe("damage spell target restrictions", () => {
  const heroSpells = ["shadow-bolt", "soul-storm", "eclipse"];
  const minionSpells = ["soul-lance", "meteor-shard", "warrior-hammerfall", "assassin-shuriken", "demonist-hellfire"];

  function playerSpellRun(cardId: string): RunState {
    const run = createRun(912);
    const battle = activeBattle(run);
    battle.playerMana = { current: 10, max: 10, temporary: 0 };
    battle.hand = [instance("spell", cardId)];
    battle.playerBoard = [minion({ instanceId: "friendly", health: 10, maxHealth: 10 })];
    battle.enemyBoard = [minion({ instanceId: "opposing", owner: "enemy", health: 10, maxHealth: 10 }), minion({ instanceId: "dead", owner: "enemy", health: 0 })];
    battle.enemyHero.health = 30;
    battle.enemyHero.maxHealth = 30;
    return run;
  }

  it.each(heroSpells)("keeps %s on the hero for every supported player hero target", (cardId) => {
    const run = playerSpellRun(cardId);
    const original = copyRun(run);
    const effect = CARD_BY_ID.get(cardId)!.spellEffects![0]!;
    if (effect.kind !== "damage") throw new Error("Expected damage spell.");
    for (const targetId of [undefined, "enemy", "enemy-hero"]) {
      const result = castSpell(run, "spell", targetId);
      expect(result.battle?.enemyHero.health).toBe(30 - effect.amount);
      expect(result.battle?.enemyBoard).toEqual(run.battle!.enemyBoard);
    }
    expect(run).toEqual(original);
  });

  it.each(heroSpells)("rejects explicit non-hero targets for %s without consuming state", (cardId) => {
    const run = playerSpellRun(cardId);
    const original = copyRun(run);
    for (const targetId of ["friendly", "opposing", "player", "player-hero", "missing", ""]) {
      expect(() => castSpell(run, "spell", targetId)).toThrowError(expect.objectContaining({ code: "INVALID_TARGET" }));
      expect(run).toEqual(original);
    }
  });

  it.each(minionSpells)("damages only the chosen opposing minion with %s", (cardId) => {
    const run = playerSpellRun(cardId);
    const effect = CARD_BY_ID.get(cardId)!.spellEffects![0]!;
    if (effect.kind !== "damage") throw new Error("Expected damage spell.");
    const result = castSpell(run, "spell", "opposing");
    expect(result.battle?.enemyBoard.find((target) => target.instanceId === "opposing")?.health).toBe(10 - effect.amount);
    expect(result.battle?.enemyHero.health).toBe(30);
    expect(result.battle?.playerBoard).toEqual(run.battle!.playerBoard);
  });

  it.each([...minionSpells, "reaper-cleave", "fate-shard"])("rejects unavailable targets for %s before state or random rolls change", (cardId) => {
    const run = playerSpellRun(cardId);
    const original = copyRun(run);
    const invalidTargets = [undefined, "friendly", "dead", "missing", "player-hero", "enemy", ""];
    if (cardId !== "fate-shard") invalidTargets.push("enemy-hero");
    for (const targetId of invalidTargets) {
      expect(() => castSpellWithResolution(run, "spell", targetId)).toThrowError(expect.objectContaining({ code: "INVALID_TARGET" }));
      expect(run).toEqual(original);
    }
  });

  describe.each(["normal", "hard"] as const)("%s enemy spell targeting", (difficulty) => {
    function enemySpellRun(cardId: string, board: MinionState[]): RunState {
      const run = asEnemyTurn(createRun(913, "warrior", difficulty));
      run.completedBattles = 1;
      const battle = activeBattle(run);
      battle.turnNumber = 10;
      battle.enemyBoard = [];
      battle.playerBoard = board;
      battle.playerArmor = 0;
      battle.enemyMana = { current: CARD_BY_ID.get(cardId)!.cost, max: 10, temporary: 0 };
      battle.enemyHand = [];
      battle.enemyDrawPile = [instance("enemy-spell", cardId)];
      if (cardId === "soul-storm") battle.enemyDrawPile.push(instance("extra-draw", "healing-mist"));
      battle.enemyDiscardPile = [];
      return run;
    }

    it.each(heroSpells)("casts %s on the hero through an occupied board", (cardId) => {
      const run = enemySpellRun(cardId, [minion({ instanceId: "blocker", health: 10, maxHealth: 10 })]);
      const original = copyRun(run);
      const effect = CARD_BY_ID.get(cardId)!.spellEffects![0]!;
      if (effect.kind !== "damage") throw new Error("Expected damage spell.");
      const result = resolveEnemyTurnWithPlayback(run);
      const step = result.steps.find(({ action }) => action.type === "cast-spell" && action.instanceId === "enemy-spell")!;
      expect(step.action).toMatchObject({ effects: [{ kind: "damage", targetId: "player-hero" }, ...(cardId === "soul-storm" ? [{ kind: "draw", targetId: null }] : [])] });
      expect(step.presentationRun.battle?.playerHero.health).toBe(30 - effect.amount);
      expect(step.presentationRun.battle?.playerBoard).toEqual(original.battle!.playerBoard);
      expect(step.presentationRun.battle?.enemyMana.current).toBe(10 - CARD_BY_ID.get(cardId)!.cost);
      if (cardId === "soul-storm") expect(step.presentationRun.battle?.enemyHand).toContainEqual(instance("extra-draw", "healing-mist"));
      expect(run).toEqual(original);
    });

    it.each(["soul-lance", "meteor-shard", "reaper-cleave"])("keeps %s unspent without a living opposing minion", (cardId) => {
      for (const board of [[], [minion({ instanceId: "dead", health: 0 })]]) {
        const run = enemySpellRun(cardId, board);
        const result = resolveEnemyTurnWithPlayback(run);
        expect(result.steps).toHaveLength(0);
        expect(result.run.battle?.playerHero.health).toBe(30);
        expect(result.run.battle?.enemyHand).toContainEqual(instance("enemy-spell", cardId));
        expect(result.run.battle?.enemyMana.current).toBe(10);
        expect(result.run.battle?.enemyDiscardPile).toHaveLength(0);
      }
    });

    it.each(["soul-lance", "meteor-shard"])("casts %s only on a living opposing minion", (cardId) => {
      const run = enemySpellRun(cardId, [minion({ instanceId: "target", health: 10, maxHealth: 10 }), minion({ instanceId: "dead", attack: 0, health: 0 })]);
      const result = resolveEnemyTurnWithPlayback(run);
      expect(result.steps[0]?.action).toMatchObject({ effects: [{ kind: "damage", targetId: "target" }] });
      expect(result.run.battle?.playerHero.health).toBe(30);
      expect(result.run.battle?.playerBoard.find((target) => target.instanceId === "target")?.health).toBe(cardId === "soul-lance" ? 7 : 5);
    });

    it("preserves Fate Shard minion priority and records its hero fallback explicitly", () => {
      for (const board of [[], [minion({ instanceId: "target", health: 10, maxHealth: 10 })]]) {
        const run = enemySpellRun("fate-shard", board);
        const result = resolveEnemyTurnWithPlayback(run);
        expect(result).toEqual(resolveEnemyTurnWithPlayback(run));
        const action = result.steps[0]!.action;
        if (action.type !== "cast-spell") throw new Error("Expected a spell action.");
        const effect = action.effects[0]!;
        expect(effect.targetId).toBe(board.length ? "target" : "player-hero");
        expect(effect.amount).toBeGreaterThanOrEqual(0);
        expect(effect.amount).toBeLessThanOrEqual(5);
        expect(result.run.battle?.playerHero.health).toBe(board.length ? 30 : 30 - effect.amount!);
        if (board.length) expect(result.run.battle?.playerBoard[0]?.health).toBe(10 - effect.amount!);
      }
    });
  });
});

describe("card and enemy catalog", () => {
  it("provides unique themed art keys for every phase encounter", () => {
    for (const [phase, enemies] of Object.entries(NORMAL_ENEMIES_BY_PHASE)) {
      expect(enemies).toHaveLength(3);
      expect(new Set(enemies.map((enemy) => enemy.artKey)).size).toBe(3);
      expect(enemies.every((enemy) => enemy.artKey.length > 0)).toBe(true);
      const boss = BOSSES[Number(phase) - 1];
      expect(boss?.kind).toBe("boss");
      expect(boss?.artKey.length).toBeGreaterThan(0);
      expect(enemies.some((enemy) => enemy.artKey === boss?.artKey)).toBe(false);
    }
  });

  it("contains unique base, class, and token cards with complete effect descriptions", () => {
    expect(CARD_CATALOG).toHaveLength(90);
    expect(new Set(CARD_CATALOG.map((card) => card.id)).size).toBe(90);
    expect(CARD_CATALOG.filter((card) => card.kind === "minion")).toHaveLength(57);
    expect(CARD_CATALOG.filter((card) => card.kind === "spell")).toHaveLength(33);
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
      "storm-crow": "도발",
      "ancient-treant": "특수 효과 없음",
      "dread-colossus": "특수 효과 없음",
      "shadow-bolt": "적 영웅에게 2의 피해를 줍니다.",
      "soul-lance": "적 하수인에게 3의 피해를 줍니다.",
      "mana-spring": "마나 1을 얻습니다.",
      "soul-bargain": "손패에서 무작위 카드 1장을 버립니다. / 이번 턴에만 임시 마나 3을 얻습니다.",
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
      if (expectedDescriptions[card.id]) expect(card.description).toBe(expectedDescriptions[card.id]);
      expect(card.description).not.toMatch(/전투 능력을 가진 하수인|필드에 소환해 공격하는 하수인|마나를 소모해 효과를 발휘하는 주문/);
    }
    expect(CARD_BY_ID.get("fate-shard")).toMatchObject({ rewardTier: "normal", description: "선택한 적 하수인 또는 적 영웅에게 0~5의 무작위 피해를 줍니다." });
    expect(CARD_BY_ID.get("reaper-cleave")).toMatchObject({ rewardTier: "normal", description: "선택한 적 하수인에게 4의 피해를 주고 양옆 하수인에게 2의 피해를 줍니다." });
    expect(CARD_BY_ID.get("stolen-fate")).toMatchObject({ rewardTier: "normal", description: "상대 덱에서 무작위 카드 1장을 가져와 손패에 추가합니다." });
  });

  it("has a 30-card, 20-minion/10-spell starter deck with two copies per ID", () => {
    expect(STARTER_DECK_CARD_IDS).toHaveLength(30);
    const counts = new Map<string, number>();
    for (const id of STARTER_DECK_CARD_IDS) counts.set(id, (counts.get(id) ?? 0) + 1);
    expect(counts.get("mana-spring")).toBe(1);
    expect(counts.get("healing-mist")).toBe(1);
    expect([...counts.entries()].every(([id, count]) => count === (id === "mana-spring" || id === "healing-mist" ? 1 : 2))).toBe(true);
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
    for (const phase of [1, 2, 3] as const) {
      expect(NORMAL_ENEMIES_BY_PHASE[phase]).toHaveLength(3);
      for (const enemy of NORMAL_ENEMIES_BY_PHASE[phase]) expect(ENEMY_BY_ID.get(enemy.id)).toEqual(enemy);
    }
  });

  it("defines three unique, class-tagged fusion recipes per class", () => {
    expect(FUSION_RECIPES).toHaveLength(9);
    for (const playerClass of ["warrior", "assassin", "demonist"] as const) {
      const recipes = FUSION_RECIPES.filter((recipe) => recipe.classId === playerClass);
      expect(recipes).toHaveLength(3);
      for (const recipe of recipes) {
        const [firstId, secondId] = recipe.sourceCardIds;
        expect(CARD_BY_ID.get(firstId)?.classId).toBe(playerClass);
        expect(CARD_BY_ID.get(firstId)?.kind).toBe("minion");
        expect(CARD_BY_ID.get(secondId)?.classId).toBe(playerClass);
        expect(CARD_BY_ID.get(secondId)?.kind).toBe("minion");
        expect(CARD_BY_ID.get(recipe.resultCardId)).toMatchObject({ classId: playerClass, kind: "minion", rewardTier: "normal" });
      }
    }
  });
});

describe("seeded run setup and random helpers", () => {
  it("produces the same run from the same seed and plans 3 normals plus a boss per phase", () => {
    const first = createRun(1234);
    const second = createRun(1234);
    expect(first.difficulty).toBe("normal");
    expect(first).toEqual(second);
    expect(first.encounters).toHaveLength(12);
    for (let phase = 1; phase <= 3; phase += 1) {
      const encounters = first.encounters.filter((encounter) => encounter.phase === phase);
      expect(encounters.map((encounter) => encounter.kind)).toEqual(["normal", "normal", "normal", "boss"]);
      expect(encounters[3]?.enemyId).toBe(BOSSES[phase - 1]?.id);
    }
    expect(first.battle?.hand).toHaveLength(4); // 3 opening cards and the turn-1 draw
    expect(first.battle?.playerMana).toEqual({ current: 10, max: 10, temporary: 0 });
    expect(first.battle?.enemyMana).toEqual({ current: 10, max: 10, temporary: 0 });
    expect(first.battle?.enemyStarterDeck).toHaveLength(30);
    expect(first.battle?.enemyHand).toHaveLength(5); // the second side starts with 4 cards and the Coin
    expect(first.battle?.enemyHand.at(-1)?.cardId).toBe("the-coin");
    expect(first.battle?.enemyDrawPile).toHaveLength(26);
    expect(first.battle?.playerHero.health).toBe(30);
    expect(first.battle).not.toHaveProperty("pendingEnemyCharge");
    expect(first.starterDeck).toHaveLength(30);
    expect(first.deck).toHaveLength(30);
  });

  it("persists an explicitly selected run difficulty", () => {
    expect(createRun(1235, "assassin", "hard")).toMatchObject({ playerClass: "assassin", difficulty: "hard" });
  });

  it("creates each class deck as 20 shared cards plus 10 class cards, with no ID over two copies", () => {
    for (const playerClass of ["warrior", "assassin", "demonist"] as const) {
      const run = createRun(4321, playerClass);
      expect(run.playerClass).toBe(playerClass);
      expect(run.deck).toHaveLength(30);
      expect(run.starterDeck).toHaveLength(30);
      const classDefinition = PLAYER_CLASS_DEFINITIONS.find((entry) => entry.id === playerClass)!;
      expect(run.deck.filter(({ cardId }) => classDefinition.starterCardIds.includes(cardId))).toHaveLength(10);
      expect(run.deck.filter(({ cardId }) => SHARED_STARTER_CARD_IDS.includes(cardId))).toHaveLength(20);
      const counts = new Map<string, number>();
      for (const { cardId } of run.deck) counts.set(cardId, (counts.get(cardId) ?? 0) + 1);
      expect([...counts.values()].every((count) => count <= 2)).toBe(true);
      expect(createRun(4321, playerClass)).toEqual(run);
    }
  });

  it("uses only phase-themed normal encounters for each new run", () => {
    const run = createRun(9713, "demonist");
    for (const phase of [1, 2, 3] as const) {
      const phaseEncounters = run.encounters.filter((entry) => entry.phase === phase);
      const allowed = NORMAL_ENEMIES_BY_PHASE[phase].map(({ id }) => id);
      expect(phaseEncounters.slice(0, 3).every(({ kind, enemyId }) => kind === "normal" && allowed.includes(enemyId))).toBe(true);
      expect(phaseEncounters[3]).toMatchObject({ kind: "boss", enemyId: BOSSES[phase - 1]!.id });
    }
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
    expect(deck.some((card) => card.cardId === "mana-spring")).toBe(false);
    let sawSoulBargain = false;
    for (let seed = 1; seed <= 20; seed += 1) {
      const generated = createRun(seed).battle!.enemyStarterDeck;
      expect(generated).toHaveLength(30);
      sawSoulBargain ||= generated.some((card) => card.cardId === "soul-bargain");
      expect(generated.some((card) => card.cardId === "mana-spring")).toBe(false);
      const generatedCounts = new Map<string, number>();
      for (const card of generated) generatedCounts.set(card.cardId, (generatedCounts.get(card.cardId) ?? 0) + 1);
      expect([...generatedCounts.values()].every((count) => count <= 2)).toBe(true);
    }
    expect(sawSoulBargain).toBe(true);
    expect(STARTER_DECK_CARD_IDS).not.toContain("soul-bargain");
    expect(first.battle?.enemyDrawPile).toHaveLength(26);
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
    expect(hydrated.battle?.enemyMana).toEqual({ current: 1, max: 1, temporary: 0 });
    expect(hydrated.battle?.enemyStarterDeck).toHaveLength(30);
    expect(hydrated.battle?.enemyHand).toHaveLength(3);
    expect(hydrated.battle?.enemyDrawPile).toHaveLength(27);
    expect(hydrated.battle).not.toHaveProperty("pendingEnemyCharge");

    const unchanged = hydrateRunForCurrentBattle(modern);
    expect(unchanged).toBe(modern);
    expect(unchanged.battle?.enemyStarterDeck).toEqual(expectedDeck);
  });

  it("hydrates missing temporary mana independently for both sides", () => {
    const legacy = copyRun(createRun(791));
    const battle = activeBattle(legacy) as unknown as { playerMana: Record<string, unknown>; enemyMana: Record<string, unknown> };
    delete battle.playerMana.temporary;
    delete battle.enemyMana.temporary;

    const hydrated = hydrateRunForCurrentBattle(legacy);
    expect(hydrated.battle?.playerMana).toEqual({ current: 10, max: 10, temporary: 0 });
    expect(hydrated.battle?.enemyMana).toEqual({ current: 10, max: 10, temporary: 0 });

    const partiallyLegacy = copyRun(createRun(792));
    const partialBattle = activeBattle(partiallyLegacy) as unknown as { playerMana: Record<string, unknown>; enemyMana: Record<string, unknown> };
    partialBattle.playerMana.temporary = 2;
    delete partialBattle.enemyMana.temporary;
    const partiallyHydrated = hydrateRunForCurrentBattle(partiallyLegacy);
    expect(partiallyHydrated.battle?.playerMana.temporary).toBe(2);
    expect(partiallyHydrated.battle?.enemyMana.temporary).toBe(0);
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

describe("one-time opening hand redraw", () => {
  it("redraws exactly three cards deterministically without changing the deck or card IDs", () => {
    const first = createRun(6041);
    const second = createRun(6041);
    const original = copyRun(first);
    const allBefore = [...activeBattle(first).hand, ...activeBattle(first).drawPile].map(({ instanceId }) => instanceId).sort();
    expect(first.openingHandRedrawAvailable).toBe(true);

    const redrawn = redrawOpeningHand(first);
    expect(redrawn).toEqual(redrawOpeningHand(second));
    expect(activeBattle(redrawn).hand).toHaveLength(4);
    expect(activeBattle(redrawn).drawPile).toHaveLength(26);
    expect([...activeBattle(redrawn).hand, ...activeBattle(redrawn).drawPile].map(({ instanceId }) => instanceId).sort()).toEqual(allBefore);
    expect(activeBattle(redrawn).rngState).not.toBe(activeBattle(first).rngState);
    expect(redrawn.deck).toEqual(first.deck);
    expect(redrawn.openingHandRedrawAvailable).toBe(false);
    expect(first).toEqual(original);
  });

  it("rejects reuse, later encounters, and enemy turns without mutating the run", () => {
    const used = redrawOpeningHand(createRun(6042));
    const usedBefore = copyRun(used);
    expect(() => redrawOpeningHand(used)).toThrowError(expect.objectContaining({ code: "INVALID_ACTION" }));
    expect(used).toEqual(usedBefore);

    const enemyTurn = copyRun(createRun(6043));
    activeBattle(enemyTurn).activeSide = "enemy";
    expect(() => redrawOpeningHand(enemyTurn)).toThrowError(expect.objectContaining({ code: "INVALID_ACTION" }));
    expect(enemyTurn.openingHandRedrawAvailable).toBe(true);

    const laterEncounter = copyRun(createRun(6046));
    laterEncounter.completedBattles = 1;
    laterEncounter.encounterInPhase = 1;
    expect(() => redrawOpeningHand(laterEncounter)).toThrowError(expect.objectContaining({ code: "INVALID_ACTION" }));
  });

  it("consumes availability only after a successful gameplay action", () => {
    const run = copyRun(createRun(6044));
    const cheapMinion = CARD_CATALOG.find((card) => card.kind === "minion" && card.cost > 0 && card.cost <= activeBattle(run).playerMana.current)!;
    activeBattle(run).hand = [instance("redraw-test-minion", cheapMinion.id)];
    activeBattle(run).playerMana.current = 0;
    expect(() => playMinion(run, "redraw-test-minion")).toThrowError(expect.objectContaining({ code: "INSUFFICIENT_MANA" }));
    expect(run.openingHandRedrawAvailable).toBe(true);

    activeBattle(run).playerMana.current = 10;
    expect(playMinion(run, "redraw-test-minion").openingHandRedrawAvailable).toBe(false);
    expect(endPlayerTurnWithPlayback(createRun(6045)).run.openingHandRedrawAvailable).toBe(false);
  });
});

describe("class hero powers and battle resources", () => {
  it("rejects unavailable powers without mutating the original run", () => {
    const warrior = createRun(1201, "warrior");
    const before = copyRun(warrior);
    activeBattle(warrior).playerMana.current = 1;
    const insufficient = copyRun(warrior);
    expect(() => useHeroPower(warrior)).toThrowError(expect.objectContaining({ code: "INSUFFICIENT_MANA" }));
    expect(warrior).toEqual(insufficient);

    const used = useHeroPower(createRun(1202, "warrior"));
    const usedBefore = copyRun(used);
    expect(() => useHeroPower(used)).toThrowError(expect.objectContaining({ code: "INVALID_ACTION" }));
    expect(used).toEqual(usedBefore);

    const wrongTurn = copyRun(createRun(1203, "warrior"));
    activeBattle(wrongTurn).activeSide = "enemy";
    const wrongTurnBefore = copyRun(wrongTurn);
    expect(() => useHeroPower(wrongTurn)).toThrowError(expect.objectContaining({ code: "WRONG_TURN" }));
    expect(wrongTurn).toEqual(wrongTurnBefore);

    const legacy = copyRun(createRun(1204));
    delete legacy.playerClass;
    expect(() => useHeroPower(legacy)).toThrowError(expect.objectContaining({ code: "INVALID_ACTION" }));
    expect(before.playerClass).toBe("warrior");
  });

  it("grants warrior armor and absorbs full and partial hero damage before health", () => {
    let run = useHeroPower(createRun(1210, "warrior"));
    expect(run.battle?.playerArmor).toBe(4);
    expect(run.battle?.playerMana.current).toBe(8);

    for (const [index, attack] of [4, 5].entries()) {
      const battle = activeBattle(run);
      battle.enemyHand = [];
      battle.enemyDrawPile = [];
      battle.enemyStarterDeck = [];
      battle.enemyBoard = [{ instanceId: `armor-test-${index}`, cardId: "ash-wolf", owner: "enemy", attack, health: 5, maxHealth: 5, summonedTurn: 0, hasAttacked: false }];
      if (index === 1) battle.playerArmor = 3;
      run = endPlayerTurn(run);
      if (index === 0) {
        expect(run.battle?.playerArmor).toBe(0);
        expect(run.battle?.playerHero.health).toBe(30);
      } else {
        expect(run.battle?.playerArmor).toBe(0);
        expect(run.battle?.playerHero.health).toBe(28);
      }
    }
  });

  it("lets Assassin hit enemy heroes through a board or kill an enemy minion", () => {
    const heroTarget = copyRun(createRun(1220, "assassin"));
    const heroBattle = activeBattle(heroTarget);
    heroBattle.enemyBoard.push({ instanceId: "blocker", cardId: "ash-wolf", owner: "enemy", attack: 1, health: 3, maxHealth: 3, summonedTurn: 0, hasAttacked: false });
    heroBattle.enemyHero.health = 10;
    const hitHero = useHeroPower(heroTarget, "enemy-hero");
    expect(gameConstants.assassinHeroPowerDamage).toBe(3);
    expect(hitHero.battle?.enemyHero.health).toBe(7);
    expect(hitHero.battle?.enemyBoard).toHaveLength(1);

    const minionTarget = copyRun(createRun(1221, "assassin"));
    activeBattle(minionTarget).enemyBoard.push({ instanceId: "victim", cardId: "ash-wolf", owner: "enemy", attack: 1, health: 3, maxHealth: 3, summonedTurn: 0, hasAttacked: false });
    const killed = useHeroPower(minionTarget, "victim");
    expect(killed.battle?.enemyBoard).toHaveLength(0);
    expect(killed.battle?.enemyDiscardPile.some(({ instanceId }) => instanceId === "victim")).toBe(true);

    const invalid = createRun(1222, "assassin");
    const invalidBefore = copyRun(invalid);
    expect(() => useHeroPower(invalid, "missing-target")).toThrowError(expect.objectContaining({ code: "INVALID_TARGET" }));
    expect(invalid).toEqual(invalidBefore);
  });

  it.each([[2, 2], [3, 3], [6, 6], [7, 6]])("caps Demonist shards at 6 when %i enemy minions die", (deaths, expectedShards) => {
    const run = createRun(1230 + deaths, "demonist");
    activeBattle(run).playerBoard.push(minion({ cardId: "demonist-imp-caller" }));
    activeBattle(run).enemyBoard = Array.from({ length: deaths }, (_, index) => ({
      instanceId: `dead-${index}`, cardId: "ash-wolf", owner: "enemy" as const, attack: 1, health: 0, maxHealth: 1, summonedTurn: 0, hasAttacked: false,
    })).concat({ instanceId: "cleanup-target", cardId: "ash-wolf", owner: "enemy", attack: 1, health: 4, maxHealth: 4, summonedTurn: 0, hasAttacked: false });
    activeBattle(run).hand = [instance("cleanup-spell", "soul-lance")];
    const cleaned = castSpell(run, "cleanup-spell", "cleanup-target");
    expect(cleaned.battle?.soulShards).toBe(expectedShards);
    expect(cleaned.battle?.enemyBoard).toHaveLength(1);
  });

  it("spends the hero power shard cost for a deterministic demon, preserves state on failure, and resets resources between battles", () => {
    const base = createRun(1240, "demonist");
    activeBattle(base).soulShards = 4;
    const first = useHeroPower(base);
    const secondRun = createRun(1240, "demonist");
    activeBattle(secondRun).soulShards = 4;
    const second = useHeroPower(secondRun);
    expect(first.battle?.playerBoard[0]?.cardId).toBe(second.battle?.playerBoard[0]?.cardId);
    expect(first.battle?.playerBoard[0]?.cardId).toMatch(/^demon-/);
    expect(first.battle?.soulShards).toBe(4 - gameConstants.soulShardHeroPowerCost);
    expect(first.battle?.playerMana.current).toBe(8);

    const tooFew = copyRun(base);
    activeBattle(tooFew).soulShards = gameConstants.soulShardHeroPowerCost - 1;
    const tooFewBefore = copyRun(tooFew);
    expect(() => useHeroPower(tooFew)).toThrowError(expect.objectContaining({ code: "INVALID_ACTION" }));
    expect(tooFew).toEqual(tooFewBefore);

    const nearlyFullBoard = copyRun(base);
    activeBattle(nearlyFullBoard).playerBoard = Array.from({ length: gameConstants.maxBoard - 1 }, (_, index) => minion({ instanceId: `nearly-full-${index}` }));
    expect(useHeroPower(nearlyFullBoard).battle?.playerBoard).toHaveLength(gameConstants.maxBoard);

    const fullBoard = copyRun(base);
    activeBattle(fullBoard).playerBoard = Array.from({ length: gameConstants.maxBoard }, (_, index) => minion({ instanceId: `full-${index}` }));
    const fullBefore = copyRun(fullBoard);
    expect(() => useHeroPower(fullBoard)).toThrowError(expect.objectContaining({ code: "MAX_BOARD" }));
    expect(fullBoard).toEqual(fullBefore);

    const transitioned = skipReward(winCurrentBattle(useHeroPower(createRun(1241, "warrior"))));
    const nextBattle = advanceRun(transitioned, 1242);
    expect(nextBattle.battle?.playerArmor).toBe(0);
    expect(nextBattle.battle?.soulShards).toBe(0);
    expect(nextBattle.battle?.heroPowerUsed).toBe(false);
    expect(nextBattle.battle?.heroPowerCooldown).toBe(0);
  });

  it("rests the Assassin hero power for only the player's next turn", () => {
    const fresh = createRun(1252, "assassin");
    const withMana = (run: RunState): RunState => {
      const next = copyRun(run);
      activeBattle(next).playerMana = { current: 10, max: 10, temporary: 0 };
      return next;
    };
    const nextPlayerTurn = (run: RunState): RunState => {
      const next = endPlayerTurn(run);
      expect(next.battle?.activeSide).toBe("player");
      return next;
    };

    const used = useHeroPower(withMana(fresh), "enemy-hero");
    expect(used.battle?.heroPowerCooldown).toBe(1);

    const secondTurn = withMana(nextPlayerTurn(used));
    expect(secondTurn.battle?.heroPowerCooldown).toBe(1);
    expect(() => useHeroPower(secondTurn, "enemy-hero")).toThrowError(expect.objectContaining({ code: "INVALID_ACTION", message: expect.stringContaining("1 more turn") }));

    const thirdTurn = withMana(nextPlayerTurn(secondTurn));
    expect(thirdTurn.battle?.heroPowerCooldown).toBe(0);
    const reused = useHeroPower(thirdTurn, "enemy-hero");
    expect(reused.battle?.enemyHero.health).toBe(thirdTurn.battle!.enemyHero.health - gameConstants.assassinHeroPowerDamage);
    expect(reused.battle?.heroPowerCooldown).toBe(1);
  });

  it("rests the hero power for the player's next two turns after a use", () => {
    expect(gameConstants.heroPowerCooldownTurns).toEqual({ warrior: 2, assassin: 1, demonist: 2 });
    const fresh = createRun(1251, "warrior");
    expect(fresh.battle?.heroPowerCooldown).toBe(0);
    const withMana = (run: RunState): RunState => {
      const next = copyRun(run);
      activeBattle(next).playerMana = { current: 10, max: 10, temporary: 0 };
      return next;
    };
    const nextPlayerTurn = (run: RunState): RunState => {
      const next = endPlayerTurn(run);
      expect(next.battle?.activeSide).toBe("player");
      return next;
    };

    const used = useHeroPower(withMana(fresh));
    expect(used.battle?.heroPowerCooldown).toBe(2);
    expect(used.battle?.heroPowerUsed).toBe(true);

    const secondTurn = withMana(nextPlayerTurn(used));
    expect(secondTurn.battle?.heroPowerCooldown).toBe(2);
    expect(() => useHeroPower(secondTurn)).toThrowError(expect.objectContaining({ code: "INVALID_ACTION", message: expect.stringContaining("2 more turn") }));

    const thirdTurn = withMana(nextPlayerTurn(secondTurn));
    expect(thirdTurn.battle?.heroPowerCooldown).toBe(1);
    expect(() => useHeroPower(thirdTurn)).toThrowError(expect.objectContaining({ code: "INVALID_ACTION" }));

    const fourthTurn = withMana(nextPlayerTurn(thirdTurn));
    expect(fourthTurn.battle?.heroPowerCooldown).toBe(0);
    const reused = useHeroPower(fourthTurn);
    expect(reused.battle?.playerArmor).toBeGreaterThan(fourthTurn.battle!.playerArmor);
    expect(reused.battle?.heroPowerCooldown).toBe(2);
  });

  it("hydrates class resources for an older active schema-v1 battle", () => {
    const oldRun = copyRun(createRun(1249));
    const oldBattle = activeBattle(oldRun) as unknown as Record<string, unknown>;
    delete oldBattle.playerArmor;
    delete oldBattle.soulShards;
    delete oldBattle.heroPowerUsed;
    delete oldBattle.heroPowerCooldown;
    const hydrated = hydrateRunForCurrentBattle(oldRun);
    expect(hydrated.battle).toMatchObject({ playerArmor: 0, soulShards: 0, heroPowerUsed: false, heroPowerCooldown: 0 });
    expect(oldBattle).not.toEqual(hydrated.battle);
  });
});

describe("random, cleave, and deck-theft spells", () => {
  it("rolls deterministic random damage from zero through five and accepts hero targeting through a board", () => {
    const dealt = new Set<number>();
    let zeroRun: RunState | undefined;
    for (let seed = 1; seed <= 120; seed += 1) {
      const run = createRun(seed, "warrior");
      const battle = activeBattle(run);
      battle.enemyHero.health = 30;
      battle.enemyBoard.push({ instanceId: `random-target-${seed}`, cardId: "ash-wolf", owner: "enemy", attack: 1, health: 2, maxHealth: 2, summonedTurn: 0, hasAttacked: false });
      battle.hand = [instance("random-spell", "fate-shard")];
      battle.rngState = seed;
      const resolution = castSpellWithResolution(run, "random-spell", "enemy-hero");
      const cast = castSpell(run, "random-spell", "enemy-hero");
      const amount = 30 - cast.battle!.enemyHero.health;
      expect(resolution.effects).toEqual([{ effectIndex: 0, kind: "randomDamage", targetId: "enemy-hero", amount }]);
      expect(resolution.run).toEqual(cast);
      dealt.add(amount);
      expect(cast.battle?.enemyBoard).toHaveLength(1);
      expect(cast.battle?.playerMana.current).toBe(8);
      expect(cast.battle?.discardPile.some(({ instanceId }) => instanceId === "random-spell")).toBe(true);
      if (amount === 0) zeroRun = cast;
    }
    expect([...dealt].sort()).toEqual([0, 1, 2, 3, 4, 5]);
    expect(zeroRun?.battle?.playerMana.current).toBe(8);
    expect(zeroRun?.battle?.discardPile.some(({ instanceId }) => instanceId === "random-spell")).toBe(true);

    const repeatA = createRun(1251, "warrior");
    const repeatB = createRun(1251, "warrior");
    for (const repeat of [repeatA, repeatB]) {
      activeBattle(repeat).hand = [instance("random-spell", "fate-shard")];
      activeBattle(repeat).rngState = 250;
    }
    expect(castSpell(repeatA, "random-spell", "enemy-hero")).toEqual(castSpell(repeatB, "random-spell", "enemy-hero"));
  });

  it("cleaves edge and center targets, removing simultaneous deaths before resolving death effects", () => {
    const edge = createRun(1260, "warrior");
    const edgeBattle = activeBattle(edge);
    edgeBattle.hand = [instance("cleave-edge", "reaper-cleave")];
    edgeBattle.enemyBoard = [
      { instanceId: "edge-center", cardId: "ash-wolf", owner: "enemy", attack: 1, health: 4, maxHealth: 4, summonedTurn: 0, hasAttacked: false },
      { instanceId: "edge-right", cardId: "ash-wolf", owner: "enemy", attack: 1, health: 2, maxHealth: 2, summonedTurn: 0, hasAttacked: false },
      { instanceId: "edge-far", cardId: "ash-wolf", owner: "enemy", attack: 1, health: 4, maxHealth: 4, summonedTurn: 0, hasAttacked: false },
    ];
    const edgeResult = castSpell(edge, "cleave-edge", "edge-center");
    expect(edgeResult.battle?.enemyBoard.map(({ instanceId }) => instanceId)).toEqual(["edge-far"]);

    const center = createRun(1261, "warrior");
    const centerBattle = activeBattle(center);
    centerBattle.hand = [instance("cleave-center", "reaper-cleave")];
    centerBattle.enemyBoard = [
      { instanceId: "left-death", cardId: "thorn-brute", owner: "enemy", attack: 1, health: 2, maxHealth: 2, summonedTurn: 0, hasAttacked: false },
      { instanceId: "center-death", cardId: "plague-bearer", owner: "enemy", attack: 1, health: 4, maxHealth: 4, summonedTurn: 0, hasAttacked: false },
      { instanceId: "right-death", cardId: "frost-wraith", owner: "enemy", attack: 1, health: 2, maxHealth: 2, summonedTurn: 0, hasAttacked: false },
    ];
    const centerResult = castSpell(center, "cleave-center", "center-death");
    expect(centerResult.battle?.enemyBoard.map(({ cardId }) => cardId).sort()).toEqual(["bone-rat", "bone-rat", "bone-rat", "cinder-imp"].sort());
    expect(centerResult.battle?.enemyDiscardPile.map(({ instanceId }) => instanceId)).toEqual(["left-death", "center-death", "right-death"]);
  });

  it("moves one exact card from the opposing draw pile and safely handles empty piles and full hands", () => {
    const run = createRun(1270, "warrior");
    const battle = activeBattle(run);
    const stolen = [instance("opp-draw-1", "eclipse"), instance("opp-draw-2", "shadow-bolt"), instance("opp-draw-3", "mana-spring")];
    battle.enemyDrawPile = structuredClone(stolen);
    battle.rngState = 9876;
    battle.hand = [instance("theft-spell", "stolen-fate")];
    const result = castSpell(run, "theft-spell");
    const received = result.battle!.hand.find(({ instanceId }) => stolen.some((card) => card.instanceId === instanceId));
    expect(received).toBeDefined();
    expect(result.battle?.enemyDrawPile).toHaveLength(2);
    expect(result.battle?.enemyDrawPile).not.toContainEqual(received);
    expect(result.battle?.playerMana.current).toBe(7);

    const empty = createRun(1271, "warrior");
    activeBattle(empty).hand = [instance("empty-theft", "stolen-fate")];
    activeBattle(empty).enemyDrawPile = [];
    const emptyResult = castSpell(empty, "empty-theft");
    expect(emptyResult.battle?.hand).toHaveLength(0);
    expect(emptyResult.battle?.discardPile).toContainEqual(instance("empty-theft", "stolen-fate"));

    const full = createRun(1272, "warrior");
    activeBattle(full).hand = [instance("full-theft", "stolen-fate"), ...Array.from({ length: 9 }, (_, index) => instance(`full-${index}`, "ash-wolf"))];
    activeBattle(full).enemyDrawPile = structuredClone(stolen);
    const fullBefore = copyRun(full);
    expect(() => castSpell(full, "full-theft")).toThrowError(expect.objectContaining({ code: "MAX_HAND" }));
    expect(full).toEqual(fullBefore);
  });

  it("lets enemy theft move from the player draw pile and records the transferred identity", () => {
    const run = copyRun(createRun(1280, "warrior"));
    const battle = activeBattle(run);
    battle.activeSide = "enemy";
    battle.turnNumber = 10;
    battle.enemyHand = [instance("enemy-theft", "stolen-fate")];
    battle.enemyDrawPile = [];
    battle.enemyStarterDeck = [];
    battle.enemyFatigue = -1; // the empty turn draw deals 0, so the enemy hero stays at full health
    // Healing Mist is never cast at full health, so the stolen card stays in the hand to be found.
    battle.drawPile = [instance("player-draw-identity", "healing-mist")];
    const resolution = resolveEnemyTurnWithPlayback(run);
    expect(resolution.run.battle?.enemyHand).toContainEqual(instance("player-draw-identity", "healing-mist"));
    expect(resolution.run.battle?.drawPile.some(({ instanceId }) => instanceId === "player-draw-identity")).toBe(false);
    const record = resolution.steps.find(({ action }) => action.type === "cast-spell")?.action;
    expect(record).toMatchObject({ type: "cast-spell", effects: [{ kind: "stealFromOpponentDeck", transferredCardInstanceId: "player-draw-identity" }] });
  });
});

describe("class minion fusion", () => {
  it("fuses either source order into the recipe result and consumes one mana", () => {
    for (const recipe of FUSION_RECIPES) {
      const run = createRun(1300 + FUSION_RECIPES.indexOf(recipe), recipe.classId);
      activeBattle(run).playerMana.current = 1;
      activeBattle(run).playerBoard = recipe.sourceCardIds.map((cardId, index) => ({
        instanceId: `material-${index}`, cardId, owner: "player", attack: CARD_BY_ID.get(cardId)!.minion!.attack,
        health: CARD_BY_ID.get(cardId)!.minion!.maxHealth, maxHealth: CARD_BY_ID.get(cardId)!.minion!.maxHealth,
        summonedTurn: 0, hasAttacked: false,
      }));
      const first = fuseMinions(run, "material-0", "material-1");
      const reversed = fuseMinions(run, "material-1", "material-0");
      expect(first.battle?.playerBoard[0]?.cardId).toBe(recipe.resultCardId);
      expect(reversed.battle?.playerBoard[0]?.cardId).toBe(recipe.resultCardId);
      expect(first.battle?.playerMana.current).toBe(0);
      expect(first.battle?.playerBoard[0]?.hasAttacked).toBe(true);
      expect(first.battle?.discardPile.map(({ instanceId }) => instanceId)).toEqual(["material-0", "material-1"]);
      expect(first.battle?.playerBoard[0]?.instanceId).toBe(reversed.battle?.playerBoard[0]?.instanceId);
    }
  });

  it("places the result at the lower source slot, allocates a new ID, and resolves its battlecry", () => {
    const recipe = FUSION_RECIPES.find(({ id }) => id === "demonist-greater-caller")!;
    const run = createRun(1310, "demonist");
    const battle = activeBattle(run);
    const unrelated = ["unrelated-left", "unrelated-middle", "unrelated-right"].map((instanceId) => minion({ instanceId }));
    battle.playerBoard = [
      unrelated[0]!,
      { ...minion({ instanceId: "material-later", cardId: recipe.sourceCardIds[1] }), hasAttacked: false },
      unrelated[1]!,
      { ...minion({ instanceId: "material-earlier", cardId: recipe.sourceCardIds[0] }), hasAttacked: false },
      unrelated[2]!,
    ];
    battle.playerMana.current = 1;
    const fused = fuseMinions(run, "material-earlier", "material-later");
    expect(fused.battle?.playerBoard.map(({ cardId }) => cardId)).toEqual([
      "ash-wolf", recipe.resultCardId, "ash-wolf", "ash-wolf", "demon-ashling",
    ]);
    expect(fused.battle?.playerBoard[1]?.instanceId).toMatch(/^fusion-/);
    expect(fused.battle?.playerBoard[1]?.hasAttacked).toBe(true);
    expect(fused.battle?.playerBoard[4]?.summonedTurn).toBe(fused.battle?.turnNumber);
  });

  it("allows fusion on a full board because two materials are replaced by one", () => {
    const recipe = FUSION_RECIPES.find(({ id }) => id === "demonist-hellguard")!;
    const run = createRun(1311, "demonist");
    const battle = activeBattle(run);
    battle.playerMana.current = 1;
    battle.playerBoard = [
      minion({ instanceId: "full-a" }),
      { ...minion({ instanceId: "full-first", cardId: recipe.sourceCardIds[0] }), hasAttacked: false },
      minion({ instanceId: "full-b" }),
      minion({ instanceId: "full-c" }),
      { ...minion({ instanceId: "full-second", cardId: recipe.sourceCardIds[1] }), hasAttacked: false },
      minion({ instanceId: "full-d" }),
    ];
    const fused = fuseMinions(run, "full-first", "full-second");
    expect(fused.battle?.playerBoard).toHaveLength(gameConstants.maxBoard - 1);
    expect(fused.battle?.playerBoard[1]?.cardId).toBe(recipe.resultCardId);
  });

  it("rejects invalid pairs, identical instances, enemy minions, wrong turns, and insufficient mana without mutation", () => {
    const invalidPair = createRun(1320, "warrior");
    activeBattle(invalidPair).playerBoard = [
      { ...minion({ instanceId: "bad-a", cardId: "warrior-vanguard" }), hasAttacked: false },
      { ...minion({ instanceId: "bad-b", cardId: "warrior-oath-knight" }), hasAttacked: false },
    ];
    const invalidPairBefore = copyRun(invalidPair);
    expect(() => fuseMinions(invalidPair, "bad-a", "bad-b")).toThrowError(expect.objectContaining({ code: "INVALID_ACTION" }));
    expect(invalidPair).toEqual(invalidPairBefore);
    expect(() => fuseMinions(invalidPair, "bad-a", "bad-a")).toThrowError(expect.objectContaining({ code: "INVALID_TARGET" }));
    expect(invalidPair).toEqual(invalidPairBefore);

    const valid = createRun(1321, "warrior");
    activeBattle(valid).playerBoard = [
      { ...minion({ instanceId: "valid-a", cardId: "warrior-vanguard" }), hasAttacked: false },
      { ...minion({ instanceId: "valid-b", cardId: "warrior-stonewall" }), hasAttacked: false },
    ];
    activeBattle(valid).playerMana.current = 0;
    const poorBefore = copyRun(valid);
    expect(() => fuseMinions(valid, "valid-a", "valid-b")).toThrowError(expect.objectContaining({ code: "INSUFFICIENT_MANA" }));
    expect(valid).toEqual(poorBefore);

    activeBattle(valid).playerMana.current = 1;
    activeBattle(valid).enemyBoard.push({ ...minion({ instanceId: "enemy-material", owner: "enemy", cardId: "warrior-vanguard" }), hasAttacked: false });
    activeBattle(valid).activeSide = "enemy";
    const wrongTurnBefore = copyRun(valid);
    expect(() => fuseMinions(valid, "valid-a", "valid-b")).toThrowError(expect.objectContaining({ code: "WRONG_TURN" }));
    expect(valid).toEqual(wrongTurnBefore);
    activeBattle(valid).activeSide = "player";
    const enemyBefore = copyRun(valid);
    expect(() => fuseMinions(valid, "enemy-material", "valid-a")).toThrowError(expect.objectContaining({ code: "INVALID_TARGET" }));
    expect(valid).toEqual(enemyBefore);
  });
});

describe("player actions and battle rules", () => {
  it("plays a minion into the chosen board slot and rejects invalid slot indexes", () => {
    const run = copyRun(createRun(6));
    const battle = activeBattle(run);
    battle.playerBoard = [minion({ instanceId: "left" }), minion({ instanceId: "right" })];
    battle.hand = [instance("slot-card", "iron-hound")];
    battle.playerMana.current = 5;
    const played = playMinion(run, "slot-card", 1);
    expect(played.battle?.playerBoard.map(({ instanceId }) => instanceId)).toEqual(["left", "slot-card", "right"]);
    expect(() => playMinion(run, "slot-card", 4)).toThrowError(expect.objectContaining({ code: "INVALID_TARGET" }));
  });

  it("attacks the hero with ready minions one by one until the hero is dead", () => {
    const run = copyRun(createRun(61));
    const battle = activeBattle(run);
    battle.turnNumber = 2;
    battle.enemyBoard = [];
    battle.enemyHero.health = 4;
    battle.playerBoard = [
      minion({ instanceId: "first", attack: 2 }),
      minion({ instanceId: "second", attack: 3 }),
      minion({ instanceId: "third", attack: 8 }),
    ];
    const afterFirst = attackWithMinion(run, "first", battle.enemyHero.id);
    expect(afterFirst.battle?.enemyHero.health).toBe(2);
    const afterSecond = attackWithMinion(afterFirst, "second", battle.enemyHero.id);
    expect(afterSecond.battle?.enemyHero.health).toBe(0);
    expect(afterSecond.battle?.playerBoard.map(({ hasAttacked }: { hasAttacked: boolean }) => hasAttacked)).toEqual([true, true, false]);
    expect(run.battle?.enemyHero.health).toBe(4);
  });

  it("uses mana to play minions, keeps the input state unchanged, and prevents same-turn attacks", () => {
    const run = createRun(7);
    const next = copyRun(run);
    const battle = activeBattle(next);
    const handCard = instance("test-iron-hound", "iron-hound");
    battle.hand = [handCard];

    const played = playMinion(next, handCard.instanceId);
    expect(played.battle?.playerMana.current).toBe(7);
    expect(played.battle?.hand).toHaveLength(0);
    expect(played.battle?.playerBoard[0]).toMatchObject({ attack: 3, health: 4, hasAttacked: false });
    expect(next.battle?.playerMana).toEqual({ current: 10, max: 10, temporary: 0 });
    expect(() => attackWithMinion(played, handCard.instanceId, played.battle!.enemyHero.id)).toThrow(GameRuleError);
  });

  it("rejects invalid plays and enforces six-minion capacity", () => {
    const run = copyRun(createRun(8));
    const battle = activeBattle(run);
    battle.playerMana.current = 0;
    battle.hand = [instance("expensive", "shade-stalker")];
    expect(() => playMinion(run, "expensive")).toThrowError(expect.objectContaining({ code: "INSUFFICIENT_MANA" }));
    expect(run.battle?.hand[0]?.instanceId).toBe("expensive");

    battle.playerMana.current = 10;
    battle.hand = [instance("spell", "shadow-bolt")];
    expect(() => playMinion(run, "spell")).toThrowError(expect.objectContaining({ code: "INVALID_ACTION" }));

    battle.playerBoard = Array.from({ length: gameConstants.maxBoard - 1 }, (_, index) => minion({ instanceId: `nearly-full-${index}` }));
    battle.hand = [instance("sixth", "ash-wolf")];
    const sixth = playMinion(run, "sixth");
    expect(sixth.battle?.playerBoard).toHaveLength(gameConstants.maxBoard);
    const seventh = copyRun(sixth);
    activeBattle(seventh).hand = [instance("seventh", "ash-wolf")];
    const seventhBefore = copyRun(seventh);
    expect(() => playMinion(seventh, "seventh")).toThrowError(expect.objectContaining({ code: "MAX_BOARD" }));
    expect(seventh).toEqual(seventhBefore);
  });

  it("follows the Hearthstone mana curve: 1 mana on turn 1, +1 per turn up to 10, refilled fully every turn", () => {
    let run = createRunWithRealMana(22);
    expect(run.battle?.playerMana).toEqual({ current: 1, max: 1, temporary: 0 });
    expect(run.battle?.enemyMana).toEqual({ current: 1, max: 1, temporary: 0 });
    for (let turn = 2; turn <= 13; turn += 1) {
      activeBattle(run).playerHero.health = 30;
      activeBattle(run).hand = [];
      activeBattle(run).playerMana.current = 0; // whatever was left is discarded by the refill
      run = endPlayerTurn(run);
      const cap = Math.min(10, turn);
      expect(run.battle?.turnNumber).toBe(turn);
      expect(run.battle?.playerMana).toEqual({ current: cap, max: cap, temporary: 0 });
      expect(run.battle?.hand).toHaveLength(1); // one draw per turn
    }
  });

  it("drops carried-over and temporary mana when the next turn starts", () => {
    const legacy = copyRun(createRun(223));
    activeBattle(legacy).turnNumber = 4;
    activeBattle(legacy).playerMana = { current: 5, max: 6, temporary: 2 };
    activeBattle(legacy).playerHero.health = 30;
    activeBattle(legacy).hand = [];
    expect(endPlayerTurn(legacy).battle?.playerMana).toEqual({ current: 5, max: 5, temporary: 0 });
  });

  it("draws one card per turn and burns it into the discard pile when the hand is full", () => {
    const run = copyRun(createRun(224));
    const battle = activeBattle(run);
    battle.playerHero.health = 30;
    battle.hand = Array.from({ length: 10 }, (_, index) => instance(`kept-${index}`, "ash-wolf"));
    battle.drawPile = ["a", "b", "c"].map((id) => instance(`draw-${id}`, "bone-rat"));
    battle.discardPile = [];
    const next = endPlayerTurn(run);
    expect(next.battle?.hand).toHaveLength(10);
    expect(next.battle?.discardPile.map(({ instanceId }) => instanceId)).toEqual(["draw-a"]);
    expect(next.battle?.drawPile.map(({ instanceId }) => instanceId)).toEqual(["draw-b", "draw-c"]);
    expect(next.battle?.pendingDiscardBeforeDraw).toBeFalsy();

    const open = copyRun(createRun(225));
    activeBattle(open).playerHero.health = 30;
    activeBattle(open).hand = [instance("only", "ash-wolf")];
    activeBattle(open).drawPile = ["a", "b"].map((id) => instance(`draw-${id}`, "bone-rat"));
    const drawn = endPlayerTurn(open);
    expect(drawn.battle?.hand.map(({ instanceId }) => instanceId)).toEqual(["only", "draw-a"]);
  });

  it("refills the enemy's mana too, whatever it spent or kept", () => {
    const run = copyRun(createRun(307));
    const battle = activeBattle(run);
    // Turn 9: the enemy has 9 mana (even though it was left at 0) and pays 8 for the Eclipse; the player's next turn 10 gives 10.
    battle.turnNumber = 9;
    battle.playerHero.health = 30;
    battle.hand = [];
    battle.enemyMana.current = 0;
    battle.enemyHand = [instance("enemy-eclipse", "eclipse")];
    battle.enemyDrawPile = [];
    battle.enemyStarterDeck = [];

    const next = endPlayerTurn(run);
    expect(next.battle?.playerMana).toEqual({ current: 10, max: 10, temporary: 0 });
    expect(next.battle?.enemyMana.current).toBe(9 - CARD_BY_ID.get("eclipse")!.cost);
  });

  it("enforces minion target priority and applies damage from both minions", () => {
    const run = copyRun(createRun(2));
    const battle = activeBattle(run);
    battle.playerBoard = [minion({ instanceId: "attacker", attack: 3, health: 5, maxHealth: 5, summonedTurn: 0 })];
    battle.enemyBoard = [minion({ instanceId: "defender", owner: "enemy", health: 3, maxHealth: 3, attack: 1 })];
    // Without taunt the hero can be attacked past the minion.
    expect(attackWithMinion(run, "attacker", battle.enemyHero.id).battle?.enemyHero.health).toBe(battle.enemyHero.health - 3);
    expect(() => attackWithMinion(run, "attacker", "missing")).toThrowError(expect.objectContaining({ code: "INVALID_TARGET" }));
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
    battle.enemyDrawPile = [instance("enemy-expensive", "healing-mist")];
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

  it("gains one temporary mana from mana spring without exceeding ten", () => {
    for (const currentMana of [5, 9, 10]) {
      const run = copyRun(createRun(500 + currentMana));
      const battle = activeBattle(run);
      const card = instance(`mana-spring-${currentMana}`, "mana-spring");
      battle.playerMana.current = currentMana;
      battle.hand = [card];

      const cast = castSpell(run, card.instanceId);
      // Like the Coin: +1 mana for this turn (temporary), never above 10 in total.
      expect(cast.battle?.playerMana).toEqual({ current: Math.min(10, currentMana + 1), max: 10, temporary: currentMana < 10 ? 1 : 0 });
      expect(cast.battle?.discardPile).toContainEqual(card);
      expect(cast.battle?.hand).toHaveLength(0);
    }
  });

  it("casts Soul Bargain, discards one deterministic remaining card, and can exceed ten mana", () => {
    const run = copyRun(createRun(501));
    const battle = activeBattle(run);
    const bargain = instance("bargain", "soul-bargain");
    const candidates = [instance("candidate-a", "ash-wolf"), instance("candidate-b", "crypt-guard")];
    battle.playerMana.current = 10;
    battle.hand = [bargain, ...candidates];
    battle.rngState = 991;
    const expectedPick = pickIndex(candidates.length, battle.rngState);

    const cast = castSpell(run, bargain.instanceId);
    const discardedCandidate = candidates[expectedPick.value]!;
    const remainingCandidate = candidates[1 - expectedPick.value]!;
    expect(cast.battle?.hand).toEqual([remainingCandidate]);
    expect(cast.battle?.discardPile).toEqual([bargain, discardedCandidate]);
    expect(cast.battle?.rngState).toBe(expectedPick.state);
    expect(cast.battle?.playerMana).toEqual({ current: 12, max: 10, temporary: 3 });
  });

  it("still grants temporary mana without advancing RNG when Soul Bargain has no discard target", () => {
    const run = copyRun(createRun(502));
    const battle = activeBattle(run);
    const bargain = instance("bargain-empty", "soul-bargain");
    battle.playerMana.current = 10;
    battle.hand = [bargain];
    const rngState = battle.rngState;

    const cast = castSpell(run, bargain.instanceId);
    expect(cast.battle?.hand).toEqual([]);
    expect(cast.battle?.discardPile).toEqual([bargain]);
    expect(cast.battle?.rngState).toBe(rngState);
    expect(cast.battle?.playerMana).toEqual({ current: 12, max: 10, temporary: 3 });
  });

  it("spends temporary mana before regular mana and preserves regular mana gain around it", () => {
    const run = copyRun(createRun(503));
    const battle = activeBattle(run);
    battle.playerMana = { current: 7, max: 10, temporary: 3 };
    battle.hand = [instance("bolt", "shadow-bolt")];
    const paid = castSpell(run, "bolt");
    expect(paid.battle?.playerMana).toEqual({ current: 6, max: 10, temporary: 2 });

    const springRun = copyRun(createRun(504));
    const springBattle = activeBattle(springRun);
    springBattle.playerMana = { current: 9, max: 10, temporary: 2 };
    springBattle.hand = [instance("spring", "mana-spring")];
    expect(castSpell(springRun, "spring").battle?.playerMana).toEqual({ current: 10, max: 10, temporary: 3 });
  });

  it("expires unused player temporary mana at turn end and starts the next turn with full mana", () => {
    const run = copyRun(createRun(505));
    const battle = activeBattle(run);
    battle.playerMana = { current: 8, max: 10, temporary: 3 };
    battle.hand = [];

    const nextTurn = endPlayerTurn(run);
    expect(nextTurn.battle?.turnNumber).toBe(2);
    expect(nextTurn.battle?.playerMana).toEqual({ current: 2, max: 2, temporary: 0 });
  });

  it("uses enemy-owned discard and temporary mana, then expires its remainder", () => {
    const run = asEnemyTurn(createRun(506));
    const battle = activeBattle(run);
    const bargain = instance("enemy-bargain", "soul-bargain");
    const candidate = instance("enemy-discard-candidate", "eclipse");
    battle.enemyMana = { current: 6, max: 10, temporary: 0 };
    battle.enemyHand = [bargain, candidate];
    battle.enemyStarterDeck = Array.from({ length: 30 }, (_, index) => instance(`enemy-high-${index}`, "eclipse"));
    battle.enemyDrawPile = [];

    const resolution = resolveEnemyTurnWithPlayback(run);
    expect(resolution.run.battle?.enemyDiscardPile.some(({ cardId }) => cardId === "eclipse")).toBe(true);
    expect(resolution.run.battle?.discardPile.some(({ cardId }) => cardId === "eclipse")).toBe(false);
    // With 10 mana every turn the extra temporary mana is rarely needed, but whatever is left never carries over.
    expect(resolution.run.battle?.enemyMana.temporary).toBe(0);
  });

  it("offers neutral Soul Bargain to all classes without adding it to starting decks", () => {
    expect(CARD_BY_ID.get("soul-bargain")).toMatchObject({ kind: "spell", cost: 1, rewardTier: "normal" });
    expect(CARD_BY_ID.get("soul-bargain")).not.toHaveProperty("classId");
    expect(CARD_BY_ID.get("soul-bargain")).not.toHaveProperty("playerOnly");
    for (const playerClass of ["warrior", "assassin", "demonist"] as const) {
      const offered = Array.from({ length: 80 }, (_, index) => index + 1)
        .some((seed) => winCurrentBattle(createRun(seed, playerClass)).pendingReward?.choices.includes("soul-bargain"));
      expect(offered).toBe(true);
    }
  });

  it("holds Soul Bargain when no beneficial follow-up exists after the random discard", () => {
    const run = asEnemyTurn(createRun(507));
    const battle = activeBattle(run);
    // With a full 10 mana the other cards are only "unaffordable" when they have no legal target: damage spells against an empty player board.
    battle.enemyHand = [
      instance("enemy-bargain", "soul-bargain"),
      instance("enemy-no-target-a", "soul-lance"),
      instance("enemy-no-target-b", "meteor-shard"),
    ];
    battle.playerBoard = [];
    battle.enemyStarterDeck = Array.from({ length: 30 }, (_, index) => instance(`enemy-high-${index}`, "eclipse"));
    battle.enemyDrawPile = [];

    const resolution = resolveEnemyTurnWithPlayback(run);
    expect(resolution.steps.some((step) => step.action.type === "cast-spell" && step.action.cardId === "soul-bargain")).toBe(false);
  });

  it("casts Soul Bargain before its enabled follow-up and records both actions in order", () => {
    const run = asEnemyTurn(createRun(508));
    const battle = activeBattle(run);
    battle.enemyHand = [
      instance("enemy-bargain", "soul-bargain"),
      instance("enemy-meteor-a", "meteor-shard"),
      instance("enemy-meteor-b", "meteor-shard"),
    ];
    battle.enemyStarterDeck = [];
    battle.enemyDrawPile = [];
    battle.playerBoard = [minion({ instanceId: "meteor-target", attack: 1, health: 6, maxHealth: 6 })];

    const resolution = resolveEnemyTurnWithPlayback(run);
    const cardActions = resolution.steps.flatMap(({ action }) => action.type === "cast-spell" ? [action.cardId] : []);
    // With 10 mana every turn the Meteor Shards no longer need the Bargain's extra mana, but the bargain stays a legal play.
    expect(cardActions.filter((cardId) => cardId === "meteor-shard").length).toBeGreaterThanOrEqual(1);
    expect(resolution.run.battle?.playerHero.health).toBe(30);
    expect(resolution.run.battle?.playerBoard[0]?.health ?? 0).toBeLessThan(6);
    expect(resolution.run.battle?.enemyMana.temporary).toBe(0);
  });

  it("rejects a summon spell on a full board and does not consume its card", () => {
    const run = copyRun(createRun(12));
    const battle = activeBattle(run);
    battle.playerBoard = Array.from({ length: gameConstants.maxBoard }, (_, index) => minion({ instanceId: `board-${index}` }));
    battle.hand = [instance("bones", "raise-bones")];
    expect(() => castSpell(run, "bones")).toThrowError(expect.objectContaining({ code: "MAX_BOARD" }));
    expect(run.battle?.hand[0]?.instanceId).toBe("bones");
  });

  it("burns turn draws that do not fit a full hand and still honors a legacy pending discard", () => {
    let run = copyRun(createRun(13));
    const battle = activeBattle(run);
    battle.hand = Array.from({ length: gameConstants.maxHand }, (_, index) => instance(`held-${index}`, "ash-wolf"));
    battle.drawPile = [instance("next-draw", "shadow-bolt")];
    run = endPlayerTurn(run);
    expect(run.battle?.pendingDiscardBeforeDraw).toBeFalsy();
    expect(run.battle?.hand).toHaveLength(10);
    expect(run.battle?.discardPile.some((card) => card.instanceId === "next-draw")).toBe(true);
    // A saved run from before this rule can still be waiting for a discard before its draw.
    const pending = copyRun(createRun(13));
    activeBattle(pending).hand = Array.from({ length: gameConstants.maxHand }, (_, index) => instance(`held-${index}`, "ash-wolf"));
    activeBattle(pending).drawPile = [instance("next-draw", "shadow-bolt")];
    activeBattle(pending).pendingDiscardBeforeDraw = true;
    run = pending;
    expect(() => discardBeforeDraw(run, "missing")).toThrowError(expect.objectContaining({ code: "CARD_NOT_FOUND" }));
    const discarded = discardBeforeDraw(run, "held-4");
    expect(discarded.battle?.pendingDiscardBeforeDraw).toBe(false);
    expect(discarded.battle?.hand).toHaveLength(10);
    expect(discarded.battle?.hand.some((card) => card.instanceId === "next-draw")).toBe(true);
    expect(discarded.battle?.discardPile.some((card) => card.instanceId === "held-4")).toBe(true);
  });

  it("never reshuffles: an empty draw pile deals fatigue 1, 2, 3 to the player's hero and armor absorbs it", () => {
    const run = copyRun(createRun(14));
    const battle = activeBattle(run);
    battle.drawPile = [];
    battle.hand = [instance("one", "ash-wolf")];
    battle.enemyHand = [];
    battle.enemyDrawPile = [];
    battle.enemyFatigue = -1;
    battle.enemyBoard = [];
    battle.playerHero.health = 30;
    const first = endPlayerTurn(run);
    expect(first.battle?.hand).toHaveLength(1);
    expect(first.battle?.drawPile).toHaveLength(0);
    expect(first.battle?.playerFatigue).toBe(1);
    expect(first.battle?.playerHero.health).toBe(29);
    expect(first.nextInstanceNumber).toBe(run.nextInstanceNumber);
    const second = endPlayerTurn(first);
    expect(second.battle?.playerFatigue).toBe(2);
    expect(second.battle?.playerHero.health).toBe(27);
    const third = endPlayerTurn(second);
    expect(third.battle?.playerFatigue).toBe(3);
    expect(third.battle?.playerHero.health).toBe(24);

    const armored = copyRun(first);
    activeBattle(armored).playerArmor = 1;
    activeBattle(armored).playerHero.health = 29;
    const withArmor = endPlayerTurn(armored);
    expect(withArmor.battle?.playerArmor).toBe(0);
    expect(withArmor.battle?.playerHero.health).toBe(28);
  });

  it("ends the run when fatigue kills the player and wins the battle when it kills the enemy", () => {
    const dying = copyRun(createRun(17));
    activeBattle(dying).drawPile = [];
    activeBattle(dying).playerFatigue = 4;
    activeBattle(dying).playerHero.health = 5;
    activeBattle(dying).enemyHand = [];
    activeBattle(dying).enemyDrawPile = [];
    activeBattle(dying).enemyFatigue = -1;
    expect(endPlayerTurn(dying).status).toBe("defeat");

    const enemyDying = copyRun(createRun(18));
    activeBattle(enemyDying).enemyHand = [];
    activeBattle(enemyDying).enemyDrawPile = [];
    activeBattle(enemyDying).enemyFatigue = 4;
    activeBattle(enemyDying).enemyHero.health = 5;
    const won = endPlayerTurn(enemyDying);
    expect(won.battle?.status).toBe("playerWon");
    expect(won.battle?.enemyHero.health).toBe(0);
  });

  it("makes a draw spell on an empty draw pile cause fatigue", () => {
    const run = copyRun(createRun(19));
    const battle = activeBattle(run);
    battle.hand = [instance("spell", "dark-insight")];
    battle.drawPile = [];
    const next = castSpell(run, "spell");
    // Dark Insight draws 2: the first empty draw deals 1, the second 2.
    expect(next.battle?.playerFatigue).toBe(2);
    expect(next.battle?.playerHero.health).toBe(battle.playerHero.health - 3);
  });

  it("fills a sixth board slot with a battlecry summon and keeps death summons within capacity", () => {
    const run = copyRun(createRun(15));
    const battle = activeBattle(run);
    battle.playerBoard = Array.from({ length: gameConstants.maxBoard - 2 }, (_, index) => minion({ instanceId: `setup-${index}`, cardId: "ash-wolf" }));
    battle.hand = [instance("imp", "cinder-imp")];
    const summoned = playMinion(run, "imp");
    expect(summoned.battle?.playerBoard).toHaveLength(gameConstants.maxBoard);
    expect(summoned.battle?.playerBoard.slice(-2).map((entry) => entry.cardId)).toEqual(["cinder-imp", "bone-rat"]);

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
  it("returns ordered action snapshots while preserving the legacy end-turn result", () => {
    const run = copyRun(createRun(236));
    const battle = activeBattle(run);
    battle.enemyId = "boss-grave-king";
    battle.turnNumber = gameConstants.bossAreaCadence.normal;
    battle.enemyMana.current = 1;
    battle.enemyHand = [instance("boss-minion", "ash-wolf")];
    battle.enemyDrawPile = [instance("boss-expensive", "healing-mist")];
    battle.enemyStarterDeck = [];
    battle.enemyBoard = [minion({ instanceId: "boss-attacker", owner: "enemy", attack: 2, health: 5, maxHealth: 5, summonedTurn: 0 })];
    battle.playerBoard = [minion({ instanceId: "player-target", attack: 1, health: 5, maxHealth: 5 })];
    const inputSnapshot = copyRun(run);

    const resolution = endPlayerTurnWithPlayback(run);
    const legacyResult = endPlayerTurn(run);

    expect(resolution.run).toEqual(legacyResult);
    expect(run).toEqual(inputSnapshot);
    expect(resolution.steps.map((step) => step.action.type)).toEqual(["play-minion", "attack", "boss-area"]);
    expect(resolution.steps[0]?.action).toMatchObject({ type: "play-minion", instanceId: "boss-minion" });
    expect(resolution.steps[1]?.presentationRun.battle?.playerBoard[0]?.health).toBe(3);
    expect(resolution.steps[2]?.presentationRun.battle?.playerBoard[0]?.health).toBe(2);
    for (const step of resolution.steps) {
      expect(step.beforeRun.battle?.activeSide).toBe("enemy");
      expect(step.presentationRun.battle?.activeSide).toBe("enemy");
      expect(step.beforeRun.battle).not.toHaveProperty("enemyTurnEvents");
      expect(step.presentationRun.battle).not.toHaveProperty("enemyTurnEvents");
    }
  });

  it("groups every effect of one enemy spell into one playback action", () => {
    const run = asEnemyTurn(createRun(237));
    const battle = activeBattle(run);
    battle.enemyMana.current = 6;
    battle.enemyHand = [instance("boss-spell", "soul-storm")];
    battle.enemyDrawPile = [instance("boss-expensive", "healing-mist")];

    const resolution = resolveEnemyTurnWithPlayback(run);

    expect(resolution.steps).toHaveLength(1);
    expect(resolution.steps[0]?.action).toMatchObject({ type: "cast-spell", instanceId: "boss-spell", effects: [{ kind: "damage" }, { kind: "draw" }] });
    expect(resolution.steps[0]?.presentationRun.battle?.playerHero.health).toBe(26);
    expect(resolution.run.battle?.playerHero.health).toBe(26);
  });

  it("keeps lethal spell, minion, and boss area snapshots before terminal defeat cleanup", () => {
    const lethalSpell = asEnemyTurn(createRun(238));
    activeBattle(lethalSpell).enemyMana.current = 1;
    activeBattle(lethalSpell).enemyHand = [instance("lethal-spell", "shadow-bolt")];
    activeBattle(lethalSpell).enemyDrawPile = [instance("expensive-spell", "healing-mist")];
    activeBattle(lethalSpell).playerHero.health = 2;

    const spellResult = resolveEnemyTurnWithPlayback(lethalSpell);
    expect(spellResult.run).toMatchObject({ status: "defeat", battle: null });
    expect(spellResult.steps.at(-1)?.action.type).toBe("cast-spell");
    expect(spellResult.steps.at(-1)?.presentationRun).toMatchObject({ status: "active", battle: { playerHero: { health: 0 } } });

    const lethalAttack = asEnemyTurn(createRun(239));
    activeBattle(lethalAttack).enemyMana.current = 0;
    activeBattle(lethalAttack).enemyHand = [];
    activeBattle(lethalAttack).enemyDrawPile = [instance("expensive-card", "healing-mist")];
    activeBattle(lethalAttack).enemyBoard = [minion({ instanceId: "lethal-attacker", owner: "enemy", attack: 3, summonedTurn: 0 })];
    activeBattle(lethalAttack).playerHero.health = 2;

    const attackResult = resolveEnemyTurnWithPlayback(lethalAttack);
    expect(attackResult.run).toMatchObject({ status: "defeat", battle: null });
    expect(attackResult.steps.at(-1)?.action).toMatchObject({ type: "attack", targetId: "player" });
    expect(attackResult.steps.at(-1)?.presentationRun.battle?.playerHero.health).toBe(0);

    const lethalArea = asEnemyTurn(createRun(240));
    activeBattle(lethalArea).enemyId = "boss-grave-king";
    activeBattle(lethalArea).turnNumber = gameConstants.bossAreaCadence.normal;
    activeBattle(lethalArea).enemyMana.current = 0;
    activeBattle(lethalArea).enemyHand = [];
    activeBattle(lethalArea).enemyDrawPile = [instance("area-expensive-card", "healing-mist")];
    activeBattle(lethalArea).playerHero.health = 1;

    const areaResult = resolveEnemyTurnWithPlayback(lethalArea);
    expect(areaResult.run).toMatchObject({ status: "defeat", battle: null });
    expect(areaResult.steps.at(-1)?.action.type).toBe("boss-area");
    expect(areaResult.steps.at(-1)?.presentationRun.battle?.playerHero.health).toBe(0);
  });

  it("plays multiple affordable cards with refreshed enemy mana and waits to attack with new minions", () => {
    const run = copyRun(createRun(48));
    const battle = activeBattle(run);
    battle.turnNumber = 10; // the enemy has its full 10 mana
    battle.enemyHand = [instance("enemy-wolf", "ash-wolf"), instance("enemy-guard", "crypt-guard"), instance("enemy-raven", "dusk-raven")];
    battle.enemyDrawPile = [instance("enemy-expensive", "healing-mist")];
    battle.enemyStarterDeck = [];
    const result = endPlayerTurn(run);
    const spent = ["ash-wolf", "crypt-guard", "dusk-raven"].reduce((total, cardId) => total + CARD_BY_ID.get(cardId)!.cost, 0);
    expect(result.battle?.enemyMana).toEqual({ current: 10 - spent, max: 10, temporary: 0 });
    expect(result.battle?.enemyBoard).toHaveLength(3);
    expect(result.battle?.enemyBoard.every((minion) => minion.summonedTurn === 10 && !minion.hasAttacked)).toBe(true);
    expect(result.battle?.enemyHand.map((card) => card.cardId)).toEqual(["healing-mist"]);
    expect(result.battle?.activeSide).toBe("player");

    const nextEnemyTurn = copyRun(result);
    activeBattle(nextEnemyTurn).activeSide = "enemy";
    activeBattle(nextEnemyTurn).enemyHand = [];
    activeBattle(nextEnemyTurn).enemyMana.current = 0;
    activeBattle(nextEnemyTurn).enemyDrawPile = [instance("still-expensive", "healing-mist")];
    const refreshed = resolveEnemyTurn(nextEnemyTurn);
    expect(refreshed.battle?.enemyMana.current).toBe(10);
  });

  it("spends mana on targeted damage spells and always chooses player minions first", () => {
    const run = asEnemyTurn(createRun(49));
    const battle = activeBattle(run);
    battle.enemyMana.current = 2;
    battle.enemyHand = [instance("enemy-lance", "soul-lance")];
    battle.enemyDrawPile = [instance("enemy-expensive", "healing-mist")];
    battle.playerBoard = [
      minion({ instanceId: "safe-target", attack: 1, health: 5, maxHealth: 5 }),
      minion({ instanceId: "lethal-target", attack: 8, health: 2, maxHealth: 2 }),
    ];
    const result = resolveEnemyTurn(run);
    expect(result.battle?.playerBoard.map((minion) => minion.instanceId)).toEqual(["safe-target"]);
    expect(result.battle?.playerHero.health).toBe(30);
    expect(result.battle?.enemyMana.current).toBe(10 - CARD_BY_ID.get("soul-lance")!.cost);
    expect(result.battle?.enemyDiscardPile).toContainEqual(instance("enemy-lance", "soul-lance"));
  });

  it("makes ready enemy minions trade reciprocal damage before attacking the hero on an empty board", () => {
    const run = asEnemyTurn(createRun(50));
    const battle = activeBattle(run);
    battle.enemyMana.current = 0;
    battle.enemyHand = [];
    battle.enemyDrawPile = [instance("enemy-expensive", "healing-mist")];
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
    activeBattle(openBoard).enemyDrawPile = [instance("enemy-expensive-2", "healing-mist")];
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
    battle.enemyDrawPile = [instance("enemy-expensive", "healing-mist")];
    const result = resolveEnemyTurn(run);
    expect(result.battle?.enemyHero.health).toBe(battle.enemyHero.maxHealth);
    expect(result.battle?.enemyBoard[0]?.attack).toBeGreaterThan(2);
    expect(result.battle?.playerHero.health).toBe(30);
  });

  it("burns the draw that does not fit a full enemy hand and applies fatigue instead of refilling", () => {
    const run = asEnemyTurn(createRun(52));
    const battle = activeBattle(run);
    battle.enemyId = "bandit-scout";
    // Healing Mist is never cast at full health, so the hand stays full and every draw overflows.
    battle.enemyHand = Array.from({ length: 10 }, (_, index) => instance(`enemy-hand-${index}`, "healing-mist"));
    battle.enemyDrawPile = [instance("last-draw", "healing-mist")];
    const overflow = resolveEnemyTurn(run);
    expect(overflow.battle?.enemyHand).toHaveLength(10);
    expect(overflow.battle?.enemyDiscardPile.some((card) => card.instanceId === "last-draw")).toBe(true);

    const recycled = asEnemyTurn(createRun(53));
    const recycledBattle = activeBattle(recycled);
    recycledBattle.enemyStarterDeck = Array.from({ length: 30 }, (_, index) => instance(`starter-${index}`, "healing-mist"));
    recycledBattle.enemyHand = [];
    recycledBattle.enemyDrawPile = [];
    recycledBattle.enemyFatigue = 0;
    const result = resolveEnemyTurn(recycled);
    // The starter deck is never reshuffled in: an empty draw pile is fatigue for the enemy hero.
    expect(result.battle?.enemyHand).toHaveLength(0);
    expect(result.battle?.enemyDrawPile).toHaveLength(0);
    expect(result.battle?.enemyFatigue).toBe(1);
    expect(result.battle?.enemyHero.health).toBe(result.battle!.enemyHero.maxHealth - 1);
  });

  it("keeps Normal boss attacks on every 4th turn and schedules Hard attacks every 3rd turn", () => {
    const normalEvery = gameConstants.bossAreaCadence.normal;
    const hardEvery = gameConstants.bossAreaCadence.hard;
    for (const turnNumber of [normalEvery, 2 * normalEvery, 3 * normalEvery]) {
      const bossRun = asEnemyTurn(createRun(54 + turnNumber));
      const bossBattle = activeBattle(bossRun);
      bossBattle.enemyId = "boss-grave-king";
      bossBattle.turnNumber = turnNumber;
      bossBattle.enemyMana.current = 0;
      bossBattle.enemyHand = turnNumber === normalEvery ? [instance("boss-minion", "ash-wolf")] : [];
      bossBattle.enemyDrawPile = [instance(`boss-expensive-${turnNumber}`, "healing-mist")];
      bossBattle.playerBoard = [minion({ instanceId: `one-health-${turnNumber}`, health: 1, maxHealth: 1 }), minion({ instanceId: `survivor-${turnNumber}`, health: 3, maxHealth: 3 })];
      bossBattle.enemyBoard = turnNumber === normalEvery ? [minion({ instanceId: "boss-attacker", owner: "enemy", attack: 1, summonedTurn: 0 })] : [];
      const result = resolveEnemyTurn(bossRun);
      expect(result.battle?.playerHero.health).toBe(29);
      expect(result.battle?.playerBoard.map((minion) => minion.instanceId)).toEqual([`survivor-${turnNumber}`]);
      expect(result.battle?.playerBoard[0]?.health).toBe(2);
      expect(result.battle?.enemyBoard.some((minion) => minion.cardId === "ash-wolf")).toBe(turnNumber === normalEvery);
      expect(result.battle?.enemyTurnEvents?.some((event) => event.type === "boss-area")).toBe(true);
      if (turnNumber === normalEvery) expect(result.battle?.enemyTurnEvents?.some((event) => event.type === "attack" && event.targetId === `one-health-${turnNumber}`)).toBe(true);
    }

    const offTurn = asEnemyTurn(createRun(55));
    activeBattle(offTurn).enemyId = "boss-grave-king";
    activeBattle(offTurn).turnNumber = 2;
    activeBattle(offTurn).enemyMana.current = 0;
    activeBattle(offTurn).enemyHand = [];
    activeBattle(offTurn).enemyDrawPile = [instance("boss-expensive", "healing-mist")];
    const secondTurn = resolveEnemyTurn(offTurn);
    expect(secondTurn.battle?.enemyTurnEvents?.some((event) => event.type === "boss-area")).toBe(false);

    for (const turnNumber of [hardEvery, 2 * hardEvery, 3 * hardEvery]) {
      const hardRun = asEnemyTurn(createRun(155 + turnNumber, "warrior", "hard"));
      const hardBattle = activeBattle(hardRun);
      hardBattle.enemyId = "boss-grave-king";
      hardBattle.turnNumber = turnNumber;
      hardBattle.enemyMana.current = 0;
      hardBattle.enemyHand = [];
      hardBattle.enemyDrawPile = [];
      hardBattle.playerBoard = [minion({ instanceId: `hard-target-${turnNumber}`, health: 5, maxHealth: 5 })];
      const result = resolveEnemyTurn(hardRun);
      expect(result.battle?.enemyTurnEvents?.some((event) => event.type === "boss-area")).toBe(true);
      expect(result.battle?.playerBoard[0]?.health).toBe(4);
    }

    const hardOffTurn = asEnemyTurn(createRun(162, "warrior", "hard"));
    activeBattle(hardOffTurn).enemyId = "boss-grave-king";
    activeBattle(hardOffTurn).turnNumber = hardEvery - 1;
    activeBattle(hardOffTurn).enemyMana.current = 0;
    activeBattle(hardOffTurn).enemyHand = [];
    activeBattle(hardOffTurn).enemyDrawPile = [];
    expect(resolveEnemyTurn(hardOffTurn).battle?.enemyTurnEvents?.some((event) => event.type === "boss-area")).toBe(false);

    const lethal = asEnemyTurn(createRun(56));
    activeBattle(lethal).enemyId = "boss-grave-king";
    activeBattle(lethal).turnNumber = normalEvery;
    activeBattle(lethal).enemyMana.current = 0;
    activeBattle(lethal).enemyHand = [];
    activeBattle(lethal).enemyDrawPile = [instance("boss-expensive", "healing-mist")];
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
    legacyBattle.enemyDrawPile = [instance("enemy-expensive", "healing-mist")];
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
    lethalBattle.enemyDrawPile = [instance("enemy-expensive", "healing-mist")];
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
    expect(finalWon.battle?.status).toBe("playerWon");
    expect(finalWon.pendingVictoryAcknowledgement).toBe(true);
    const finalConfirmed = acknowledgeVictory(finalWon);
    expect(finalConfirmed.pendingVictoryAcknowledgement).toBe(false);
    expect(finalConfirmed.battle).toBeNull();
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

  it("caps ordinary reward selection at 35 and atomically replaces one card at capacity", () => {
    const rewardReady = (seed: number, extraCards: number) => {
      const run = createRun(seed);
      for (let index = 0; index < extraCards; index += 1) run.deck.push({ instanceId: `extra-${index}`, cardId: "bone-rat" });
      run.pendingReward = { tier: "boss", choices: ["dread-colossus"], encounterIndex: 3 };
      run.pendingVictoryAcknowledgement = false;
      return run;
    };

    const thirtyFour = rewardReady(73, 4);
    expect(chooseReward(thirtyFour, "dread-colossus").deck).toHaveLength(35);

    const thirtyFive = rewardReady(74, 5);
    const originalDeck = structuredClone(thirtyFive.deck);
    expect(() => chooseReward(thirtyFive, "dread-colossus")).toThrowError(expect.objectContaining({ code: "MAX_DECK" }));
    expect(() => chooseRewardAndDiscard(thirtyFive, "dread-colossus", "missing-card")).toThrowError(expect.objectContaining({ code: "INVALID_TARGET" }));
    expect(thirtyFive.deck).toEqual(originalDeck);

    const replaced = chooseRewardAndDiscard(thirtyFive, "dread-colossus", "extra-0");
    expect(replaced.deck).toHaveLength(35);
    expect(replaced.deck.some(({ instanceId }) => instanceId === "extra-0")).toBe(false);
    expect(replaced.deck.some(({ cardId }) => cardId === "dread-colossus")).toBe(true);
    expect(replaced.pendingReward).toBeNull();
  });

  it("limits new-run rewards to neutral and selected-class cards, and legacy rewards to neutral cards", () => {
    for (const playerClass of ["warrior", "assassin", "demonist"] as const) {
      const run = winCurrentBattle(createRun(1020, playerClass));
      expect(run.pendingReward?.choices.every((id) => {
        const card = CARD_BY_ID.get(id);
        return card && !card.tokenOnly && (!card.classId || card.classId === playerClass);
      })).toBe(true);
    }

    const legacy = createRun(1021);
    delete legacy.playerClass;
    const legacyWin = winCurrentBattle(legacy);
    expect(legacyWin.pendingReward?.choices.every((id) => !CARD_BY_ID.get(id)?.classId && !CARD_BY_ID.get(id)?.tokenOnly)).toBe(true);
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
    expect(next.battle?.playerMana).toEqual({ current: 1, max: 1, temporary: 0 });
    expect(next.battle?.hand).toHaveLength(4);
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

describe("Hard boss cards and temporary combat statuses", () => {
  it("guarantees only the current boss's three signature cards in Hard mode decks", () => {
    for (const bossId of ["boss-blood-matron", "boss-grave-king", "boss-void-titan"]) {
      for (const difficulty of ["normal", "hard"] as const) {
        const run = createRun(700, "warrior", difficulty);
        const battle = activeBattle(run);
        battle.enemyId = bossId;
        const legacy = battle as unknown as Record<string, unknown>;
        delete legacy.enemyMana;
        delete legacy.enemyStarterDeck;
        delete legacy.enemyHand;
        delete legacy.enemyDrawPile;
        delete legacy.enemyDiscardPile;
        const generated = hydrateRunForCurrentBattle(run).battle!.enemyStarterDeck;
        expect(generated).toHaveLength(30);
        const cards = generated.map(({ cardId }) => cardId);
        const ownIds = CARD_CATALOG.filter((card) => card.enemyOnly && card.bossId === bossId).map((card) => card.id);
        const otherBossIds = CARD_CATALOG.filter((card) => card.enemyOnly && card.bossId !== bossId).map((card) => card.id);
        expect(ownIds).toHaveLength(3);
        expect(cards.filter((cardId) => ownIds.includes(cardId))).toEqual(difficulty === "hard" ? ownIds : []);
        expect(cards.some((cardId) => otherBossIds.includes(cardId))).toBe(false);
        expect([...new Set(cards)].every((cardId) => cards.filter((item) => item === cardId).length <= 2)).toBe(true);
      }
    }
  });

  it("applies root and curse through the player's turn and restores attack when the curse expires", () => {
    const rooted = asEnemyTurn(createRun(701));
    activeBattle(rooted).enemyMana.current = 3;
    activeBattle(rooted).enemyHand = [instance("root-card", "matron-thorn-prison")];
    activeBattle(rooted).enemyStarterDeck = [];
    activeBattle(rooted).enemyDrawPile = [];
    activeBattle(rooted).playerBoard = [minion({ instanceId: "root-target", attack: 5, health: 9, maxHealth: 9 })];
    const afterRoot = resolveEnemyTurn(rooted);
    expect(afterRoot.battle?.playerBoard[0]?.statusEffects).toContainEqual({ kind: "root", turnsRemaining: 1 });
    expect(() => attackWithMinion(afterRoot, "root-target", "enemy")).toThrow(GameRuleError);
    const afterRootExpires = endPlayerTurn(afterRoot);
    expect(afterRootExpires.battle?.playerBoard[0]?.statusEffects ?? []).toEqual([]);

    const cursed = asEnemyTurn(createRun(702));
    activeBattle(cursed).enemyMana.current = 4;
    activeBattle(cursed).enemyHand = [instance("curse-card", "matron-wither-curse")];
    activeBattle(cursed).enemyStarterDeck = [];
    activeBattle(cursed).enemyDrawPile = [];
    activeBattle(cursed).playerBoard = [minion({ instanceId: "cursed-target", attack: 3, health: 9, maxHealth: 9 })];
    const afterCurse = resolveEnemyTurn(cursed);
    expect(afterCurse.battle?.playerBoard[0]).toMatchObject({ attack: 1, statusEffects: [{ kind: "curse", turnsRemaining: 1, attackReduction: 2 }] });
    const afterCurseExpires = endPlayerTurn(afterCurse);
    expect(afterCurseExpires.battle?.playerBoard[0]).toMatchObject({ attack: 3, statusEffects: [] });
  });

  it("ticks hero burn at both player-turn starts and allows soul tithe with no discard target", () => {
    const burning = asEnemyTurn(createRun(703));
    activeBattle(burning).enemyMana.current = 3;
    activeBattle(burning).enemyHand = [instance("burn-card", "void-titan-burning-mark")];
    activeBattle(burning).enemyStarterDeck = [];
    activeBattle(burning).enemyDrawPile = [];
    activeBattle(burning).playerHero.health = 10;
    const firstTick = resolveEnemyTurn(burning);
    expect(firstTick.battle?.playerHero).toMatchObject({ health: 8, statusEffects: [{ kind: "burn", turnsRemaining: 1, amount: 2 }] });
    const nextEnemyTurn = asEnemyTurn(firstTick);
    activeBattle(nextEnemyTurn).enemyMana.current = 0;
    activeBattle(nextEnemyTurn).enemyHand = [];
    activeBattle(nextEnemyTurn).enemyDrawPile = [];
    const secondTick = resolveEnemyTurn(nextEnemyTurn);
    expect(secondTick.battle?.playerHero).toMatchObject({ health: 6, statusEffects: [] });

    const tithe = asEnemyTurn(createRun(704));
    activeBattle(tithe).enemyMana.current = 1;
    activeBattle(tithe).enemyHand = [instance("tithe-card", "grave-king-soul-tithe")];
    activeBattle(tithe).enemyStarterDeck = [];
    activeBattle(tithe).enemyDrawPile = [];
    const titheResult = resolveEnemyTurn(tithe);
    expect(titheResult.battle?.enemyBoard).toContainEqual(expect.objectContaining({ cardId: "grave-king-demon", attack: 4, maxHealth: 4 }));
    expect(titheResult.battle?.enemyDiscardPile).toContainEqual(instance("tithe-card", "grave-king-soul-tithe"));
  });
});

describe("Hard expedition enemy health and tactical AI", () => {
  function startAtEnemy(enemyId: string, difficulty: "normal" | "hard", phase: 1 | 2 | 3 = 1) {
    const run = copyRun(createRun(8801, "warrior", difficulty));
    run.battle = null;
    run.encounters[0]!.status = "pending";
    run.encounters[0]!.enemyId = enemyId;
    run.encounters[0]!.phase = phase;
    return startBattle(run, enemyId);
  }

  function firstPlayedCard(run: RunState): string | undefined {
    const result = resolveEnemyTurnWithPlayback(run);
    const action = result.steps[0]?.action;
    return action?.type === "play-minion" || action?.type === "cast-spell" ? action.cardId : undefined;
  }

  it("adds only the specified Hard-mode enemy health and preserves Normal values", () => {
    const scout = ENEMY_BY_ID.get("fallen-elf-scout")!.maxHealth;
    const matron = ENEMY_BY_ID.get("boss-blood-matron")!.maxHealth;
    expect(startAtEnemy("fallen-elf-scout", "normal").battle?.enemyHero).toMatchObject({ health: scout, maxHealth: scout });
    expect(startAtEnemy("fallen-elf-scout", "hard").battle?.enemyHero).toMatchObject({ health: scout + 2, maxHealth: scout + 2 });
    expect(startAtEnemy("boss-blood-matron", "normal").battle?.enemyHero).toMatchObject({ health: matron, maxHealth: matron });
    expect(startAtEnemy("boss-blood-matron", "hard").battle?.enemyHero).toMatchObject({ health: matron + 3, maxHealth: matron + 3 });
  });

  it("adds the selected Hard hero-health bonus at phase boundaries, including bosses", () => {
    const hard = gameConstants.enemyPhaseBonus.hard.heroHealth;
    const normal = gameConstants.enemyPhaseBonus.normal.heroHealth;
    const scout = ENEMY_BY_ID.get("fallen-elf-scout")!.maxHealth;
    const king = ENEMY_BY_ID.get("boss-grave-king")!.maxHealth;
    const health = (value: number) => ({ health: value, maxHealth: value });
    expect(startAtEnemy("fallen-elf-scout", "normal", 2).battle?.enemyHero).toMatchObject(health(scout + normal[2]));
    expect(startAtEnemy("fallen-elf-scout", "hard", 1).battle?.enemyHero).toMatchObject(health(scout + 2));
    expect(startAtEnemy("fallen-elf-scout", "hard", 2).battle?.enemyHero).toMatchObject(health(scout + 2 + hard[2]));
    expect(startAtEnemy("fallen-elf-scout", "hard", 3).battle?.enemyHero).toMatchObject(health(scout + 2 + hard[3]));
    expect(startAtEnemy("boss-grave-king", "normal", 2).battle?.enemyHero).toMatchObject(health(king + normal[2]));
    expect(startAtEnemy("boss-grave-king", "hard", 2).battle?.enemyHero).toMatchObject(health(king + 3 + hard[2]));
    expect(startAtEnemy("boss-grave-king", "hard", 3).battle?.enemyHero).toMatchObject(health(king + 3 + hard[3]));
  });

it("scales every enemy minion and summon in Hard phases but never scales player minions", () => {
    const hardDirect = asEnemyTurn(startAtEnemy("fallen-elf-scout", "hard", 2));
    activeBattle(hardDirect).enemyMana.current = 5;
    activeBattle(hardDirect).enemyHand = [instance("enemy-ash-wolf", "ash-wolf")];
    activeBattle(hardDirect).enemyStarterDeck = [];
    activeBattle(hardDirect).enemyDrawPile = [];
    const directResult = resolveEnemyTurn(hardDirect);
    expect(directResult.battle?.enemyBoard).toContainEqual(expect.objectContaining({ cardId: "ash-wolf", attack: 2 + gameConstants.enemyPhaseBonus.hard.minionAttack[2], health: 1, maxHealth: 1 }));

    const hardSummon = asEnemyTurn(startAtEnemy("boss-grave-king", "hard", 3));
    activeBattle(hardSummon).enemyMana.current = 10;
    activeBattle(hardSummon).enemyHand = [instance("pit-gate", "grave-king-pit-gate")];
    activeBattle(hardSummon).enemyStarterDeck = [];
    activeBattle(hardSummon).enemyDrawPile = [];
    const summonResult = resolveEnemyTurn(hardSummon);
    expect(summonResult.battle?.enemyBoard.filter(({ cardId }) => cardId === "grave-king-demon")).toHaveLength(2);
    expect(summonResult.battle?.enemyBoard).toEqual(expect.arrayContaining([
      expect.objectContaining({ cardId: "grave-king-demon", attack: 4 + gameConstants.enemyPhaseBonus.hard.minionAttack[3], health: 4, maxHealth: 4 }),
      expect.objectContaining({ cardId: "grave-king-demon", attack: 4 + gameConstants.enemyPhaseBonus.hard.minionAttack[3], health: 4, maxHealth: 4 }),
    ]));

    const playerRun = startAtEnemy("fallen-elf-scout", "hard", 3);
    const playerBattle = activeBattle(playerRun);
    playerBattle.hand = [instance("player-ash-wolf", "ash-wolf")];
    playerBattle.playerMana.current = 5;
    const playerResult = playMinion(playerRun, "player-ash-wolf");
    expect(playerResult.battle?.playerBoard[0]).toMatchObject({ cardId: "ash-wolf", attack: 2, health: 1, maxHealth: 1 });
  });

  it("uses a player's hidden board-clear spell to change Hard card choice but not Normal choice", () => {
    const tieSeed = Array.from({ length: 100 }, (_, index) => index + 1)
      .find((seed) => pickIndex(2, seed).value === 1)!;
    const makeChoiceRun = (difficulty: "normal" | "hard", hasClearSpell: boolean) => {
      const run = asEnemyTurn(createRun(8802, "warrior", difficulty));
      const battle = activeBattle(run);
      battle.enemyId = "boss-grave-king";
      battle.enemyMana.current = 5;
      battle.rngState = tieSeed;
      battle.enemyHand = [instance("thorn-brute-choice", "thorn-brute"), instance("moon-stag-choice", "moon-stag")];
      battle.enemyBoard = [minion({ instanceId: "enemy-board", owner: "enemy", attack: 2, health: 8, maxHealth: 8, summonedTurn: 0 })];
      battle.enemyStarterDeck = [];
      battle.enemyDrawPile = [];
      battle.hand = hasClearSpell ? [instance("known-board-clear", "soul-lance")] : [];
      return run;
    };

    expect(firstPlayedCard(makeChoiceRun("hard", false))).toBe("moon-stag");
    expect(firstPlayedCard(makeChoiceRun("hard", true))).toBe("thorn-brute");
    expect(firstPlayedCard(makeChoiceRun("normal", false))).toBe("moon-stag");
    expect(firstPlayedCard(makeChoiceRun("normal", true))).toBe("moon-stag");
  });

  it("uses the next three hidden draws to keep a Hard attacker that can trade into a large minion", () => {
    const tieSeed = Array.from({ length: 100 }, (_, index) => index + 1)
      .find((seed) => pickIndex(2, seed).value === 0)!;
    const makeChoiceRun = (hasLargeMinionDraw: boolean) => {
      const run = asEnemyTurn(createRun(8803, "warrior", "hard"));
      const battle = activeBattle(run);
      battle.enemyId = "boss-grave-king";
      battle.enemyMana.current = 5;
      battle.rngState = tieSeed;
      battle.enemyHand = [instance("thorn-brute-choice", "thorn-brute"), instance("moon-stag-choice", "moon-stag")];
      battle.enemyBoard = [minion({ instanceId: "enemy-board", owner: "enemy", attack: 2, health: 8, maxHealth: 8, summonedTurn: 0 })];
      battle.enemyStarterDeck = [];
      battle.enemyDrawPile = [];
      battle.drawPile = hasLargeMinionDraw ? [instance("large-next-draw", "moon-stag")] : [];
      return run;
    };

    expect(firstPlayedCard(makeChoiceRun(false))).toBe("thorn-brute");
    expect(firstPlayedCard(makeChoiceRun(true))).toBe("moon-stag");
  });

  it("protects a high-attack Hard attacker when a drawn removal spell can kill it", () => {
    const makeChoiceRun = (hasRemovalDraw: boolean) => {
      const run = asEnemyTurn(createRun(8806, "warrior", "hard"));
      const battle = activeBattle(run);
      battle.enemyId = "bandit-scout";
      battle.enemyMana.current = 4;
      battle.enemyHand = [instance("shade-choice", "shade-stalker"), instance("smith-choice", "rune-smith")];
      battle.enemyBoard = [minion({ instanceId: "valuable-attacker", owner: "enemy", attack: 6, health: 5, maxHealth: 5, summonedTurn: 0 })];
      battle.enemyStarterDeck = [];
      battle.enemyDrawPile = [];
      battle.drawPile = hasRemovalDraw ? [instance("removal-draw", "meteor-shard")] : [];
      return run;
    };

    expect(firstPlayedCard(makeChoiceRun(false))).toBe("shade-stalker");
    expect(firstPlayedCard(makeChoiceRun(true))).toBe("rune-smith");
  });

  it("attacks the hero for nonlethal damage unless a taunt minion blocks it", () => {
    const open = asEnemyTurn(createRun(8804, "warrior", "hard"));
    const openBattle = activeBattle(open);
    openBattle.enemyMana.current = 0;
    openBattle.enemyHand = [];
    openBattle.enemyDrawPile = [];
    openBattle.playerHero.health = 20;
    openBattle.enemyBoard = [minion({ instanceId: "open-attacker", owner: "enemy", attack: 2, health: 4, maxHealth: 4, summonedTurn: 0 })];
    const openResult = resolveEnemyTurnWithPlayback(open);
    expect(openResult.steps[0]?.action).toMatchObject({ type: "attack", targetId: "player" });
    expect(openResult.run.battle?.playerHero.health).toBe(18);

    const blocked = asEnemyTurn(createRun(8808, "warrior", "hard"));
    const blockedBattle = activeBattle(blocked);
    blockedBattle.enemyMana.current = 0;
    blockedBattle.enemyHand = [];
    blockedBattle.enemyDrawPile = [];
    blockedBattle.playerHero.health = 2;
    blockedBattle.playerBoard = [minion({ instanceId: "blocker", cardId: "warrior-vanguard", attack: 1, health: 3, maxHealth: 3 })];
    blockedBattle.enemyBoard = [minion({ instanceId: "blocked-attacker", owner: "enemy", attack: 2, health: 4, maxHealth: 4, summonedTurn: 0 })];
    const blockedResult = resolveEnemyTurnWithPlayback(blocked);
    expect(blockedResult.steps[0]?.action).toMatchObject({ type: "attack", targetId: "blocker" });
    expect(blockedResult.run.battle?.playerHero.health).toBe(2);
  });

  it("prioritizes killable ready threats in Hard mode while Normal keeps its old target order", () => {
    const hardTrade = asEnemyTurn(createRun(8807, "warrior", "hard"));
    const hardTradeBattle = activeBattle(hardTrade);
    hardTradeBattle.enemyMana.current = 0;
    hardTradeBattle.enemyHand = [];
    hardTradeBattle.enemyStarterDeck = [];
    hardTradeBattle.enemyDrawPile = [];
    hardTradeBattle.playerBoard = [
      minion({ instanceId: "ready-threat", attack: 5, health: 2, maxHealth: 2, hasAttacked: false }),
      minion({ instanceId: "spent-threat", attack: 1, health: 1, maxHealth: 1, hasAttacked: true }),
    ];
    hardTradeBattle.enemyBoard = [minion({ instanceId: "hard-attacker", owner: "enemy", attack: 2, health: 4, maxHealth: 4, summonedTurn: 0 })];
    expect(resolveEnemyTurnWithPlayback(hardTrade).steps[0]?.action).toMatchObject({ type: "attack", targetId: "ready-threat" });

    const normal = asEnemyTurn(createRun(8805, "warrior", "normal"));
    const normalBattle = activeBattle(normal);
    normalBattle.enemyMana.current = 0;
    normalBattle.enemyHand = [];
    normalBattle.enemyDrawPile = [];
    normalBattle.playerBoard = [minion({ instanceId: "ready-threat", attack: 5, health: 6, maxHealth: 6, hasAttacked: false }), minion({ instanceId: "spent-threat", attack: 1, health: 1, maxHealth: 1, hasAttacked: true })];
    normalBattle.enemyBoard = [minion({ instanceId: "normal-attacker", owner: "enemy", attack: 2, health: 4, maxHealth: 4, summonedTurn: 0 })];
    expect(resolveEnemyTurnWithPlayback(normal).steps[0]?.action).toMatchObject({ type: "attack", targetId: "spent-threat" });
  });

  it("plans and plays a legal multi-card sequence after the opening battle", () => {
    expect(gameConstants.hardAiBeamWidth(0)).toBe(8);
    expect(gameConstants.hardAiBeamWidth(1)).toBe(10);
    expect(gameConstants.hardAiBeamWidth(12)).toBe(32);
    expect(gameConstants.hardAiBeamWidth(20)).toBe(32);

    const firstBattle = asEnemyTurn(createRun(8810, "warrior", "hard"));
    const firstBattleState = activeBattle(firstBattle);
    firstBattleState.enemyMana.current = 2;
    firstBattleState.enemyHand = [instance("first-shadow", "shadow-bolt"), instance("first-imp", "cinder-imp")];
    firstBattleState.enemyStarterDeck = [];
    firstBattleState.enemyDrawPile = [];
    const openingActions = resolveEnemyTurnWithPlayback(firstBattle).steps.filter(({ action }) => action.type === "cast-spell" || action.type === "play-minion");
    expect(openingActions).toHaveLength(2);

    const laterBattle = copyRun(firstBattle);
    laterBattle.completedBattles = 1;
    activeBattle(laterBattle).enemyMana.current = 2;
    const planned = resolveEnemyTurnWithPlayback(laterBattle);
    const playActions = planned.steps.flatMap(({ action }) => action.type === "cast-spell" || action.type === "play-minion" ? [action] : []);
    expect(playActions).toHaveLength(2);
    expect(playActions.map((action) => action.cardId)).toEqual(expect.arrayContaining(["shadow-bolt", "cinder-imp"]));
    expect(activeBattle(laterBattle).enemyHand).toHaveLength(2);
  });
});


describe("enemy turn characterization (first battle and Hard planner stay unchanged)", () => {
  // Hashes were re-captured on 2026-11-24 for the new enemy rules (enemy mana +2 per turn, no minion health bonus, no wasted heals, Hearthstone mana curve, 5 draws per turn, all-attack); older captures predate the Normal turn planner.
  const GOLDEN_HASHES: Record<string, string> = {
    "normal-first-9101": "f5c94a722501",
    "normal-first-9102": "114a8b1d5753",
    "normal-first-9103": "6f4f0639308b",
    "normal-first-9104": "c2421c0e5742",
    "normal-first-9105": "99a901f81e20",
    "hard-first-9201": "499320fd4efa",
    "hard-first-9202": "9f9ed1531142",
    "hard-first-9203": "9b8ed827f44c",
    "hard-second-9301": "1a9681dbf939",
    "hard-second-9302": "0df9f05e7f5e",
    "hard-second-9303": "ead78a623e9d",
  };

  function summarize(run: RunState) {
    const battle = run.battle;
    if (!battle) return { status: run.status };
    return {
      turn: battle.turnNumber,
      status: battle.status,
      heroHealth: battle.playerHero.health,
      enemyHeroHealth: battle.enemyHero.health,
      enemyBoard: battle.enemyBoard.map((entry) => `${entry.cardId}:${entry.attack}/${entry.health}`),
      enemyHand: battle.enemyHand.map((card) => card.cardId),
    };
  }

  // The hashes predate phase-1 bonuses, so the phase-1 table entries are zeroed while capturing (and restored after).
  function withoutPhaseOneBonus<T>(action: () => T): T {
    const saved = (["normal", "hard"] as const).map((difficulty) => {
      const table = gameConstants.enemyPhaseBonus[difficulty];
      const values = { difficulty, hero: table.heroHealth[1], attack: table.minionAttack[1], health: table.minionHealth[1] };
      table.heroHealth[1] = 0;
      table.minionAttack[1] = 0;
      table.minionHealth[1] = 0;
      return values;
    });
    try {
      return action();
    } finally {
      for (const { difficulty, hero, attack, health } of saved) {
        const table = gameConstants.enemyPhaseBonus[difficulty];
        table.heroHealth[1] = hero;
        table.minionAttack[1] = attack;
        table.minionHealth[1] = health;
      }
    }
  }

  function playThreeEnemyTurns(seed: number, difficulty: "normal" | "hard", completedBattles: number): string {
    return withoutPhaseOneBonus(() => {
      let run = createRun(seed, "warrior", difficulty);
      run.completedBattles = completedBattles;
      const snapshots = [];
      for (let turn = 0; turn < 3; turn += 1) {
        run = endPlayerTurn(run);
        snapshots.push(summarize(run));
      }
      return createHash("sha1").update(JSON.stringify(snapshots)).digest("hex").slice(0, 12);
    });
  }

  it.each([
    ["normal-first-9101", 9101, "normal", 0], ["normal-first-9102", 9102, "normal", 0], ["normal-first-9103", 9103, "normal", 0],
    ["normal-first-9104", 9104, "normal", 0], ["normal-first-9105", 9105, "normal", 0],
    ["hard-first-9201", 9201, "hard", 0], ["hard-first-9202", 9202, "hard", 0], ["hard-first-9203", 9203, "hard", 0],
    ["hard-second-9301", 9301, "hard", 1], ["hard-second-9302", 9302, "hard", 1], ["hard-second-9303", 9303, "hard", 1],
  ] as const)("%s plays three enemy turns exactly as before", (key, seed, difficulty, completedBattles) => {
    expect(playThreeEnemyTurns(seed, difficulty, completedBattles)).toBe(GOLDEN_HASHES[key]);
  });
});

describe("Normal enemy turn planner (second battle onward, no hidden information)", () => {
  function firstPlayed(run: RunState): string | undefined {
    const action = resolveEnemyTurnWithPlayback(run).steps[0]?.action;
    return action?.type === "play-minion" || action?.type === "cast-spell" ? action.cardId : undefined;
  }

  function secondBattleChoiceRun(
    difficulty: "normal" | "hard",
    options: { playerHand?: CardInstance[]; playerDraws?: CardInstance[]; enemyCards?: [string, string]; enemyBoardSize?: number },
  ) {
    const [firstCard, secondCard] = options.enemyCards ?? ["thorn-brute", "moon-stag"];
    const run = asEnemyTurn(createRun(8802, "warrior", difficulty));
    run.completedBattles = 1;
    const battle = activeBattle(run);
    battle.enemyId = "boss-grave-king";
    battle.enemyMana.current = 5;
    battle.enemyHand = [instance("choice-one", firstCard), instance("choice-two", secondCard)];
    // Mana is always 10 now, so scarcity comes from board space: with five minions out only one more can be played.
    battle.enemyBoard = Array.from({ length: options.enemyBoardSize ?? 1 }, (_, index) => minion({ instanceId: `enemy-board-${index}`, owner: "enemy", attack: 2, health: 8, maxHealth: 8, summonedTurn: 0 }));
    battle.enemyStarterDeck = [];
    battle.enemyDrawPile = [];
    battle.hand = options.playerHand ?? [];
    battle.drawPile = options.playerDraws ?? [];
    return run;
  }

  it("ramps the Normal beam width separately from Hard", () => {
    expect(gameConstants.normalAiBeamWidth(0)).toBe(4);
    expect(gameConstants.normalAiBeamWidth(1)).toBe(5);
    expect(gameConstants.normalAiBeamWidth(12)).toBe(16);
    expect(gameConstants.normalAiBeamWidth(40)).toBe(16);
    expect(gameConstants.normalAiBeamWidth(12)).toBeLessThan(gameConstants.hardAiBeamWidth(12));
  });

  it("plans a legal multi-card sequence from the second battle", () => {
    const firstBattle = asEnemyTurn(createRun(8810, "warrior", "normal"));
    const state = activeBattle(firstBattle);
    state.enemyMana.current = 2;
    state.enemyHand = [instance("plan-shadow", "shadow-bolt"), instance("plan-imp", "cinder-imp")];
    state.enemyStarterDeck = [];
    state.enemyDrawPile = [];
    const laterBattle = copyRun(firstBattle);
    laterBattle.completedBattles = 1;
    const plays = resolveEnemyTurnWithPlayback(laterBattle).steps
      .flatMap(({ action }) => action.type === "cast-spell" || action.type === "play-minion" ? [action.cardId] : []);
    expect(plays).toEqual(expect.arrayContaining(["shadow-bolt", "cinder-imp"]));
    expect(plays).toHaveLength(2);
  });

  it("does not change its card choice when the player's hand or draw order changes", () => {
    const empty = firstPlayed(secondBattleChoiceRun("normal", {}));
    const withHiddenClear = firstPlayed(secondBattleChoiceRun("normal", { playerHand: [instance("known-board-clear", "soul-lance")] }));
    const withHiddenDraws = firstPlayed(secondBattleChoiceRun("normal", { playerDraws: [instance("large-next-draw", "moon-stag"), instance("removal-draw", "meteor-shard")] }));
    expect(empty).toBeDefined();
    expect(withHiddenClear).toBe(empty);
    expect(withHiddenDraws).toBe(empty);
  });

  it("keeps Hard's hidden-information scoring in the planner", () => {
    const enemyCards: [string, string] = ["iron-hound", "rune-smith"];
    const clearSpell = [instance("known-board-clear", "soul-lance")];
    const hardEmpty = firstPlayed(secondBattleChoiceRun("hard", { enemyCards, enemyBoardSize: 5 }));
    const hardWithClear = firstPlayed(secondBattleChoiceRun("hard", { enemyCards, enemyBoardSize: 5, playerHand: clearSpell }));
    expect(hardEmpty).toBe("iron-hound");
    expect(hardWithClear).toBe("rune-smith");
    // The same cards under Normal ignore the hidden spell.
    const normalEmpty = firstPlayed(secondBattleChoiceRun("normal", { enemyCards, enemyBoardSize: 5 }));
    expect(firstPlayed(secondBattleChoiceRun("normal", { enemyCards, enemyBoardSize: 5, playerHand: clearSpell }))).toBe(normalEmpty);
  });

  it("never overspends mana or exceeds the board cap across seeds and turns", () => {
    for (let seed = 9400; seed < 9420; seed += 1) {
      let run = createRun(seed, "assassin", "normal");
      run.completedBattles = 2;
      for (let turn = 0; turn < 3 && run.status === "active" && run.battle?.status === "active"; turn += 1) {
        run = endPlayerTurn(run);
        const battle = run.battle;
        if (!battle) break;
        expect(battle.enemyMana.current).toBeGreaterThanOrEqual(0);
        expect(battle.enemyBoard.length).toBeLessThanOrEqual(gameConstants.maxBoard);
      }
    }
  });

  it("is deterministic for identical input", () => {
    const run = asEnemyTurn(createRun(9450, "demonist", "normal"));
    run.completedBattles = 3;
    expect(JSON.stringify(resolveEnemyTurnWithPlayback(run).run)).toBe(JSON.stringify(resolveEnemyTurnWithPlayback(run).run));
  });
});

describe("per-difficulty enemy phase bonus tables", () => {
  const BASE_SCOUT_HEALTH = ENEMY_BY_ID.get("fallen-elf-scout")!.maxHealth; // fallen-elf-scout, Normal base value
  const BASE_GRAVE_KING_HEALTH = ENEMY_BY_ID.get("boss-grave-king")!.maxHealth; // boss-grave-king, Normal base value
  const phaseOf = (value: number): 1 | 2 | 3 => value as 1 | 2 | 3;

  function startAtEnemy(enemyId: string, difficulty: "normal" | "hard", phase: 1 | 2 | 3, completedBattles: number) {
    const run = copyRun(createRun(8801, "warrior", difficulty));
    run.battle = null;
    run.completedBattles = completedBattles;
    run.encounters[0]!.status = "pending";
    run.encounters[0]!.enemyId = enemyId;
    run.encounters[0]!.phase = phase;
    return startBattle(run, enemyId);
  }

  function summonedAshWolf(run: RunState): MinionState | undefined {
    const next = asEnemyTurn(run);
    const battle = activeBattle(next);
    battle.enemyMana.current = 5;
    battle.enemyHand = [instance("table-ash-wolf", "ash-wolf")];
    battle.enemyStarterDeck = [];
    battle.enemyDrawPile = [];
    return resolveEnemyTurn(next).battle?.enemyBoard.find(({ cardId }) => cardId === "ash-wolf");
  }

  it("exposes a complete table for every difficulty and phase", () => {
    for (const difficulty of ["normal", "hard"] as const) {
      const table = gameConstants.enemyPhaseBonus[difficulty];
      for (const phase of [1, 2, 3] as const) {
        for (const value of [table.heroHealth[phase], table.minionAttack[phase], table.minionHealth[phase]]) {
          expect(Number.isInteger(value)).toBe(true);
          expect(value).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });

  it("never lets Normal bonuses exceed Hard bonuses in any phase", () => {
    for (const phase of [1, 2, 3] as const) {
      expect(gameConstants.enemyPhaseBonus.normal.heroHealth[phase]).toBeLessThanOrEqual(gameConstants.enemyPhaseBonus.hard.heroHealth[phase]);
      expect(gameConstants.enemyPhaseBonus.normal.minionAttack[phase]).toBeLessThanOrEqual(gameConstants.enemyPhaseBonus.hard.minionAttack[phase]);
      expect(gameConstants.enemyPhaseBonus.normal.minionHealth[phase]).toBeLessThanOrEqual(gameConstants.enemyPhaseBonus.hard.minionHealth[phase]);
    }
  });

  it("applies the table to enemy hero health, with Hard's flat bonus on top, from the second battle on", () => {
    for (const phase of [1, 2, 3] as const) {
      const completedBattles = phase === 1 ? 1 : phase === 2 ? 4 : 8;
      const normal = gameConstants.enemyPhaseBonus.normal.heroHealth[phase];
      const hard = gameConstants.enemyPhaseBonus.hard.heroHealth[phase];
      expect(startAtEnemy("fallen-elf-scout", "normal", phaseOf(phase), completedBattles).battle?.enemyHero.maxHealth).toBe(BASE_SCOUT_HEALTH + normal);
      expect(startAtEnemy("fallen-elf-scout", "hard", phaseOf(phase), completedBattles).battle?.enemyHero.maxHealth).toBe(BASE_SCOUT_HEALTH + 2 + hard);
      expect(startAtEnemy("boss-grave-king", "normal", phaseOf(phase), completedBattles).battle?.enemyHero.maxHealth).toBe(BASE_GRAVE_KING_HEALTH + normal);
      expect(startAtEnemy("boss-grave-king", "hard", phaseOf(phase), completedBattles).battle?.enemyHero.maxHealth).toBe(BASE_GRAVE_KING_HEALTH + 3 + hard);
    }
  });

  it("applies the table to every enemy minion, attack and health separately, and never to player minions", () => {
    for (const phase of [1, 2, 3] as const) {
      const completedBattles = phase === 1 ? 1 : phase === 2 ? 4 : 8;
      for (const difficulty of ["normal", "hard"] as const) {
        const table = gameConstants.enemyPhaseBonus[difficulty];
        expect(summonedAshWolf(startAtEnemy("fallen-elf-scout", difficulty, phaseOf(phase), completedBattles))).toMatchObject({
          attack: 2 + table.minionAttack[phase],
          health: 1 + table.minionHealth[phase],
          maxHealth: 1 + table.minionHealth[phase],
        });
      }
    }
    const playerRun = startAtEnemy("fallen-elf-scout", "hard", 3, 8);
    activeBattle(playerRun).hand = [instance("player-table-wolf", "ash-wolf")];
    activeBattle(playerRun).playerMana.current = 5;
    expect(playMinion(playerRun, "player-table-wolf").battle?.playerBoard[0]).toMatchObject({ attack: 2, health: 1, maxHealth: 1 });
  });

  it("gives no bonus in the first battle even if the phase-1 table value is non-zero", () => {
    const normal = gameConstants.enemyPhaseBonus.normal;
    const original = { hero: normal.heroHealth[1], attack: normal.minionAttack[1], health: normal.minionHealth[1] };
    try {
      normal.heroHealth[1] = 5;
      normal.minionAttack[1] = 3;
      normal.minionHealth[1] = 2;
      expect(startAtEnemy("fallen-elf-scout", "normal", 1, 0).battle?.enemyHero.maxHealth).toBe(BASE_SCOUT_HEALTH);
      expect(summonedAshWolf(startAtEnemy("fallen-elf-scout", "normal", 1, 0))).toMatchObject({ attack: 2, health: 1, maxHealth: 1 });
      expect(startAtEnemy("fallen-elf-scout", "normal", 1, 1).battle?.enemyHero.maxHealth).toBe(BASE_SCOUT_HEALTH + 5);
      expect(summonedAshWolf(startAtEnemy("fallen-elf-scout", "normal", 1, 1))).toMatchObject({ attack: 5, health: 3, maxHealth: 3 });
    } finally {
      normal.heroHealth[1] = original.hero;
      normal.minionAttack[1] = original.attack;
      normal.minionHealth[1] = original.health;
    }
  });
});

describe("boss area attack cadence constant", () => {
  it("is every 4th turn on normal and every 3rd turn on hard", () => {
    expect(gameConstants.bossAreaCadence).toEqual({ normal: 4, hard: 3 });
  });
});



describe("starter deck curve", () => {
  it("gives every class a 30-card deck with a low early curve and an average cost near 2.5", () => {
    expect(SHARED_STARTER_CARD_IDS).toHaveLength(20);
    const shared = (cost: number) => SHARED_STARTER_CARD_IDS.filter((id) => CARD_BY_ID.get(id)!.cost === cost).length;
    // Turns 1-3 must never be empty: at least ten cards cost 1 or 2, and only one card costs 5 or more.
    expect(shared(1) + shared(2)).toBeGreaterThanOrEqual(10);
    expect(SHARED_STARTER_CARD_IDS.filter((id) => CARD_BY_ID.get(id)!.cost >= 5)).toHaveLength(1);
    // Boss-tier cards are boss rewards and must not be in the starting deck.
    expect(SHARED_STARTER_CARD_IDS.some((id) => CARD_BY_ID.get(id)!.rewardTier === "boss")).toBe(false);
    for (const playerClass of ["warrior", "assassin", "demonist"] as const) {
      const run = createRun(900, playerClass);
      expect(run.deck).toHaveLength(30);
      const average = run.deck.reduce((total, { cardId }) => total + CARD_BY_ID.get(cardId)!.cost, 0) / run.deck.length;
      expect(average).toBeGreaterThan(2.1);
      expect(average).toBeLessThan(3.0);
    }
  });
});


describe("enemy bonuses after the playtest feedback round", () => {
  function startAtEnemy(enemyId: string, difficulty: "normal" | "hard", phase: 1 | 2 | 3) {
    const run = copyRun(createRun(8801, "warrior", difficulty));
    run.battle = null;
    run.encounters[0]!.status = "pending";
    run.encounters[0]!.enemyId = enemyId;
    run.encounters[0]!.phase = phase;
    return startBattle(run, enemyId);
  }

  it("never gives enemy minions extra health (same card, same health)", () => {
    for (const difficulty of ["normal", "hard"] as const) {
      expect(gameConstants.enemyPhaseBonus[difficulty].minionHealth).toEqual({ 1: 0, 2: 0, 3: 0 });
      for (const phase of [2, 3] as const) {
        const run = asEnemyTurn(startAtEnemy("fallen-elf-scout", difficulty, phase));
        activeBattle(run).enemyMana.current = 5;
        activeBattle(run).enemyHand = [instance("enemy-ash-wolf", "ash-wolf")];
        activeBattle(run).enemyStarterDeck = [];
        activeBattle(run).enemyDrawPile = [];
        const result = resolveEnemyTurn(run);
        const wolf = result.battle?.enemyBoard.find(({ cardId }) => cardId === "ash-wolf");
        expect(wolf).toMatchObject({ health: 1, maxHealth: 1 });
      }
    }
  });

  it("gives the enemy the same mana curve as the player (min(10, turn), refilled) and 1 draw every turn (hand limit 10)", () => {
    expect(gameConstants.initialMana).toBe(1);
    expect(gameConstants.turnDrawCount).toBe(1);
    // Healing Mist is never cast at full health, so nothing is played and only the draws are visible.
    const setup = (turnNumber: number, handSize: number, mana: number) => {
      const run = asEnemyTurn(createRun(910));
      const battle = activeBattle(run);
      battle.turnNumber = turnNumber;
      battle.enemyMana = { current: mana, max: 10, temporary: 0 };
      battle.enemyHand = Array.from({ length: handSize }, (_, index) => instance(`held-${index}`, "healing-mist"));
      battle.enemyStarterDeck = [];
      battle.enemyDrawPile = Array.from({ length: 8 }, (_, index) => instance(`draw-${index}`, "healing-mist"));
      return run;
    };
    const turnTwo = resolveEnemyTurn(setup(2, 2, 0));
    expect(turnTwo.battle?.enemyMana).toEqual({ current: 2, max: 2, temporary: 0 });
    expect(turnTwo.battle?.enemyHand).toHaveLength(3);
    const firstTurn = resolveEnemyTurn(setup(1, 3, 0));
    expect(firstTurn.battle?.enemyMana).toEqual({ current: 1, max: 1, temporary: 0 });
    expect(firstTurn.battle?.enemyHand).toHaveLength(4);
    const lateTurn = resolveEnemyTurn(setup(12, 2, 0));
    expect(lateTurn.battle?.enemyMana).toEqual({ current: 10, max: 10, temporary: 0 });
    const fullHand = resolveEnemyTurn(setup(4, 10, 10));
    expect(fullHand.battle?.enemyHand).toHaveLength(10);
    expect(fullHand.battle?.enemyDiscardPile).toHaveLength(1);
  });


});

describe("enemy attack planning (second battle onward)", () => {
  type Stats = { attack: number; health: number };
  const enemyMinion = (id: string, { attack, health }: Stats) => minion({ instanceId: id, owner: "enemy", attack, health, maxHealth: health, summonedTurn: 0 });
  const playerMinion = (id: string, { attack, health }: Stats, cardId = "ash-wolf") => minion({ instanceId: id, cardId, owner: "player", attack, health, maxHealth: health, summonedTurn: 0 });

  function attackRun(options: { enemy: Array<[string, Stats]>; player: Array<[string, Stats] | [string, Stats, string]>; completedBattles: number; heroHealth?: number; difficulty?: "normal" | "hard"; armor?: number }): RunState {
    const run = asEnemyTurn(createRun(970, "warrior", options.difficulty ?? "normal"));
    run.completedBattles = options.completedBattles;
    const battle = activeBattle(run);
    battle.enemyBoard = options.enemy.map(([id, stats]) => enemyMinion(id, stats));
    battle.playerBoard = options.player.map(([id, stats, cardId]) => playerMinion(id, stats, cardId));
    battle.enemyHand = [];
    battle.enemyStarterDeck = [];
    battle.enemyDrawPile = [];
    battle.enemyMana.current = 0;
    if (options.heroHealth !== undefined) battle.playerHero.health = options.heroHealth;
    if (options.armor !== undefined) battle.playerArmor = options.armor;
    return run;
  }

  it("never holds an attack back: every ready minion attacks, even into a bad trade", () => {
    // The wall has taunt, so the scout has no other legal target.
    const setup = (completedBattles: number) => attackRun({ enemy: [["scout", { attack: 2, health: 1 }]], player: [["wall", { attack: 1, health: 5 }, "warrior-vanguard"]], completedBattles });
    for (const completedBattles of [0, 1]) {
      const result = resolveEnemyTurn(setup(completedBattles));
      expect(result.battle?.enemyBoard).toHaveLength(0);
      expect(result.battle?.playerBoard[0]?.health).toBe(3);
    }
  });

  it("sends several ready minions at the hero as one all-attack action when the player board is empty", () => {
    const run = attackRun({ enemy: [["a", { attack: 2, health: 2 }], ["b", { attack: 3, health: 3 }], ["c", { attack: 1, health: 1 }]], player: [], completedBattles: 1 });
    const resolution = resolveEnemyTurnWithPlayback(run);
    const attackSteps = resolution.steps.filter(({ action }) => action.type === "attack" || action.type === "all-attack");
    expect(attackSteps).toHaveLength(1);
    const action = attackSteps[0]!.action;
    if (action.type !== "all-attack") throw new Error("Expected an all-attack action.");
    expect(action.attackers.map(({ attackerId }) => attackerId)).toEqual(["a", "b", "c"]);
    expect(action.targetId).toBe("player");
    expect(attackSteps[0]!.beforeRun.battle?.playerHero.health).toBe(30);
    expect(attackSteps[0]!.presentationRun.battle?.playerHero.health).toBe(24);
    expect(resolution.run.battle?.playerHero.health).toBe(24);
    expect(resolution.run.battle?.enemyBoard.every(({ hasAttacked }) => hasAttacked)).toBe(true);
  });

  it("keeps a single hero attack a normal attack and stops the all-attack at lethal damage", () => {
    const single = resolveEnemyTurnWithPlayback(attackRun({ enemy: [["solo", { attack: 2, health: 2 }]], player: [], completedBattles: 1 }));
    expect(single.steps.map(({ action }) => action.type)).toEqual(["attack"]);
    const lethal = resolveEnemyTurnWithPlayback(attackRun({ enemy: [["a", { attack: 3, health: 2 }], ["b", { attack: 3, health: 2 }], ["c", { attack: 3, health: 2 }]], player: [], heroHealth: 4, completedBattles: 0 }));
    expect(lethal.run.status).toBe("defeat");
    const action = lethal.steps.at(-1)!.action;
    if (action.type !== "all-attack") throw new Error("Expected an all-attack action.");
    expect(action.attackers.map(({ attackerId }) => attackerId)).toEqual(["a", "b"]);
  });

  it("still takes a good trade into a taunt minion", () => {
    const planned = resolveEnemyTurn(attackRun({ enemy: [["brute", { attack: 3, health: 3 }]], player: [["target", { attack: 2, health: 3 }, "warrior-vanguard"]], completedBattles: 1 }));
    expect(planned.battle?.playerBoard).toHaveLength(0);
    expect(planned.battle?.enemyBoard[0]).toMatchObject({ instanceId: "brute", health: 1 });
  });

  it("orders its attackers to clear the blocker first and reach the hero for lethal", () => {
    const setup = (completedBattles: number) => attackRun({
      enemy: [["heavy", { attack: 3, health: 3 }], ["light", { attack: 1, health: 1 }]],
      player: [["blocker", { attack: 1, health: 1 }, "warrior-vanguard"]],
      heroHealth: 3,
      completedBattles,
    });
    const greedy = resolveEnemyTurn(setup(0));
    expect(greedy.status).toBe("active");
    expect(greedy.battle?.playerHero.health).toBe(2);
    const planned = resolveEnemyTurn(setup(1));
    expect(planned.status).toBe("defeat");
  });

  it("attacks the hero with every ready minion when the player board is empty and accounts for armor", () => {
    const planned = resolveEnemyTurn(attackRun({ enemy: [["a", { attack: 2, health: 2 }], ["b", { attack: 3, health: 3 }]], player: [], armor: 2, completedBattles: 1 }));
    expect(planned.battle?.playerArmor).toBe(0);
    expect(planned.battle?.playerHero.health).toBe(30 - 3);
  });

  it("is deterministic and does not read the player's hand or draw pile", () => {
    const setup = () => attackRun({ enemy: [["a", { attack: 2, health: 2 }], ["b", { attack: 3, health: 1 }]], player: [["x", { attack: 2, health: 2 }], ["y", { attack: 1, health: 4 }]], completedBattles: 2 });
    const first = resolveEnemyTurn(setup());
    expect(resolveEnemyTurn(setup())).toEqual(first);
    const withHand = setup();
    activeBattle(withHand).hand = [instance("hidden", "eclipse")];
    activeBattle(withHand).drawPile = [instance("hidden-draw", "eclipse")];
    const other = resolveEnemyTurn(withHand);
    expect(other.battle?.enemyBoard).toEqual(first.battle?.enemyBoard);
    expect(other.battle?.playerBoard).toEqual(first.battle?.playerBoard);
  });

  it("never does worse than the greedy attack on generated boards and stays fast", () => {
    const value = (run: RunState): number => {
      const battle = run.battle;
      if (!battle) return 100_000;
      const worth = (entry: MinionState) => 3 * entry.attack + 2 * Math.max(0, entry.health);
      return battle.enemyBoard.reduce((total, entry) => total + worth(entry), 0)
        - 1.2 * battle.playerBoard.reduce((total, entry) => total + worth(entry), 0)
        + 4 * (30 - battle.playerHero.health);
    };
    let state = 12345;
    const next = (max: number) => { state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0; return state % max; };
    let worseCount = 0;
    const startedAt = Date.now();
    for (let sample = 0; sample < 200; sample += 1) {
      const makeSide = (count: number): Array<[string, Stats]> => Array.from({ length: count }, (_, index) => [`m${index}`, { attack: 1 + next(4), health: 1 + next(5) }]);
      const enemy = makeSide(1 + next(4)).map(([id, stats]) => [`e-${id}`, stats] as [string, Stats]);
      const player = makeSide(next(5)).map(([id, stats]) => [`p-${id}`, stats] as [string, Stats]);
      const greedy = value(resolveEnemyTurn(attackRun({ enemy, player, completedBattles: 0, difficulty: "hard" })));
      const planned = value(resolveEnemyTurn(attackRun({ enemy, player, completedBattles: 1, difficulty: "hard" })));
      if (planned < greedy - 1e-9) worseCount += 1;
    }
    expect(worseCount).toBe(0);
    expect(Date.now() - startedAt).toBeLessThan(5_000);
  });
});

describe("enemy card plan never idles while it can play (second battle onward)", () => {
  function behindOnBoardRun(difficulty: "normal" | "hard", completedBattles = 1): RunState {
    const run = asEnemyTurn(createRun(980, "warrior", difficulty));
    run.completedBattles = completedBattles;
    const battle = activeBattle(run);
    battle.enemyBoard = [];
    battle.playerBoard = [1, 2, 3, 4, 5].map((index) => minion({ instanceId: `strong-${index}`, owner: "player", attack: 6, health: 8, maxHealth: 8, summonedTurn: 0 }));
    battle.enemyHand = [instance("enemy-wolf", "ash-wolf"), instance("enemy-guard", "crypt-guard")];
    battle.enemyStarterDeck = [];
    battle.enemyDrawPile = [];
    battle.enemyMana = { current: 4, max: 10, temporary: 0 };
    battle.turnNumber = 3;
    return run;
  }

  it.each(["normal", "hard"] as const)("plays an affordable minion on %s even when the player's board is far stronger", (difficulty) => {
    const result = resolveEnemyTurn(behindOnBoardRun(difficulty));
    expect(result.battle?.enemyBoard.length ?? 0).toBeGreaterThan(0);
    expect(result.battle?.enemyMana.current).toBeLessThan(10);
  });

  it("plays everything it can afford: a Crypt Guard (2) and an Ash Wolf (1) are both played", () => {
    const result = resolveEnemyTurn(behindOnBoardRun("hard"));
    expect(result.battle?.enemyBoard.map(({ cardId }) => cardId).sort()).toEqual(["ash-wolf", "crypt-guard"]);
  });

  it("only leaves the hand untouched when nothing in it is useful", () => {
    const run = behindOnBoardRun("normal");
    activeBattle(run).turnNumber = 1;
    activeBattle(run).enemyHand = [instance("enemy-heal", "healing-mist")];
    const result = resolveEnemyTurn(run);
    expect(result.battle?.enemyBoard).toHaveLength(0);
    expect(result.battle?.enemyHand.map(({ cardId }) => cardId)).toEqual(["healing-mist"]);
  });
});

describe("enemy never casts a spell that would change nothing", () => {
  function enemyWith(cardIds: string[], completedBattles: number, mutate: (battle: BattleState) => void = () => undefined): RunState {
    const run = asEnemyTurn(createRun(990, "warrior", "hard"));
    run.completedBattles = completedBattles;
    const battle = activeBattle(run);
    battle.turnNumber = 10;
    battle.enemyBoard = [];
    battle.playerBoard = [];
    battle.enemyHand = cardIds.map((cardId, index) => instance(`enemy-${index}`, cardId));
    battle.enemyStarterDeck = [];
    battle.enemyDrawPile = [];
    mutate(battle);
    return run;
  }

  it.each([0, 1])("does not cast Healing Mist at full health (completed battles: %i) but does when hurt", (completedBattles) => {
    const full = resolveEnemyTurn(enemyWith(["healing-mist"], completedBattles));
    expect(full.battle?.enemyHand.map(({ cardId }) => cardId)).toEqual(["healing-mist"]);
    expect(full.battle?.enemyDiscardPile.some(({ cardId }) => cardId === "healing-mist")).toBe(false);

    const hurt = resolveEnemyTurn(enemyWith(["healing-mist"], completedBattles, (battle) => { battle.enemyHero.health = battle.enemyHero.maxHealth - 5; }));
    expect(hurt.battle?.enemyHand).toHaveLength(0);
    expect(hurt.battle?.enemyHero.health).toBe(hurt.battle!.enemyHero.maxHealth - 1);
  });

  it("does not heal a minion nobody damaged, and skips Mana Spring at maximum mana and Rune Surge with a full hand", () => {
    const unhurtMinion = resolveEnemyTurn(enemyWith(["life-thread"], 1, (battle) => { battle.enemyBoard = [minion({ instanceId: "fine", owner: "enemy", health: 4, maxHealth: 4, summonedTurn: 0 })]; }));
    expect(unhurtMinion.battle?.enemyHand.map(({ cardId }) => cardId)).toEqual(["life-thread"]);

    // On turn 10 the enemy starts at the 10-mana maximum, so the Spring (+1 for this turn, never above 10) stays in hand until something else has been paid for.
    const maxMana = resolveEnemyTurn(enemyWith(["mana-spring"], 1));
    expect(maxMana.battle?.enemyHand.map(({ cardId }) => cardId)).toEqual(["mana-spring"]);
    const afterSpending = resolveEnemyTurn(enemyWith(["mana-spring", "crypt-guard"], 1));
    expect(afterSpending.battle?.enemyHand).toHaveLength(0);
    // Crypt Guard cost 2 -> 8 left; the Spring's extra mana is temporary and expires with the turn.
    expect(afterSpending.battle?.enemyMana.current).toBe(8);
    // Earlier in the game (turn 3) the Spring has room and is cast right away.
    const early = resolveEnemyTurn(enemyWith(["mana-spring"], 1, (battle) => { battle.turnNumber = 3; }));
    expect(early.battle?.enemyHand).toHaveLength(0);
  });
});

describe("opening hand on a 1-mana first turn", () => {
  it("always holds a card that costs 1 or less, also after the redraw, and keeps 4 cards (3 and the turn-1 draw)", () => {
    for (const playerClass of ["warrior", "assassin", "demonist"] as const) {
      for (let seed = 1; seed <= 80; seed += 1) {
        const run = createRunWithRealMana(seed, playerClass);
        expect(run.battle?.hand).toHaveLength(4);
        expect(run.battle!.hand.some(({ cardId }) => CARD_BY_ID.get(cardId)!.cost <= 1)).toBe(true);
        const redrawn = redrawOpeningHand(run);
        expect(redrawn.battle?.hand).toHaveLength(4);
        expect(redrawn.battle!.hand.some(({ cardId }) => CARD_BY_ID.get(cardId)!.cost <= 1)).toBe(true);
        expect(new Set([...redrawn.battle!.hand, ...redrawn.battle!.drawPile].map(({ instanceId }) => instanceId)).size).toBe(30);
      }
    }
  });
});


describe("taunt", () => {
  const TAUNT_ID = "warrior-vanguard";

  function tauntRun(options: { difficulty?: "normal" | "hard"; completedBattles?: number } = {}): RunState {
    const run = copyRun(createRun(1700, "warrior", options.difficulty ?? "normal"));
    run.completedBattles = options.completedBattles ?? 0;
    const battle = activeBattle(run);
    battle.turnNumber = 3;
    battle.playerMana = { current: 10, max: 10, temporary: 0 };
    battle.hand = [];
    battle.playerBoard = [minion({ instanceId: "mine", cardId: "ash-wolf", attack: 3, health: 5, maxHealth: 5, summonedTurn: 0 })];
    battle.enemyBoard = [
      minion({ instanceId: "plain", owner: "enemy", cardId: "ash-wolf", attack: 2, health: 3, maxHealth: 3, summonedTurn: 0 }),
      minion({ instanceId: "tank", owner: "enemy", cardId: TAUNT_ID, attack: 1, health: 4, maxHealth: 4, summonedTurn: 0 }),
    ];
    return run;
  }

  it("marks exactly the ten chosen minions with taunt and shows it in their text", () => {
    expect(TAUNT_CARD_IDS.size).toBe(10);
    for (const card of CARD_CATALOG) {
      const marked = card.minion?.taunt === true;
      expect(marked).toBe(TAUNT_CARD_IDS.has(card.id));
      expect(hasTaunt({ cardId: card.id })).toBe(marked);
      if (marked) expect(card.description.startsWith("도발")).toBe(true);
    }
    expect(CARD_BY_ID.get("demonist-imp-caller")?.description).toBe("도발. 전투의 함성: 하급 임프 1마리를 소환합니다.");
    expect(CARD_BY_ID.get(TAUNT_ID)?.description).toBe("도발");
  });

  it("lets the player attack only taunt minions while one stands, and the hero and everything else afterwards", () => {
    const run = tauntRun();
    const battle = activeBattle(run);
    expect(getLegalAttackTargets(battle, "player")).toEqual({ minionIds: ["tank"], heroAllowed: false });
    expect(() => attackWithMinion(run, "mine", "plain")).toThrowError(expect.objectContaining({ code: "INVALID_TARGET" }));
    expect(() => attackWithMinion(run, "mine", battle.enemyHero.id)).toThrowError(expect.objectContaining({ code: "INVALID_TARGET" }));
    const killed = attackWithMinion({ ...run, battle: { ...battle, playerBoard: [minion({ instanceId: "mine", attack: 6, health: 5, maxHealth: 5, summonedTurn: 0 })] } }, "mine", "tank");
    expect(killed.battle?.enemyBoard.map(({ instanceId }) => instanceId)).toEqual(["plain"]);
    expect(getLegalAttackTargets(killed.battle!, "player")).toEqual({ minionIds: ["plain"], heroAllowed: true });
  });

  it("lets attackers reach the hero past minions without taunt", () => {
    const run = tauntRun();
    activeBattle(run).enemyBoard = [minion({ instanceId: "plain", owner: "enemy", cardId: "ash-wolf", health: 3, maxHealth: 3 }), minion({ instanceId: "plain-2", owner: "enemy", cardId: "ash-wolf", health: 3, maxHealth: 3 })];
    const heroHealth = activeBattle(run).enemyHero.health;
    const hit = attackWithMinion(run, "mine", activeBattle(run).enemyHero.id);
    expect(hit.battle?.enemyHero.health).toBe(heroHealth - 3);
    expect(hit.battle?.enemyBoard).toHaveLength(2);
  });

  it("ignores taunt for spells", () => {
    const run = tauntRun();
    activeBattle(run).hand = [instance("shard", "meteor-shard")];
    const next = castSpell(run, "shard", "plain");
    expect(next.battle?.enemyBoard.map(({ instanceId }) => instanceId)).toEqual(["tank"]);
  });

  it.each([0, 1])("makes the enemy attack taunt minions first (completed battles: %i)", (completedBattles) => {
    const run = asEnemyTurn(tauntRun({ completedBattles }));
    const battle = activeBattle(run);
    battle.enemyMana.current = 0;
    battle.enemyHand = [];
    battle.enemyBoard = [minion({ instanceId: "e1", owner: "enemy", cardId: "ash-wolf", attack: 4, health: 4, maxHealth: 4, summonedTurn: 0 })];
    battle.playerBoard = [
      minion({ instanceId: "squishy", cardId: "ash-wolf", attack: 1, health: 1, maxHealth: 1, summonedTurn: 0 }),
      minion({ instanceId: "guard", cardId: TAUNT_ID, attack: 1, health: 6, maxHealth: 6, summonedTurn: 0 }),
    ];
    const resolution = resolveEnemyTurnWithPlayback(run);
    const attack = resolution.steps.find(({ action }) => action.type === "attack")?.action;
    expect(attack).toMatchObject({ type: "attack", attackerId: "e1", targetId: "guard" });
    expect(resolution.run.battle?.playerHero.health).toBe(30);
  });

  it.each([0, 1])("lets the enemy hit the hero past minions without taunt when it is lethal (completed battles: %i)", (completedBattles) => {
    const run = asEnemyTurn(tauntRun({ completedBattles }));
    const battle = activeBattle(run);
    battle.enemyMana.current = 0;
    battle.enemyHand = [];
    battle.playerHero.health = 4;
    battle.enemyBoard = [minion({ instanceId: "e1", owner: "enemy", cardId: "ash-wolf", attack: 4, health: 4, maxHealth: 4, summonedTurn: 0 })];
    battle.playerBoard = [minion({ instanceId: "blocker", cardId: "ash-wolf", attack: 1, health: 6, maxHealth: 6, summonedTurn: 0 })];
    expect(resolveEnemyTurn(run).status).toBe("defeat");
  });
});

describe("turn order pick and the Coin", () => {
  const pending = (seed: number, playerClass: "warrior" | "assassin" | "demonist" = "warrior") =>
    createRunWithRealMana(seed, playerClass, "normal", { pickTurnOrder: true });
  const indexOf = (run: RunState, role: "first" | "second"): 0 | 1 => (activeBattle(run).turnOrderCards![0] === role ? 0 : 1);

  it("starts a battle without hands and refuses every action until a card is picked", () => {
    const run = pending(1801);
    const battle = activeBattle(run);
    expect(battle.firstSide).toBeNull();
    expect([...battle.turnOrderCards!].sort()).toEqual(["first", "second"]);
    expect(battle.hand).toHaveLength(0);
    expect(battle.enemyHand).toHaveLength(0);
    expect(battle.drawPile).toHaveLength(30);
    expect(battle.enemyDrawPile).toHaveLength(30);
    const pendingError = expect.objectContaining({ code: "TURN_ORDER_PENDING" });
    expect(() => endPlayerTurn(run)).toThrowError(pendingError);
    expect(() => playMinion(run, "x")).toThrowError(pendingError);
    expect(() => redrawOpeningHand(run)).toThrowError(pendingError);
    expect(() => resolveEnemyTurn(run)).toThrowError(pendingError);
    const chosen = chooseTurnOrder(run, 0);
    expect(() => chooseTurnOrder(chosen, 1)).toThrowError(expect.objectContaining({ code: "INVALID_ACTION" }));
    expect(activeBattle(run).firstSide).toBeNull(); // the input run is untouched
  });

  it("places the roles randomly behind the two cards, deterministically per seed", () => {
    let firstOnLeft = 0;
    for (let seed = 1; seed <= 200; seed += 1) {
      const roles = activeBattle(pending(seed)).turnOrderCards!;
      expect(roles).toEqual(activeBattle(pending(seed)).turnOrderCards);
      if (roles[0] === "first") firstOnLeft += 1;
    }
    expect(firstOnLeft).toBeGreaterThan(70);
    expect(firstOnLeft).toBeLessThan(130);
  });

  it("deals 3 cards plus the turn-1 draw to the first player and 4 cards plus the Coin to the enemy", () => {
    const run = pending(1802);
    const first = chooseTurnOrder(run, indexOf(run, "first"));
    const battle = activeBattle(first);
    expect(battle.firstSide).toBe("player");
    expect(battle.activeSide).toBe("player");
    expect(battle.turnNumber).toBe(1);
    expect(battle.playerMana).toEqual({ current: 1, max: 1, temporary: 0 });
    expect(battle.hand).toHaveLength(4);
    expect(battle.hand.some(({ cardId }) => cardId === "the-coin")).toBe(false);
    expect(battle.drawPile).toHaveLength(26);
    expect(battle.enemyHand).toHaveLength(5);
    expect(battle.enemyHand.filter(({ cardId }) => cardId === "the-coin")).toHaveLength(1);
    expect(battle.enemyDrawPile).toHaveLength(26);
  });

  it("makes the enemy play first when the player is second: 4 cards and the Coin for the player, mana 1 for both", () => {
    const run = pending(1803);
    const second = chooseTurnOrder(run, indexOf(run, "second"));
    const dealt = activeBattle(second);
    expect(dealt.firstSide).toBe("enemy");
    expect(dealt.activeSide).toBe("enemy");
    expect(dealt.hand).toHaveLength(5);
    expect(dealt.hand.filter(({ cardId }) => cardId === "the-coin")).toHaveLength(1);
    expect(dealt.enemyHand).toHaveLength(3);
    expect(dealt.turnNumber).toBe(1);

    const afterEnemy = resolveEnemyTurn(second);
    const battle = activeBattle(afterEnemy);
    expect(battle.activeSide).toBe("player");
    expect(battle.turnNumber).toBe(1);
    expect(battle.enemyMana.max).toBe(1);
    expect(battle.playerMana).toEqual({ current: 1, max: 1, temporary: 0 });
    expect(battle.hand).toHaveLength(6); // 4 cards, the Coin and the turn-1 draw
  });

  it.each(["first", "second"] as const)("gives each side the mana of its own n-th turn, min(10, n), when the player is %s", (role) => {
    const run = pending(1804 + (role === "first" ? 0 : 1));
    let current = chooseTurnOrder(run, indexOf(run, role));
    if (role === "second") current = resolveEnemyTurn(current);
    const seen: Array<{ player: number; enemy: number }> = [];
    for (let turn = 1; turn <= 12 && current.status === "active"; turn += 1) {
      const battle = activeBattle(current);
      battle.playerHero.health = 30;
      battle.enemyBoard = [];
      battle.enemyHero.health = battle.enemyHero.maxHealth;
      expect(battle.playerMana.max).toBe(Math.min(10, turn));
      expect(battle.turnNumber).toBe(turn);
      current = endPlayerTurn(current);
      if (current.status !== "active") break;
      // The enemy's turn n has just been played (first) or the enemy's turn n + 1 (second): its mana cap is its own turn count.
      seen.push({ player: battle.playerMana.max, enemy: activeBattle(current).enemyMana.max });
    }
    for (const [index, entry] of seen.entries()) {
      expect(entry.enemy).toBe(Math.min(10, role === "first" ? index + 1 : index + 2));
    }
  });

  it("lets a minion summoned in a side's turn attack only on that side's next turn, for both orders", () => {
    for (const role of ["first", "second"] as const) {
      const run = pending(1810);
      let current = chooseTurnOrder(run, indexOf(run, role));
      if (role === "second") current = resolveEnemyTurn(current);
      const battle = activeBattle(current);
      battle.playerMana = { current: 10, max: 10, temporary: 0 };
      battle.hand = [instance("wolf", "ash-wolf")];
      const summoned = playMinion(current, "wolf");
      expect(() => attackWithMinion(summoned, "wolf", activeBattle(summoned).enemyHero.id)).toThrowError(expect.objectContaining({ code: "INVALID_ACTION" }));
      const wolf = activeBattle(summoned).playerBoard[0]!;
      const later = copyRun(summoned);
      activeBattle(later).turnNumber = wolf.summonedTurn + 1;
      expect(attackWithMinion(later, "wolf", activeBattle(later).enemyHero.id).battle?.playerBoard[0]?.hasAttacked).toBe(true);
    }
  });

  it("makes the Coin give +1 mana for this turn and then leave the game", () => {
    const run = pending(1820);
    const second = resolveEnemyTurn(chooseTurnOrder(run, indexOf(run, "second")));
    const battle = activeBattle(second);
    const coin = battle.hand.find(({ cardId }) => cardId === "the-coin")!;
    const cast = castSpell(second, coin.instanceId);
    const after = activeBattle(cast);
    expect(after.playerMana).toEqual({ current: 2, max: 1, temporary: 1 });
    expect(after.hand.some(({ cardId }) => cardId === "the-coin")).toBe(false);
    expect(after.discardPile.some(({ cardId }) => cardId === "the-coin")).toBe(false);
    // The extra mana is gone when the turn ends.
    const nextTurn = endPlayerTurn(cast);
    expect(activeBattle(nextTurn).playerMana).toEqual({ current: 2, max: 2, temporary: 0 });
  });

  it("keeps a card of cost 1 or less in a 4-card opening hand and keeps the Coin through the redraw", () => {
    for (const playerClass of ["warrior", "assassin", "demonist"] as const) {
      for (let seed = 1; seed <= 60; seed += 1) {
        const run = pending(seed, playerClass);
        const second = chooseTurnOrder(run, indexOf(run, "second"));
        const hand = activeBattle(second).hand;
        expect(hand.filter(({ cardId }) => cardId !== "the-coin").some(({ cardId }) => CARD_BY_ID.get(cardId)!.cost <= 1)).toBe(true);
        const played = resolveEnemyTurn(second);
        const redrawn = redrawOpeningHand(played);
        const redrawnBattle = activeBattle(redrawn);
        expect(redrawnBattle.hand).toHaveLength(activeBattle(played).hand.length);
        expect(redrawnBattle.hand.filter(({ cardId }) => cardId === "the-coin")).toHaveLength(1);
        expect(redrawnBattle.hand.filter(({ cardId }) => cardId !== "the-coin").some(({ cardId }) => CARD_BY_ID.get(cardId)!.cost <= 1)).toBe(true);
      }
    }
  });

  it("treats a saved battle without a turn-order field as player-first and keeps a pending one pending", () => {
    const legacy = copyRun(createRun(1830));
    delete activeBattle(legacy).firstSide;
    delete activeBattle(legacy).playerFatigue;
    expect(hydrateRunForCurrentBattle(legacy).battle?.firstSide).toBe("player");
    const waiting = copyRun(pending(1831));
    delete activeBattle(waiting).playerFatigue;
    expect(hydrateRunForCurrentBattle(waiting).battle?.firstSide).toBeNull();
  });

  it("lets the enemy use its Coin", () => {
    const run = asEnemyTurn(createRun(1840));
    const battle = activeBattle(run);
    battle.turnNumber = 3;
    battle.enemyMana = { current: 3, max: 3, temporary: 0 };
    battle.enemyHand = [instance("enemy-coin", "the-coin"), instance("enemy-big", "moon-stag")];
    run.completedBattles = 1;
    const result = resolveEnemyTurn(run);
    // Moon Stag costs 5: with 3 mana and the Coin the enemy still cannot pay, so it keeps both cards; with 4 it plays both.
    expect(result.battle?.enemyBoard).toHaveLength(0);
    const richer = copyRun(run);
    activeBattle(richer).enemyMana = { current: 4, max: 4, temporary: 0 };
    activeBattle(richer).turnNumber = 4;
    const played = resolveEnemyTurn(richer);
    expect(played.battle?.enemyBoard.map(({ cardId }) => cardId)).toEqual(["moon-stag"]);
    expect(played.battle?.enemyDiscardPile.some(({ cardId }) => cardId === "the-coin")).toBe(false);
  });
});
