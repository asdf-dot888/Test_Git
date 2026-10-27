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
} from "./catalog.js";
import {
  advanceRun,
  acknowledgeVictory,
  attackAllReadyMinions,
  attackWithMinion,
  castSpell,
  chooseReward,
  chooseRewardAndDiscard,
  createRun,
  discardBeforeDraw,
  endPlayerTurn,
  endPlayerTurnWithPlayback,
  fuseMinions,
  gameConstants,
  hydrateRunForCurrentBattle,
  playMinion,
  resolveEnemyTurn,
  resolveEnemyTurnWithPlayback,
  skipReward,
  startBattle,
  useHeroPower,
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
    expect(CARD_CATALOG).toHaveLength(77);
    expect(new Set(CARD_CATALOG.map((card) => card.id)).size).toBe(77);
    expect(CARD_CATALOG.filter((card) => card.kind === "minion")).toHaveLength(53);
    expect(CARD_CATALOG.filter((card) => card.kind === "spell")).toHaveLength(24);
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
    expect(first).toEqual(second);
    expect(first.encounters).toHaveLength(12);
    for (let phase = 1; phase <= 3; phase += 1) {
      const encounters = first.encounters.filter((encounter) => encounter.phase === phase);
      expect(encounters.map((encounter) => encounter.kind)).toEqual(["normal", "normal", "normal", "boss"]);
      expect(encounters[3]?.enemyId).toBe(BOSSES[phase - 1]?.id);
    }
    expect(first.battle?.hand).toHaveLength(3);
    expect(first.battle?.playerMana).toEqual({ current: 5, max: 10, temporary: 0 });
    expect(first.battle?.enemyMana).toEqual({ current: 5, max: 10, temporary: 0 });
    expect(first.battle?.enemyStarterDeck).toHaveLength(30);
    expect(first.battle?.enemyHand).toHaveLength(3);
    expect(first.battle?.enemyDrawPile).toHaveLength(27);
    expect(first.battle?.playerHero.health).toBe(30);
    expect(first.battle).not.toHaveProperty("pendingEnemyCharge");
    expect(first.starterDeck).toHaveLength(30);
    expect(first.deck).toHaveLength(30);
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
    for (let seed = 1; seed <= 20; seed += 1) {
      const generated = createRun(seed).battle!.enemyStarterDeck;
      expect(generated).toHaveLength(30);
      expect(generated.some((card) => card.cardId === "mana-spring")).toBe(false);
      const generatedCounts = new Map<string, number>();
      for (const card of generated) generatedCounts.set(card.cardId, (generatedCounts.get(card.cardId) ?? 0) + 1);
      expect([...generatedCounts.values()].every((count) => count <= 2)).toBe(true);
    }
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
    expect(hydrated.battle?.enemyMana).toEqual({ current: 5, max: 10, temporary: 0 });
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
    expect(hydrated.battle?.playerMana).toEqual({ current: 5, max: 10, temporary: 0 });
    expect(hydrated.battle?.enemyMana).toEqual({ current: 5, max: 10, temporary: 0 });

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
    expect(run.battle?.playerArmor).toBe(2);
    expect(run.battle?.playerMana.current).toBe(3);

    for (const [index, attack] of [2, 5].entries()) {
      const battle = activeBattle(run);
      battle.enemyHand = [];
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
    expect(hitHero.battle?.enemyHero.health).toBe(8);
    expect(hitHero.battle?.enemyBoard).toHaveLength(1);

    const minionTarget = copyRun(createRun(1221, "assassin"));
    activeBattle(minionTarget).enemyBoard.push({ instanceId: "victim", cardId: "ash-wolf", owner: "enemy", attack: 1, health: 2, maxHealth: 2, summonedTurn: 0, hasAttacked: false });
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

  it("spends three shards for a deterministic demon, preserves state on failure, and resets resources between battles", () => {
    const base = createRun(1240, "demonist");
    activeBattle(base).soulShards = 4;
    const first = useHeroPower(base);
    const secondRun = createRun(1240, "demonist");
    activeBattle(secondRun).soulShards = 4;
    const second = useHeroPower(secondRun);
    expect(first.battle?.playerBoard[0]?.cardId).toBe(second.battle?.playerBoard[0]?.cardId);
    expect(first.battle?.playerBoard[0]?.cardId).toMatch(/^demon-/);
    expect(first.battle?.soulShards).toBe(1);
    expect(first.battle?.playerMana.current).toBe(3);

    const tooFew = copyRun(base);
    activeBattle(tooFew).soulShards = 2;
    const tooFewBefore = copyRun(tooFew);
    expect(() => useHeroPower(tooFew)).toThrowError(expect.objectContaining({ code: "INVALID_ACTION" }));
    expect(tooFew).toEqual(tooFewBefore);

    const fullBoard = copyRun(base);
    activeBattle(fullBoard).playerBoard = Array.from({ length: 5 }, (_, index) => minion({ instanceId: `full-${index}` }));
    const fullBefore = copyRun(fullBoard);
    expect(() => useHeroPower(fullBoard)).toThrowError(expect.objectContaining({ code: "MAX_BOARD" }));
    expect(fullBoard).toEqual(fullBefore);

    const transitioned = skipReward(winCurrentBattle(useHeroPower(createRun(1241, "warrior"))));
    const nextBattle = advanceRun(transitioned, 1242);
    expect(nextBattle.battle?.playerArmor).toBe(0);
    expect(nextBattle.battle?.soulShards).toBe(0);
    expect(nextBattle.battle?.heroPowerUsed).toBe(false);
  });

  it("hydrates class resources for an older active schema-v1 battle", () => {
    const oldRun = copyRun(createRun(1249));
    const oldBattle = activeBattle(oldRun) as unknown as Record<string, unknown>;
    delete oldBattle.playerArmor;
    delete oldBattle.soulShards;
    delete oldBattle.heroPowerUsed;
    const hydrated = hydrateRunForCurrentBattle(oldRun);
    expect(hydrated.battle).toMatchObject({ playerArmor: 0, soulShards: 0, heroPowerUsed: false });
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
      const cast = castSpell(run, "random-spell", "enemy-hero");
      const amount = 30 - cast.battle!.enemyHero.health;
      dealt.add(amount);
      expect(cast.battle?.enemyBoard).toHaveLength(1);
      expect(cast.battle?.playerMana.current).toBe(3);
      expect(cast.battle?.discardPile.some(({ instanceId }) => instanceId === "random-spell")).toBe(true);
      if (amount === 0) zeroRun = cast;
    }
    expect([...dealt].sort()).toEqual([0, 1, 2, 3, 4, 5]);
    expect(zeroRun?.battle?.playerMana.current).toBe(3);
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
    expect(result.battle?.playerMana.current).toBe(2);

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
    battle.enemyMana.current = 5;
    battle.enemyHand = [instance("enemy-theft", "stolen-fate")];
    battle.drawPile = [instance("player-draw-identity", "eclipse")];
    const resolution = resolveEnemyTurnWithPlayback(run);
    expect(resolution.run.battle?.enemyHand).toContainEqual(instance("player-draw-identity", "eclipse"));
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
    ];
    const fused = fuseMinions(run, "full-first", "full-second");
    expect(fused.battle?.playerBoard).toHaveLength(4);
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

  it("attacks with ready minions in board order and stops at lethal", () => {
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
    const result = attackAllReadyMinions(run);
    expect(result.battle?.enemyHero.health).toBe(0);
    expect(result.battle?.playerBoard.map(({ hasAttacked }) => hasAttacked)).toEqual([true, true, false]);
    expect(run.battle?.enemyHero.health).toBe(4);
  });

  it("rejects All Attack when enemy minions block the hero or no minion is ready", () => {
    const blocked = copyRun(createRun(62));
    const blockedBattle = activeBattle(blocked);
    blockedBattle.turnNumber = 2;
    blockedBattle.playerBoard = [minion({ instanceId: "ready" })];
    blockedBattle.enemyBoard = [{ ...minion({ instanceId: "enemy", owner: "enemy" }), attack: 1 }];
    expect(() => attackAllReadyMinions(blocked)).toThrowError(expect.objectContaining({ code: "INVALID_TARGET" }));

    const noneReady = copyRun(createRun(63));
    activeBattle(noneReady).playerBoard = [minion({ instanceId: "new", summonedTurn: 1 })];
    expect(() => attackAllReadyMinions(noneReady)).toThrowError(expect.objectContaining({ code: "INVALID_ACTION" }));
  });

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
    expect(next.battle?.playerMana).toEqual({ current: 5, max: 10, temporary: 0 });
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

  it("recovers mana by turn tier and caps at ten", () => {
    let run = createRun(22);
    let expectedMana = 5;
    for (let turn = 2; turn <= 12; turn += 1) {
      activeBattle(run).playerHero.health = 30;
      activeBattle(run).hand = [];
      run = endPlayerTurn(run);
      const recovery = turn <= 3 ? 1 : turn <= 6 ? 2 : 3;
      expectedMana = Math.min(10, expectedMana + recovery);
      expect(run.battle?.playerMana).toEqual({ current: expectedMana, max: 10, temporary: 0 });
    }
    expect(run.battle?.playerMana).toEqual({ current: 10, max: 10, temporary: 0 });
    expect(run.battle?.turnNumber).toBe(12);
  });

  it("preserves unspent mana, regenerates from zero, and normalizes legacy caps", () => {
    const preserved = copyRun(createRun(221));
    activeBattle(preserved).playerHero.health = 30;
    activeBattle(preserved).hand = [];
    const next = endPlayerTurn(preserved);
    expect(next.battle?.playerMana).toEqual({ current: 6, max: 10, temporary: 0 });

    const empty = copyRun(createRun(222));
    activeBattle(empty).playerMana.current = 0;
    activeBattle(empty).playerHero.health = 30;
    activeBattle(empty).hand = [];
    expect(endPlayerTurn(empty).battle?.playerMana).toEqual({ current: 1, max: 10, temporary: 0 });

    const legacy = copyRun(createRun(223));
    activeBattle(legacy).playerMana = { current: 5, max: 6, temporary: 0 };
    activeBattle(legacy).playerHero.health = 30;
    activeBattle(legacy).hand = [];
    expect(endPlayerTurn(legacy).battle?.playerMana).toEqual({ current: 6, max: 10, temporary: 0 });
  });

  it.each([
    [2, 1],
    [3, 1],
    [4, 2],
    [6, 2],
    [7, 3],
  ])("recovers %i-turn tier amount on the incoming player turn", (incomingTurn, recovery) => {
    const run = copyRun(createRun(300 + incomingTurn));
    const battle = activeBattle(run);
    battle.turnNumber = incomingTurn - 1;
    battle.playerMana.current = 0;
    battle.playerHero.health = 30;
    battle.hand = [];

    const next = endPlayerTurn(run);
    expect(next.battle?.turnNumber).toBe(incomingTurn);
    expect(next.battle?.playerMana).toEqual({ current: recovery, max: 10, temporary: 0 });
  });

  it("adds the incoming turn recovery to carried mana and preserves enemy +1 recovery", () => {
    const run = copyRun(createRun(307));
    const battle = activeBattle(run);
    battle.turnNumber = 6;
    battle.playerMana.current = 4;
    battle.playerHero.health = 30;
    battle.hand = [];
    battle.enemyMana.current = 0;
    battle.enemyHand = [instance("enemy-eclipse", "eclipse")];

    const next = endPlayerTurn(run);
    expect(next.battle?.playerMana).toEqual({ current: 7, max: 10, temporary: 0 });
    expect(next.battle?.enemyMana).toEqual({ current: 1, max: 10, temporary: 0 });
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

  it("gains one current mana from mana spring without exceeding the maximum", () => {
    for (const currentMana of [5, 9, 10]) {
      const run = copyRun(createRun(500 + currentMana));
      const battle = activeBattle(run);
      const card = instance(`mana-spring-${currentMana}`, "mana-spring");
      battle.playerMana.current = currentMana;
      battle.hand = [card];

      const cast = castSpell(run, card.instanceId);
      expect(cast.battle?.playerMana).toEqual({ current: Math.min(10, currentMana + 1), max: 10, temporary: 0 });
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
    expect(castSpell(springRun, "spring").battle?.playerMana).toEqual({ current: 10, max: 10, temporary: 2 });
  });

  it("expires unused player temporary mana at turn end while retaining regular mana", () => {
    const run = copyRun(createRun(505));
    const battle = activeBattle(run);
    battle.playerMana = { current: 8, max: 10, temporary: 3 };
    battle.hand = [];

    const nextTurn = endPlayerTurn(run);
    expect(nextTurn.battle?.turnNumber).toBe(2);
    expect(nextTurn.battle?.playerMana).toEqual({ current: 6, max: 10, temporary: 0 });
  });

  it("uses enemy-owned discard and temporary mana, then expires its remainder", () => {
    const run = asEnemyTurn(createRun(506));
    const battle = activeBattle(run);
    const bargain = instance("enemy-bargain", "soul-bargain");
    const candidate = instance("enemy-discard-candidate", "eclipse");
    battle.enemyMana = { current: 1, max: 10, temporary: 0 };
    battle.enemyHand = [bargain, candidate];
    battle.enemyStarterDeck = Array.from({ length: 30 }, (_, index) => instance(`enemy-high-${index}`, "eclipse"));
    battle.enemyDrawPile = [];

    const resolution = resolveEnemyTurnWithPlayback(run);
    expect(resolution.run.battle?.enemyDiscardPile).toContainEqual(candidate);
    expect(resolution.run.battle?.discardPile).not.toContainEqual(candidate);
    const spellStep = resolution.steps.find((step) => step.action.type === "cast-spell" && step.action.cardId === "soul-bargain");
    expect(spellStep?.presentationRun.battle?.enemyMana).toEqual({ current: 3, max: 10, temporary: 3 });
    expect(resolution.run.battle?.enemyMana).toEqual({ current: 0, max: 10, temporary: 0 });
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
  it("returns ordered action snapshots while preserving the legacy end-turn result", () => {
    const run = copyRun(createRun(236));
    const battle = activeBattle(run);
    battle.enemyId = "boss-grave-king";
    battle.turnNumber = 3;
    battle.enemyMana.current = 1;
    battle.enemyHand = [instance("boss-minion", "ash-wolf")];
    battle.enemyDrawPile = [instance("boss-expensive", "eclipse")];
    battle.enemyBoard = [minion({ instanceId: "boss-attacker", owner: "enemy", attack: 2, health: 5, maxHealth: 5, summonedTurn: 0 })];
    battle.playerBoard = [minion({ instanceId: "player-target", attack: 1, health: 5, maxHealth: 5 })];
    const inputSnapshot = copyRun(run);

    const resolution = endPlayerTurnWithPlayback(run);
    const legacyResult = endPlayerTurn(run);

    expect(resolution.run).toEqual(legacyResult);
    expect(run).toEqual(inputSnapshot);
    expect(resolution.steps.map((step) => step.action.type)).toEqual(["play-minion", "boss-area", "attack"]);
    expect(resolution.steps[0]?.action).toMatchObject({ type: "play-minion", instanceId: "boss-minion" });
    expect(resolution.steps[1]?.presentationRun.battle?.playerBoard[0]?.health).toBe(4);
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
    battle.enemyDrawPile = [instance("boss-expensive", "eclipse")];

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
    activeBattle(lethalSpell).enemyDrawPile = [instance("expensive-spell", "eclipse")];
    activeBattle(lethalSpell).playerHero.health = 2;

    const spellResult = resolveEnemyTurnWithPlayback(lethalSpell);
    expect(spellResult.run).toMatchObject({ status: "defeat", battle: null });
    expect(spellResult.steps.at(-1)?.action.type).toBe("cast-spell");
    expect(spellResult.steps.at(-1)?.presentationRun).toMatchObject({ status: "active", battle: { playerHero: { health: 0 } } });

    const lethalAttack = asEnemyTurn(createRun(239));
    activeBattle(lethalAttack).enemyMana.current = 0;
    activeBattle(lethalAttack).enemyHand = [];
    activeBattle(lethalAttack).enemyDrawPile = [instance("expensive-card", "eclipse")];
    activeBattle(lethalAttack).enemyBoard = [minion({ instanceId: "lethal-attacker", owner: "enemy", attack: 3, summonedTurn: 0 })];
    activeBattle(lethalAttack).playerHero.health = 2;

    const attackResult = resolveEnemyTurnWithPlayback(lethalAttack);
    expect(attackResult.run).toMatchObject({ status: "defeat", battle: null });
    expect(attackResult.steps.at(-1)?.action).toMatchObject({ type: "attack", targetId: "player" });
    expect(attackResult.steps.at(-1)?.presentationRun.battle?.playerHero.health).toBe(0);

    const lethalArea = asEnemyTurn(createRun(240));
    activeBattle(lethalArea).enemyId = "boss-grave-king";
    activeBattle(lethalArea).turnNumber = 3;
    activeBattle(lethalArea).enemyMana.current = 0;
    activeBattle(lethalArea).enemyHand = [];
    activeBattle(lethalArea).enemyDrawPile = [instance("area-expensive-card", "eclipse")];
    activeBattle(lethalArea).playerHero.health = 1;

    const areaResult = resolveEnemyTurnWithPlayback(lethalArea);
    expect(areaResult.run).toMatchObject({ status: "defeat", battle: null });
    expect(areaResult.steps.at(-1)?.action.type).toBe("boss-area");
    expect(areaResult.steps.at(-1)?.presentationRun.battle?.playerHero.health).toBe(0);
  });

  it("plays multiple affordable cards with refreshed enemy mana and waits to attack with new minions", () => {
    const run = copyRun(createRun(48));
    const battle = activeBattle(run);
    battle.enemyHand = [instance("enemy-wolf", "ash-wolf"), instance("enemy-guard", "crypt-guard"), instance("enemy-raven", "dusk-raven")];
    battle.enemyDrawPile = [instance("enemy-expensive", "eclipse")];
    const result = endPlayerTurn(run);
    expect(result.battle?.enemyMana).toEqual({ current: 0, max: 10, temporary: 0 });
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
    expect(next.battle?.playerMana).toEqual({ current: 5, max: 10, temporary: 0 });
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

