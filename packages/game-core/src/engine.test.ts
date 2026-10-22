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

  it("has six normal enemies and three phase bosses with valid actions", () => {
    expect(NORMAL_ENEMIES).toHaveLength(6);
    expect(BOSSES).toHaveLength(3);
    for (const enemy of [...NORMAL_ENEMIES, ...BOSSES]) {
      expect(ENEMY_BY_ID.has(enemy.id)).toBe(true);
      expect(enemy.maxHealth).toBeGreaterThan(0);
      expect(enemy.actions.some((action) => action.kind === "heroDamage")).toBe(true);
      expect(enemy.actions.some((action) => action.kind === "summon")).toBe(true);
      expect(enemy.tactics.profile).toBeTruthy();
      expect(enemy.tactics.chargeTrigger).toBeTruthy();
      expect([1, 2]).toContain(enemy.tactics.chargeDelayTurns);
      expect(enemy.tactics.chargeDamage).toBeGreaterThan(0);
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
    expect(first.battle?.playerMana).toEqual({ current: 5, max: 10 });
    expect(first.battle?.playerHero.health).toBe(30);
    expect(first.battle?.pendingEnemyCharge).toBeNull();
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
    const loss = resolveEnemyTurn(asEnemyTurn(defeated));
    expect(loss.status).toBe("defeat");
    expect(loss.battle).toBeNull();
  });

  it("resolves each boss's unique hidden effect", () => {
    const bloodRun = asEnemyTurn(createRun(81));
    const bloodBattle = activeBattle(bloodRun);
    bloodBattle.enemyId = "boss-blood-matron";
    bloodBattle.enemyHero.health = 10;
    const blood = resolveEnemyTurn(bloodRun);
    expect(blood.battle?.playerHero.health).toBe(27);
    expect(blood.battle?.enemyHero.health).toBe(13);

    const boneRun = asEnemyTurn(createRun(82));
    const boneBattle = activeBattle(boneRun);
    boneBattle.enemyId = "boss-grave-king";
    boneBattle.playerBoard = [minion({ instanceId: "storm-victim", health: 1, maxHealth: 1 }), minion({ instanceId: "storm-victim-2", health: 1, maxHealth: 1 })];
    const bone = resolveEnemyTurn(boneRun);
    expect(bone.battle?.playerHero.health).toBe(28);
    expect(bone.battle?.playerBoard).toHaveLength(0);

    const voidRun = asEnemyTurn(createRun(83));
    const voidBattle = activeBattle(voidRun);
    voidBattle.enemyId = "boss-void-titan";
    voidBattle.playerBoard = [minion({ instanceId: "pulse-victim", health: 3, maxHealth: 3 }), minion({ instanceId: "pulse-victim-2", health: 3, maxHealth: 3 })];
    const pulse = resolveEnemyTurn(voidRun);
    expect(pulse.battle?.playerHero.health).toBe(26);
    expect(pulse.battle?.playerBoard.map((entry) => entry.health)).toEqual([1, 1]);
  });

  it("prioritizes guaranteed lethal damage over summons", () => {
    const run = asEnemyTurn(createRun(84));
    const battle = activeBattle(run);
    battle.enemyId = "bandit-scout";
    battle.playerHero.health = 6;
    battle.enemyBoard = [minion({ instanceId: "face-damage", owner: "enemy", attack: 3, summonedTurn: 0 })];
    const result = resolveEnemyTurn(run);
    expect(result.status).toBe("defeat");
    expect(result.battle).toBeNull();
  });

  it("selects summon and tactical boss actions when their board conditions make them valuable", () => {
    const summonRun = asEnemyTurn(createRun(85));
    activeBattle(summonRun).enemyId = "crypt-crawler";
    const summonResult = resolveEnemyTurn(summonRun);
    expect(summonResult.battle?.enemyBoard[0]?.cardId).toBe("cinder-imp");

    const controllerRun = asEnemyTurn(createRun(851));
    const controllerBattle = activeBattle(controllerRun);
    controllerBattle.enemyId = "mire-hag";
    controllerBattle.playerBoard = Array.from({ length: 3 }, (_, index) => minion({ instanceId: `controller-target-${index}` }));
    const controllerResult = resolveEnemyTurn(controllerRun);
    expect(controllerResult.battle?.enemyBoard[0]?.cardId).toBe("ash-wolf");

    const lowHealthRun = asEnemyTurn(createRun(852));
    const lowHealthBattle = activeBattle(lowHealthRun);
    lowHealthBattle.enemyId = "crypt-crawler";
    lowHealthBattle.enemyBoard = [minion({ instanceId: "crawler-a", owner: "enemy", summonedTurn: 99 }), minion({ instanceId: "crawler-b", owner: "enemy", summonedTurn: 99 })];
    lowHealthBattle.playerHero.health = 10;
    const lowHealthResult = resolveEnemyTurn(lowHealthRun);
    expect(lowHealthResult.battle?.playerHero.health).toBe(6);

    const bossRun = asEnemyTurn(createRun(86));
    const bossBattle = activeBattle(bossRun);
    bossBattle.enemyId = "boss-grave-king";
    bossBattle.playerBoard = [minion({ instanceId: "board-1", health: 3, maxHealth: 3 }), minion({ instanceId: "board-2", health: 3, maxHealth: 3 })];
    const bossResult = resolveEnemyTurn(bossRun);
    expect(bossResult.battle?.playerHero.health).toBe(28);
    expect(bossResult.battle?.playerBoard.map((entry) => entry.health)).toEqual([1, 1]);
  });

  it("uses seeded tie breaks and picks lethal high-threat targets before safer ones", () => {
    const makeTieRun = () => {
      const run = asEnemyTurn(createRun(87));
      const battle = activeBattle(run);
      battle.enemyId = "crypt-crawler";
      battle.enemyBoard = [minion({ instanceId: "existing-1", owner: "enemy", summonedTurn: 99 }), minion({ instanceId: "existing-2", owner: "enemy", summonedTurn: 99 })];
      battle.playerBoard = [minion({ instanceId: "friendly-1" }), minion({ instanceId: "friendly-2" })];
      battle.rngState = 123456;
      return run;
    };
    const first = resolveEnemyTurn(makeTieRun());
    const second = resolveEnemyTurn(makeTieRun());
    expect(first.battle?.rngState).toBe(second.battle?.rngState);
    expect(first.battle?.enemyBoard.map((entry) => entry.cardId)).toEqual(second.battle?.enemyBoard.map((entry) => entry.cardId));

    const targetRun = asEnemyTurn(createRun(88));
    const targetBattle = activeBattle(targetRun);
    targetBattle.enemyId = "fallen-sentinel";
    targetBattle.playerBoard = [
      minion({ instanceId: "safe", attack: 10, health: 5, maxHealth: 5 }),
      minion({ instanceId: "strong-but-tough", attack: 8, health: 4, maxHealth: 4 }),
      minion({ instanceId: "left-tie", attack: 8, health: 2, maxHealth: 2 }),
      minion({ instanceId: "right-tie", attack: 8, health: 2, maxHealth: 2 }),
      minion({ instanceId: "strongest", attack: 9, health: 1, maxHealth: 1 }),
    ];
    targetBattle.enemyBoard = Array.from({ length: 4 }, (_, index) => minion({ instanceId: `attacker-${index}`, owner: "enemy", attack: 4, summonedTurn: 0 }));
    const targeted = resolveEnemyTurn(targetRun);
    expect(targeted.battle?.playerBoard.map((entry) => entry.instanceId)).toEqual(["safe"]);
  });

  it("persists each configured charge through its delay and applies boss area damage", () => {
    const cases = [
      ["bandit-scout", 15, 0, 1], ["crypt-crawler", 30, 3, 2], ["mire-hag", 15, 0, 2],
      ["fallen-sentinel", 30, 0, 1], ["plague-herald", 30, 3, 1], ["night-stalker", 15, 0, 2],
      ["boss-blood-matron", 15, 0, 1], ["boss-grave-king", 30, 3, 1], ["boss-void-titan", 30, 0, 2],
    ] as const;
    for (const [enemyId, heroHealth, boardSize, delay] of cases) {
      const run = asEnemyTurn(createRun(90));
      const battle = activeBattle(run);
      battle.enemyId = enemyId;
      battle.turnNumber = enemyId === "boss-void-titan" ? 4 : 1;
      battle.playerHero.health = heroHealth;
      battle.playerBoard = Array.from({ length: boardSize }, (_, index) => minion({ instanceId: `charge-target-${index}`, health: 3, maxHealth: 3 }));
      let resolving = resolveEnemyTurn(run);
      const enemy = ENEMY_BY_ID.get(enemyId)!;
      expect(resolving.battle?.pendingEnemyCharge).toEqual({
        turnsRemaining: delay,
        damage: enemy.tactics.chargeDamage,
        target: enemy.kind === "boss" ? "board-and-hero" : "hero",
      });

      resolving = JSON.parse(JSON.stringify(resolving)) as RunState;
      expect(resolving.battle?.pendingEnemyCharge?.turnsRemaining).toBe(delay);
      let chargeTurns = 0;
      while (chargeTurns < delay) {
        activeBattle(resolving).activeSide = "enemy";
        const beforeHealth = activeBattle(resolving).playerHero.health;
        resolving = resolveEnemyTurn(resolving);
        chargeTurns += 1;
        if (chargeTurns < delay) expect(resolving.battle?.playerHero.health).toBe(beforeHealth);
      }
      expect(resolving.battle?.playerHero.health).toBe(heroHealth - enemy.tactics.chargeDamage);
      if (enemy.kind === "boss" && boardSize > 0) expect(resolving.battle?.playerBoard).toHaveLength(0);
      else expect(resolving.battle?.playerBoard).toHaveLength(boardSize);
      expect(resolving.battle?.pendingEnemyCharge).toBeNull();
    }
  });

  it("runs death effects for minions killed by a boss charge", () => {
    const run = asEnemyTurn(createRun(91));
    const battle = activeBattle(run);
    battle.enemyId = "boss-grave-king";
    battle.playerBoard = [minion({ instanceId: "thorn", cardId: "thorn-brute", attack: 2, health: 6, maxHealth: 6 }), minion({ instanceId: "wolf-a" }), minion({ instanceId: "wolf-b" })];
    let resolving = resolveEnemyTurn(run);
    activeBattle(resolving).activeSide = "enemy";
    resolving = resolveEnemyTurn(resolving);
    expect(resolving.battle?.playerHero.health).toBe(18);
    expect(resolving.battle?.playerBoard.map((entry) => entry.cardId)).toEqual(["bone-rat"]);
  });

  it("finishes a run on a lethal charge and tolerates legacy battles without charge state", () => {
    const lethal = asEnemyTurn(createRun(92));
    activeBattle(lethal).enemyId = "bandit-scout";
    activeBattle(lethal).playerHero.health = 6;
    let resolving = resolveEnemyTurn(lethal);
    expect(resolving.battle?.pendingEnemyCharge?.turnsRemaining).toBe(1);
    activeBattle(resolving).activeSide = "enemy";
    resolving = resolveEnemyTurn(resolving);
    expect(resolving.status).toBe("defeat");
    expect(resolving.battle).toBeNull();

    const legacy = asEnemyTurn(createRun(93));
    delete activeBattle(legacy).pendingEnemyCharge;
    activeBattle(legacy).enemyId = "fallen-sentinel";
    activeBattle(legacy).playerBoard = [minion({ instanceId: "legacy-board" })];
    const playable = resolveEnemyTurn(legacy);
    expect(playable.status).toBe("active");
    expect(playable.battle?.activeSide).toBe("player");
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

