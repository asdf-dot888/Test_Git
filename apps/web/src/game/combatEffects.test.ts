import { describe, expect, it } from "vitest";
import { createRun, type RunState } from "@board-game/game-core";
import { collectCombatEffectEvents } from "./combatEffects.js";

function withBattle(run: RunState, update: (run: RunState) => void): RunState {
  const next = structuredClone(run);
  update(next);
  return next;
}

describe("collectCombatEffectEvents", () => {
  it("anchors a minion attack to the attacker card and exact lane slots", () => {
    const run = createRun(41);
    const before = withBattle(run, (state) => {
      state.battle!.playerBoard = [{ instanceId: "wolf", cardId: "ash-wolf", owner: "player", attack: 2, health: 1, maxHealth: 1, summonedTurn: 0, hasAttacked: false }];
      state.battle!.enemyBoard = [{ instanceId: "guard", cardId: "crypt-guard", owner: "enemy", attack: 2, health: 3, maxHealth: 3, summonedTurn: 0, hasAttacked: false }];
    });
    const events = collectCombatEffectEvents(before, before, { type: "attack", attackerId: "wolf", targetId: "guard" }, 12);

    expect(events).toEqual([{ id: 12, assetCardId: "ash-wolf", effectKind: "attack", soundCues: ["minion-attack", "damage"], source: { kind: "minion", side: "player", slot: 0 }, target: { kind: "minion", side: "enemy", slot: 0 } }]);
  });

  it("creates one event for each enemy minion attack during its turn", () => {
    const run = createRun(42);
    const before = withBattle(run, (state) => {
      state.battle!.playerBoard = [0, 1].map((index) => ({ instanceId: `player-${index}`, cardId: "ash-wolf", owner: "player" as const, attack: 2, health: 3, maxHealth: 3, summonedTurn: 0, hasAttacked: false }));
      state.battle!.enemyBoard = [0, 1].map((index) => ({ instanceId: `enemy-${index}`, cardId: "bone-rat", owner: "enemy" as const, attack: 1, health: 1, maxHealth: 1, summonedTurn: 0, hasAttacked: false }));
    });
    const after = withBattle(before, (state) => {
      state.battle!.turnNumber = 2;
      state.battle!.enemyBoard.forEach((minion) => { minion.hasAttacked = true; });
      state.battle!.playerBoard.forEach((minion) => { minion.health = 2; });
    });
    const events = collectCombatEffectEvents(before, after, { type: "end-turn" }, 20);

    expect(events).toHaveLength(2);
    expect(events.map(({ assetCardId, source, target }) => [assetCardId, source, target])).toEqual([
      ["bone-rat", { kind: "minion", side: "enemy", slot: 0 }, { kind: "minion", side: "player", slot: 0 }],
      ["bone-rat", { kind: "minion", side: "enemy", slot: 1 }, { kind: "minion", side: "player", slot: 1 }],
    ]);
    expect(events.map((event) => event.soundCues)).toEqual([["minion-attack", "damage"], ["minion-attack", "damage"]]);
  });

  it("keeps the spell card id and hand source for spell damage and common hero impact", () => {
    const run = createRun(43);
    const before = withBattle(run, (state) => {
      state.battle!.hand = [{ instanceId: "lance", cardId: "soul-lance" }];
      state.battle!.enemyBoard = [{ instanceId: "target", cardId: "bone-rat", owner: "enemy", attack: 1, health: 1, maxHealth: 1, summonedTurn: 0, hasAttacked: false }];
    });
    const spell = collectCombatEffectEvents(before, before, { type: "cast-spell", instanceId: "lance", targetId: "target" }, 4);
    expect(spell).toHaveLength(1);
    expect(spell[0]).toMatchObject({ assetCardId: "soul-lance", effectKind: "damage", source: { kind: "hand", slot: 0, instanceId: "lance" }, target: { kind: "minion", side: "enemy", slot: 0 } });
    expect(spell[0]?.soundCues).toEqual(["spell", "damage"]);

    const after = withBattle(before, (state) => { state.battle!.playerHero.health -= 3; });
    const impact = collectCombatEffectEvents(before, after, { type: "end-turn" }, 9);
    expect(impact[0]).toMatchObject({ assetCardId: null, effectKind: "impact", soundCues: ["damage"], source: { kind: "hero", side: "enemy" }, target: { kind: "hero", side: "player" } });
  });

  it("cues spell damage, minion death, and healing separately", () => {
    const run = createRun(431);
    const before = withBattle(run, (state) => {
      state.battle!.hand = [{ instanceId: "lance", cardId: "soul-lance" }, { instanceId: "mist", cardId: "healing-mist" }];
      state.battle!.enemyBoard = [{ instanceId: "target", cardId: "bone-rat", owner: "enemy", attack: 1, health: 1, maxHealth: 1, summonedTurn: 0, hasAttacked: false }];
    });
    const afterDamage = withBattle(before, (state) => { state.battle!.enemyBoard = []; });
    const damage = collectCombatEffectEvents(before, afterDamage, { type: "cast-spell", instanceId: "lance", targetId: "target" }, 70);
    expect(damage[0]?.soundCues).toEqual(["spell", "damage", "death"]);

    const heal = collectCombatEffectEvents(before, before, { type: "cast-spell", instanceId: "mist" }, 80);
    expect(heal[0]?.soundCues).toEqual(["spell", "heal"]);
  });

  it("creates separate boss charge impacts for damaged targets and preserves minion face attacks", () => {
    const run = createRun(44);
    const before = withBattle(run, (state) => {
      const battle = state.battle!;
      battle.enemyId = "boss-grave-king";
      battle.pendingEnemyCharge = { turnsRemaining: 1, damage: 12, target: "board-and-hero" };
      battle.playerBoard = [{ instanceId: "fallen", cardId: "ash-wolf", owner: "player", attack: 2, health: 10, maxHealth: 10, summonedTurn: 0, hasAttacked: false }];
      battle.enemyBoard = [{ instanceId: "striker", cardId: "bone-rat", owner: "enemy", attack: 1, health: 1, maxHealth: 1, summonedTurn: 0, hasAttacked: false }];
    });
    const after = withBattle(before, (state) => {
      state.battle!.pendingEnemyCharge = null;
      state.battle!.playerHero.health = 13;
      state.battle!.playerBoard = [];
      state.battle!.enemyBoard[0]!.hasAttacked = true;
    });
    const events = collectCombatEffectEvents(before, after, { type: "end-turn" }, 30);

    expect(events).toHaveLength(3);
    expect(events.filter((event) => event.assetCardId === null && event.effectKind === "damage").map((event) => event.target)).toEqual([
      { kind: "minion", side: "player", slot: 0 },
      { kind: "hero", side: "player" },
    ]);
    expect(events.filter((event) => event.effectKind === "damage").map((event) => event.soundCues)).toEqual([["damage", "death"], ["damage"]]);
    expect(events.some((event) => event.assetCardId === "bone-rat" && event.effectKind === "attack" && event.target.kind === "hero")).toBe(true);
  });

  it("does not add a minion charge impact when its health did not decrease", () => {
    const run = createRun(46);
    const before = withBattle(run, (state) => {
      state.battle!.enemyId = "boss-grave-king";
      state.battle!.pendingEnemyCharge = { turnsRemaining: 1, damage: 12, target: "board-and-hero" };
      state.battle!.playerBoard = [{ instanceId: "unharmed", cardId: "crypt-guard", owner: "player", attack: 2, health: 20, maxHealth: 20, summonedTurn: 0, hasAttacked: false }];
    });
    const after = withBattle(before, (state) => {
      state.battle!.pendingEnemyCharge = null;
      state.battle!.playerHero.health -= 12;
    });
    const events = collectCombatEffectEvents(before, after, { type: "end-turn" }, 40);
    expect(events).toHaveLength(1);
    expect(events[0]?.target).toEqual({ kind: "hero", side: "player" });
  });

  it("does not create charge impact events during an ordinary enemy turn", () => {
    const run = createRun(45);
    const before = withBattle(run, (state) => { state.battle!.enemyId = "boss-grave-king"; });
    const after = withBattle(before, (state) => { state.battle!.turnNumber += 1; });
    expect(collectCombatEffectEvents(before, after, { type: "end-turn" }, 1)).toEqual([]);
  });
});
