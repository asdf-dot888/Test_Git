import { describe, expect, it } from "vitest";
import { createRun, gameConstants, type MinionState, type PlayerClass, type RunState } from "@board-game/game-core";
import { canMinionAttack, getValidDropTargets, resolveDrop } from "./dropRules.js";

function minion(instanceId: string, cardId: string, owner: "player" | "enemy", overrides: Partial<MinionState> = {}): MinionState {
  return { instanceId, cardId, owner, attack: 2, health: 3, maxHealth: 3, summonedTurn: 0, hasAttacked: false, ...overrides };
}

function setup(options: { hand?: { instanceId: string; cardId: string }[]; player?: MinionState[]; enemy?: MinionState[]; mana?: number; playerClass?: PlayerClass } = {}): RunState {
  const run = createRun(930, options.playerClass ?? "warrior");
  const battle = run.battle!;
  battle.activeSide = "player";
  battle.status = "active";
  battle.turnNumber = 3;
  battle.hand = options.hand ?? [];
  battle.playerBoard = options.player ?? [];
  battle.enemyBoard = options.enemy ?? [];
  battle.playerMana = { current: options.mana ?? 10, max: 10, temporary: 0 };
  return run;
}

const card = (instanceId: string) => ({ kind: "card", instanceId }) as const;
const attacker = (instanceId: string) => ({ kind: "minion", instanceId }) as const;

describe("resolveDrop for cards", () => {
  it("plays a minion card on an empty slot and rejects occupied slots, full boards and missing mana", () => {
    const run = setup({ hand: [{ instanceId: "wolf", cardId: "ash-wolf" }], player: [minion("a", "ash-wolf", "player")] });
    expect(resolveDrop(run, card("wolf"), { kind: "slot", slotIndex: 1 })).toEqual({ type: "play-minion", instanceId: "wolf", slotIndex: 1 });
    expect(resolveDrop(run, card("wolf"), { kind: "slot", slotIndex: 0 })).toBeNull();
    expect(resolveDrop(run, card("wolf"), { kind: "slot", slotIndex: gameConstants.maxBoard })).toBeNull();
    expect(resolveDrop(run, card("wolf"), { kind: "hero", side: "enemy" })).toBeNull();

    const full = setup({ hand: [{ instanceId: "wolf", cardId: "ash-wolf" }], player: Array.from({ length: gameConstants.maxBoard }, (_, index) => minion(`p${index}`, "ash-wolf", "player")) });
    expect(resolveDrop(full, card("wolf"), { kind: "slot", slotIndex: 0 })).toBeNull();

    const broke = setup({ hand: [{ instanceId: "wolf", cardId: "ash-wolf" }], mana: 0 });
    expect(resolveDrop(broke, card("wolf"), { kind: "slot", slotIndex: 0 })).toBeNull();
  });

  it("casts an enemy-minion spell only on enemy minions", () => {
    const run = setup({ hand: [{ instanceId: "lance", cardId: "soul-lance" }], player: [minion("p", "ash-wolf", "player")], enemy: [minion("e", "ash-wolf", "enemy")] });
    expect(resolveDrop(run, card("lance"), { kind: "minion", side: "enemy", instanceId: "e" })).toEqual({ type: "cast-spell", instanceId: "lance", targetId: "e" });
    expect(resolveDrop(run, card("lance"), { kind: "minion", side: "player", instanceId: "p" })).toBeNull();
    expect(resolveDrop(run, card("lance"), { kind: "hero", side: "enemy" })).toBeNull();
    expect(resolveDrop(run, card("lance"), { kind: "minion", side: "enemy", instanceId: "missing" })).toBeNull();
  });

  it("casts a friendly-minion spell only on friendly minions", () => {
    const run = setup({ hand: [{ instanceId: "surge", cardId: "rune-surge" }], player: [minion("p", "ash-wolf", "player")], enemy: [minion("e", "ash-wolf", "enemy")] });
    expect(resolveDrop(run, card("surge"), { kind: "minion", side: "player", instanceId: "p" })).toEqual({ type: "cast-spell", instanceId: "surge", targetId: "p" });
    expect(resolveDrop(run, card("surge"), { kind: "minion", side: "enemy", instanceId: "e" })).toBeNull();
    expect(resolveDrop(run, card("surge"), { kind: "hero", side: "enemy" })).toBeNull();
  });

  it("throws spells without a target at the enemy hero and names the hero for random damage", () => {
    const run = setup({ hand: [{ instanceId: "bolt", cardId: "shadow-bolt" }, { instanceId: "shard", cardId: "fate-shard" }], enemy: [minion("e", "ash-wolf", "enemy")] });
    expect(resolveDrop(run, card("bolt"), { kind: "hero", side: "enemy" })).toEqual({ type: "cast-spell", instanceId: "bolt", targetId: run.battle!.enemyHero.id });
    expect(resolveDrop(run, card("bolt"), { kind: "minion", side: "enemy", instanceId: "e" })).toBeNull();
    expect(resolveDrop(run, card("shard"), { kind: "hero", side: "enemy" })).toEqual({ type: "cast-spell", instanceId: "shard", targetId: "enemy-hero" });
    expect(resolveDrop(run, card("shard"), { kind: "minion", side: "enemy", instanceId: "e" })).toEqual({ type: "cast-spell", instanceId: "shard", targetId: "e" });
  });

  it("can still send a wrong spell target to the game so it shows its own error (PC behavior)", () => {
    const run = setup({ hand: [{ instanceId: "lance", cardId: "soul-lance" }, { instanceId: "bolt", cardId: "shadow-bolt" }], player: [minion("p", "ash-wolf", "player")], enemy: [minion("e", "ash-wolf", "enemy")] });
    const lenient = { surfaceInvalidSpellTargets: true };
    expect(resolveDrop(run, card("lance"), { kind: "hero", side: "enemy" }, lenient)).toEqual({ type: "cast-spell", instanceId: "lance", targetId: run.battle!.enemyHero.id });
    expect(resolveDrop(run, card("lance"), { kind: "minion", side: "player", instanceId: "p" }, lenient)).toEqual({ type: "cast-spell", instanceId: "lance", targetId: "p" });
    expect(resolveDrop(run, card("bolt"), { kind: "minion", side: "enemy", instanceId: "e" }, lenient)).toEqual({ type: "cast-spell", instanceId: "bolt", targetId: "e" });
    // Minion cards and attackers keep their strict rules.
    const withMinionCard = setup({ hand: [{ instanceId: "wolf", cardId: "ash-wolf" }] });
    expect(resolveDrop(withMinionCard, card("wolf"), { kind: "hero", side: "enemy" }, lenient)).toBeNull();
  });

  it("rejects drops that are not allowed right now", () => {
    const run = setup({ hand: [{ instanceId: "bolt", cardId: "shadow-bolt" }] });
    expect(resolveDrop(run, card("missing"), { kind: "hero", side: "enemy" })).toBeNull();
    run.battle!.activeSide = "enemy";
    expect(resolveDrop(run, card("bolt"), { kind: "hero", side: "enemy" })).toBeNull();
    run.battle!.activeSide = "player";
    run.battle!.pendingDiscardBeforeDraw = true;
    expect(resolveDrop(run, card("bolt"), { kind: "hero", side: "enemy" })).toBeNull();
    run.battle!.pendingDiscardBeforeDraw = false;
    run.battle!.status = "playerWon";
    expect(resolveDrop(run, card("bolt"), { kind: "hero", side: "enemy" })).toBeNull();
    expect(resolveDrop({ ...run, battle: undefined } as unknown as RunState, card("bolt"), { kind: "hero", side: "enemy" })).toBeNull();
  });
});

