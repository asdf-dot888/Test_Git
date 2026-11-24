import { describe, expect, it } from "vitest";
import { attackWithMinion, createRun, type RunState } from "@board-game/game-core";
import { collectCombatEffectEvents, collectEnemyActionEffects, combatFloatNumbers, type CombatEffectEvent } from "./combatEffects.js";

function withBattle(run: RunState, update: (run: RunState) => void): RunState {
  const next = structuredClone(run);
  update(next);
  return next;
}

const minion = (instanceId: string, owner: "player" | "enemy", overrides: Partial<{ attack: number; health: number; maxHealth: number }> = {}) => ({
  instanceId, cardId: "bone-rat", owner, attack: 1, health: 5, maxHealth: 5, summonedTurn: 0, hasAttacked: false, ...overrides,
});

const texts = (events: CombatEffectEvent[]) => events.flatMap((event) => combatFloatNumbers(event).map((number) => `${number.tone}:${number.text}`));

describe("combatFloatNumbers", () => {
  it("shows the damage on the minion hit by a player attack and the retaliation on the attacker", () => {
    const before = withBattle(createRun(500), (state) => {
      state.battle!.playerBoard = [minion("attacker", "player", { attack: 3, health: 5, maxHealth: 5 })];
      state.battle!.enemyBoard = [minion("defender", "enemy", { attack: 2, health: 6, maxHealth: 6 })];
    });
    const after = attackWithMinion(before, "attacker", "defender");
    const events = collectCombatEffectEvents(before, after, { type: "attack", attackerId: "attacker", targetId: "defender" }, 1);
    expect(events.map((event) => combatFloatNumbers(event).map((number) => [number.text, number.anchor]))).toEqual([
      [["-3", { kind: "minion", side: "enemy", slot: 0 }]],
      [["-2", { kind: "minion", side: "player", slot: 0 }]],
    ]);
  });

  it("shows damage on the enemy hero for an attack", () => {
    const before = withBattle(createRun(501), (state) => {
      state.battle!.turnNumber = 3;
      state.battle!.playerBoard = [minion("a", "player", { attack: 2 }), minion("b", "player", { attack: 3 })];
      state.battle!.enemyBoard = [];
    });
    const after = withBattle(before, (state) => { state.battle!.enemyHero.health -= 5; });
    const attack = collectCombatEffectEvents(before, after, { type: "attack", attackerId: "a", targetId: "enemy-hero" }, 1);
    expect(combatFloatNumbers(attack[0]!)).toMatchObject([{ text: "-2", tone: "damage", anchor: { kind: "hero", side: "enemy" } }]);
  });

  it("shows spell damage: direct, cleave per target, and area damage per minion", () => {
    const direct = withBattle(createRun(502), (state) => {
      state.battle!.hand = [{ instanceId: "bolt", cardId: "shadow-bolt" }];
    });
    expect(texts(collectCombatEffectEvents(direct, direct, { type: "cast-spell", instanceId: "bolt" }, 1))).toEqual(["damage:-2"]);

    const cleave = withBattle(createRun(503), (state) => {
      state.battle!.hand = [{ instanceId: "cleave", cardId: "reaper-cleave" }];
      state.battle!.enemyBoard = ["left", "center", "right"].map((id) => minion(id, "enemy", { health: 8, maxHealth: 8 }));
    });
    expect(texts(collectCombatEffectEvents(cleave, cleave, { type: "cast-spell", instanceId: "cleave", targetId: "center" }, 1))).toEqual(["damage:-2", "damage:-4", "damage:-2"]);

    const area = withBattle(createRun(504), (state) => {
      state.battle!.playerBoard = [minion("p0", "player"), minion("p1", "player")];
    });
    const areaEvents = collectEnemyActionEffects(area, area, { type: "cast-spell", cardId: "void-titan-inferno", instanceId: "inferno", handSlot: 0, effects: [{ kind: "damageAllEnemyMinions", targetId: null }] }, 1);
    expect(texts(areaEvents)).toEqual(["damage:-4", "damage:-4"]);
    expect(combatFloatNumbers(areaEvents[0]!).map((number) => number.anchor)).toEqual([{ kind: "minion", side: "player", slot: 0 }, { kind: "minion", side: "player", slot: 1 }]);
  });

  it("shows the Assassin hero power damage on its target", () => {
    const assassin = withBattle(createRun(505, "assassin"), (state) => {
      state.battle!.enemyBoard = [minion("target", "enemy")];
    });
    expect(texts(collectCombatEffectEvents(assassin, assassin, { type: "use-hero-power", targetId: "target" }, 1))).toEqual(["damage:-2"]);
    expect(texts(collectCombatEffectEvents(assassin, assassin, { type: "use-hero-power", targetId: "enemy-hero" }, 1))).toEqual(["damage:-2"]);
  });

  it("shows enemy attacks, retaliation and enemy spells", () => {
    const before = withBattle(createRun(506), (state) => {
      state.battle!.enemyBoard = [minion("enemy", "enemy", { attack: 2 })];
      state.battle!.playerBoard = [minion("guard", "player", { attack: 1 })];
    });
    const attack = collectEnemyActionEffects(before, before, { type: "attack", cardId: "bone-rat", attackerId: "enemy", targetId: "guard" }, 1);
    expect(attack.map((event) => combatFloatNumbers(event).map((number) => [number.text, number.anchor]))).toEqual([
      [["-2", { kind: "minion", side: "player", slot: 0 }]],
      [["-1", { kind: "minion", side: "enemy", slot: 0 }]],
    ]);
    const spellBefore = withBattle(createRun(507), (state) => { state.battle!.playerBoard = []; });
    const spell = collectEnemyActionEffects(spellBefore, spellBefore, { type: "cast-spell", cardId: "shadow-bolt", instanceId: "bolt", handSlot: 0, effects: [{ kind: "damage", targetId: "player-hero" }] }, 1);
    expect(texts(spell)).toEqual(["damage:-2"]);
  });

  it("shows boss area damage once per player minion and for the hero", () => {
    const before = withBattle(createRun(508), (state) => {
      state.battle!.enemyId = "boss-grave-king";
      state.battle!.playerBoard = [minion("m0", "player"), minion("m1", "player")];
    });
    const after = withBattle(before, (state) => {
      state.battle!.enemyTurnEvents = [{ type: "boss-area", damage: 1, targetMinionIds: ["m0", "m1"], targetHeroId: "player" }];
    });
    const [event] = collectCombatEffectEvents(before, after, { type: "end-turn" }, 1);
    expect(combatFloatNumbers(event!).map((number) => [number.text, number.anchor])).toEqual([
      ["-1", { kind: "minion", side: "player", slot: 0 }],
      ["-1", { kind: "minion", side: "player", slot: 1 }],
      ["-1", { kind: "hero", side: "player" }],
    ]);
  });

  it("shows burn or other hero damage after the end of the player's turn", () => {
    const before = createRun(509);
    const after = withBattle(before, (state) => { state.battle!.playerHero.health -= 2; });
    expect(texts(collectCombatEffectEvents(before, after, { type: "end-turn" }, 1))).toEqual(["damage:-2"]);
  });

  it("shows the applied heal on a hero or minion and nothing when nothing was missing", () => {
    const hurt = withBattle(createRun(510), (state) => {
      state.battle!.hand = [{ instanceId: "mist", cardId: "healing-mist" }, { instanceId: "thread", cardId: "life-thread" }];
      state.battle!.playerHero.health = state.battle!.playerHero.maxHealth - 3;
      state.battle!.playerBoard = [minion("friend", "player", { health: 2, maxHealth: 9 })];
    });
    expect(texts(collectCombatEffectEvents(hurt, hurt, { type: "cast-spell", instanceId: "mist" }, 1))).toEqual(["heal:+3"]);
    const thread = collectCombatEffectEvents(hurt, hurt, { type: "cast-spell", instanceId: "thread", targetId: "friend" }, 1);
    expect(combatFloatNumbers(thread[0]!)).toMatchObject([{ text: "+5", tone: "heal", anchor: { kind: "minion", side: "player", slot: 0 } }]);
    const healthy = withBattle(hurt, (state) => { state.battle!.playerHero.health = state.battle!.playerHero.maxHealth; });
    expect(texts(collectCombatEffectEvents(healthy, healthy, { type: "cast-spell", instanceId: "mist" }, 1))).toEqual([]);
  });

  it("shows the boss Soul Harvest heal on the enemy hero", () => {
    const before = withBattle(createRun(511), (state) => {
      state.battle!.enemyHero.health = state.battle!.enemyHero.maxHealth - 2;
      state.battle!.playerBoard = [minion("target", "player", { health: 9, maxHealth: 9 })];
    });
    const events = collectEnemyActionEffects(before, before, { type: "cast-spell", cardId: "grave-king-harvest", instanceId: "harvest", handSlot: 0, effects: [{ kind: "soulHarvest", targetId: "target", amount: 5 }] }, 1);
    expect(texts(events)).toEqual(["damage:-5", "heal:+2"]);
  });

  it("shows armor absorption on the hero and no number for a pure miss", () => {
    const base = withBattle(createRun(512), (state) => {
      state.battle!.playerArmor = 3;
      state.battle!.enemyBoard = [minion("enemy", "enemy", { attack: 5 })];
    });
    const after = withBattle(base, (state) => { state.battle!.playerArmor = 0; state.battle!.playerHero.health -= 2; });
    const hit = collectEnemyActionEffects(base, after, { type: "attack", cardId: "bone-rat", attackerId: "enemy", targetId: "player-hero" }, 1);
    expect(texts(hit)).toEqual(["damage:-2", "armor:⬟ -3"]);
    const absorbed = withBattle(base, (state) => { state.battle!.playerArmor = 0; });
    const blocked = collectEnemyActionEffects(withBattle(base, (state) => { state.battle!.playerArmor = 5; }), withBattle(base, (state) => { state.battle!.playerArmor = 0; }), { type: "attack", cardId: "bone-rat", attackerId: "enemy", targetId: "player-hero" }, 1);
    expect(texts(blocked)).toEqual(["armor:⬟ -5"]);
    expect(absorbed.battle!.playerArmor).toBe(0);

    const miss = collectEnemyActionEffects(createRun(513), createRun(513), { type: "cast-spell", cardId: "fate-shard", instanceId: "shard", handSlot: 0, effects: [{ kind: "randomDamage", targetId: "player-hero", amount: 0 }] }, 1);
    expect(texts(miss)).toEqual([]);
  });

  it("shows one number per attacker for an enemy all-attack, sharing the hero's armor in order", () => {
    const before = withBattle(createRun(514), (state) => {
      state.battle!.playerArmor = 3;
      state.battle!.enemyBoard = [minion("a", "enemy", { attack: 2 }), minion("b", "enemy", { attack: 4 }), minion("c", "enemy", { attack: 1 })];
    });
    const events = collectEnemyActionEffects(before, before, { type: "all-attack", attackers: [{ attackerId: "a", cardId: "bone-rat" }, { attackerId: "b", cardId: "bone-rat" }, { attackerId: "c", cardId: "bone-rat" }], targetId: "player" }, 1);
    expect(events).toHaveLength(3);
    expect(events.every((event) => event.target.kind === "hero" && event.target.side === "player")).toBe(true);
    expect(events.map((event) => event.source)).toEqual([{ kind: "minion", side: "enemy", slot: 0 }, { kind: "minion", side: "enemy", slot: 1 }, { kind: "minion", side: "enemy", slot: 2 }]);
    // 3 armor: attacker a (2) is fully absorbed, b (4) loses 1 to armor and deals 3, c (1) deals 1.
    expect(texts(events)).toEqual(["armor:⬟ -2", "damage:-3", "armor:⬟ -1", "damage:-1"]);
  });
});