describe("resolveDrop for minions", () => {
  it("attacks an enemy minion, but only with a ready attacker", () => {
    const run = setup({ player: [minion("ready", "ash-wolf", "player"), minion("fresh", "ash-wolf", "player", { summonedTurn: 3 }), minion("tired", "ash-wolf", "player", { hasAttacked: true }), minion("rooted", "ash-wolf", "player", { statusEffects: [{ kind: "root", turnsRemaining: 1 }] })], enemy: [minion("e", "ash-wolf", "enemy")] });
    const target = { kind: "minion", side: "enemy", instanceId: "e" } as const;
    expect(resolveDrop(run, attacker("ready"), target)).toEqual({ type: "attack", attackerId: "ready", targetId: "e" });
    expect(resolveDrop(run, attacker("fresh"), target)).toBeNull();
    expect(resolveDrop(run, attacker("tired"), target)).toBeNull();
    expect(resolveDrop(run, attacker("rooted"), target)).toBeNull();
    expect(resolveDrop(run, attacker("ready"), { kind: "minion", side: "enemy", instanceId: "missing" })).toBeNull();
    expect(resolveDrop(run, attacker("unknown"), target)).toBeNull();
  });

  it("attacks the enemy hero only when no enemy minions remain", () => {
    const blocked = setup({ player: [minion("ready", "ash-wolf", "player")], enemy: [minion("e", "ash-wolf", "enemy")] });
    expect(resolveDrop(blocked, attacker("ready"), { kind: "hero", side: "enemy" })).toBeNull();
    const open = setup({ player: [minion("ready", "ash-wolf", "player")] });
    expect(resolveDrop(open, attacker("ready"), { kind: "hero", side: "enemy" })).toEqual({ type: "attack", attackerId: "ready", targetId: open.battle!.enemyHero.id });
  });

  it("fuses two friendly minions only when the class has that recipe and mana remains", () => {
    const player = [minion("a", "warrior-vanguard", "player"), minion("b", "warrior-stonewall", "player"), minion("c", "ash-wolf", "player")];
    const run = setup({ player });
    expect(resolveDrop(run, attacker("a"), { kind: "minion", side: "player", instanceId: "b" })).toEqual({ type: "fuse-minions", firstMinionId: "a", secondMinionId: "b" });
    expect(resolveDrop(run, attacker("b"), { kind: "minion", side: "player", instanceId: "a" })).toEqual({ type: "fuse-minions", firstMinionId: "b", secondMinionId: "a" });
    expect(resolveDrop(run, attacker("a"), { kind: "minion", side: "player", instanceId: "c" })).toBeNull();
    expect(resolveDrop(run, attacker("a"), { kind: "minion", side: "player", instanceId: "a" })).toBeNull();
    expect(resolveDrop(setup({ player, mana: 0 }), attacker("a"), { kind: "minion", side: "player", instanceId: "b" })).toBeNull();
    expect(resolveDrop(setup({ player, playerClass: "assassin" }), attacker("a"), { kind: "minion", side: "player", instanceId: "b" })).toBeNull();
  });

  it("lets a minion fuse even when it cannot attack yet", () => {
    const run = setup({ player: [minion("a", "warrior-vanguard", "player", { summonedTurn: 3 }), minion("b", "warrior-stonewall", "player", { summonedTurn: 3 })] });
    expect(resolveDrop(run, attacker("a"), { kind: "minion", side: "player", instanceId: "b" })).toEqual({ type: "fuse-minions", firstMinionId: "a", secondMinionId: "b" });
  });
});

describe("getValidDropTargets", () => {
  it("lists the empty slots for a minion card", () => {
    const run = setup({ hand: [{ instanceId: "wolf", cardId: "ash-wolf" }], player: [minion("a", "ash-wolf", "player"), minion("b", "ash-wolf", "player")] });
    expect(getValidDropTargets(run, card("wolf"))).toEqual([2, 3, 4, 5].map((slotIndex) => ({ kind: "slot", slotIndex })));
  });

  it("lists enemy minions for a minion-targeting spell and adds the hero for random damage", () => {
    const run = setup({ hand: [{ instanceId: "lance", cardId: "soul-lance" }, { instanceId: "shard", cardId: "fate-shard" }], player: [minion("p", "ash-wolf", "player")], enemy: [minion("e1", "ash-wolf", "enemy"), minion("e2", "ash-wolf", "enemy")] });
    expect(getValidDropTargets(run, card("lance"))).toEqual([{ kind: "minion", side: "enemy", instanceId: "e1" }, { kind: "minion", side: "enemy", instanceId: "e2" }]);
    expect(getValidDropTargets(run, card("shard"))).toEqual([{ kind: "minion", side: "enemy", instanceId: "e1" }, { kind: "minion", side: "enemy", instanceId: "e2" }, { kind: "hero", side: "enemy" }]);
  });

  it("lists only the enemy hero for a spell without a target", () => {
    const run = setup({ hand: [{ instanceId: "bolt", cardId: "shadow-bolt" }], enemy: [minion("e", "ash-wolf", "enemy")] });
    expect(getValidDropTargets(run, card("bolt"))).toEqual([{ kind: "hero", side: "enemy" }]);
  });

  it("lists enemy minions, the hero when the enemy board is empty, and fusion partners for a ready minion", () => {
    const withEnemies = setup({ player: [minion("a", "warrior-vanguard", "player"), minion("b", "warrior-stonewall", "player")], enemy: [minion("e", "ash-wolf", "enemy")] });
    expect(getValidDropTargets(withEnemies, attacker("a"))).toEqual([{ kind: "minion", side: "enemy", instanceId: "e" }, { kind: "minion", side: "player", instanceId: "b" }]);
    const noEnemies = setup({ player: [minion("a", "ash-wolf", "player")] });
    expect(getValidDropTargets(noEnemies, attacker("a"))).toEqual([{ kind: "hero", side: "enemy" }]);
  });

  it("returns nothing when it is not the player's turn or the payload is unknown", () => {
    const run = setup({ hand: [{ instanceId: "bolt", cardId: "shadow-bolt" }] });
    expect(getValidDropTargets(run, card("nope"))).toEqual([]);
    run.battle!.activeSide = "enemy";
    expect(getValidDropTargets(run, card("bolt"))).toEqual([]);
  });
});

describe("canMinionAttack", () => {
  it("requires an older, rested, unrooted minion", () => {
    const run = setup();
    const battle = run.battle!;
    expect(canMinionAttack(battle, minion("a", "ash-wolf", "player"))).toBe(true);
    expect(canMinionAttack(battle, minion("a", "ash-wolf", "player", { summonedTurn: battle.turnNumber }))).toBe(false);
    expect(canMinionAttack(battle, minion("a", "ash-wolf", "player", { hasAttacked: true }))).toBe(false);
    expect(canMinionAttack(battle, minion("a", "ash-wolf", "player", { statusEffects: [{ kind: "root", turnsRemaining: 1 }] }))).toBe(false);
  });
});
