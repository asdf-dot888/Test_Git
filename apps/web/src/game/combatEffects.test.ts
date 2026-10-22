import { describe, expect, it } from "vitest";
import { createRun, type RunState } from "@board-game/game-core";
import { collectCombatEffectEvents } from "./combatEffects.js";

function withBattle(run: RunState, update: (run: RunState) => void): RunState {
  const next = structuredClone(run);
  update(next);
  return next;
}

describe("collectCombatEffectEvents", () => {
  it("plays a summon cue for played minions and their battlecry summons", () => {
    const run = createRun(40);
    const before = withBattle(run, (state) => { state.battle!.hand = [{ instanceId: "witch", cardId: "mire-witch" }]; });
    const after = withBattle(before, (state) => {
      state.battle!.hand = [];
      state.battle!.playerBoard = [
        { instanceId: "witch", cardId: "mire-witch", owner: "player", attack: 3, health: 4, maxHealth: 4, summonedTurn: 1, hasAttacked: false },
        { instanceId: "rat", cardId: "bone-rat", owner: "player", attack: 1, health: 1, maxHealth: 1, summonedTurn: 1, hasAttacked: false },
      ];
    });
    const events = collectCombatEffectEvents(before, after, { type: "play-minion", instanceId: "witch" }, 5);

    expect(events.map(({ effectKind, assetCardId, soundCues }) => [effectKind, assetCardId, soundCues])).toEqual([
      ["summon", "mire-witch", ["summon"]],
      ["summon", "mire-witch", ["summon"]],
    ]);
  });

  it("plays summon cues for spells and enemy summons", () => {
    const run = createRun(401);
    const before = withBattle(run, (state) => { state.battle!.hand = [{ instanceId: "bones", cardId: "raise-bones" }]; });
    const spellEvents = collectCombatEffectEvents(before, before, { type: "cast-spell", instanceId: "bones" }, 8);
    expect(spellEvents.map((event) => event.soundCues)).toEqual([["summon"]]);

    const after = withBattle(before, (state) => {
      state.battle!.enemyBoard = [{ instanceId: "enemy-rat", cardId: "bone-rat", owner: "enemy", attack: 1, health: 1, maxHealth: 1, summonedTurn: 1, hasAttacked: false }];
      state.battle!.hand = [];
      state.battle!.enemyTurnEvents = [{ type: "play-minion", cardId: "bone-rat", instanceId: "enemy-rat", handSlot: 0, summonedIds: ["enemy-rat"] }];
    });
    const enemyEvents = collectCombatEffectEvents(before, after, { type: "end-turn" }, 20);
    expect(enemyEvents).toContainEqual(expect.objectContaining({ effectKind: "summon", assetCardId: "bone-rat", soundCues: ["summon"], target: { kind: "minion", side: "enemy", slot: 0 } }));
  });

  it("plays a magical cue for a battlecry buff", () => {
    const run = createRun(402);
    const before = withBattle(run, (state) => {
      state.battle!.hand = [{ instanceId: "knight", cardId: "grave-knight" }];
      state.battle!.playerBoard = [{ instanceId: "guard", cardId: "crypt-guard", owner: "player", attack: 2, health: 3, maxHealth: 3, summonedTurn: 0, hasAttacked: false }];
    });
    const after = withBattle(before, (state) => {
      state.battle!.hand = [];
      state.battle!.playerBoard = [
        { instanceId: "guard", cardId: "crypt-guard", owner: "player", attack: 3, health: 4, maxHealth: 4, summonedTurn: 0, hasAttacked: false },
        { instanceId: "knight", cardId: "grave-knight", owner: "player", attack: 3, health: 3, maxHealth: 3, summonedTurn: 1, hasAttacked: false },
      ];
    });
    const events = collectCombatEffectEvents(before, after, { type: "play-minion", instanceId: "knight" }, 10);
    expect(events.map((event) => event.soundCues)).toEqual([["summon"], ["spell"]]);
  });

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
      state.battle!.enemyTurnEvents = [0, 1].map((index) => ({ type: "attack" as const, cardId: "bone-rat", attackerId: `enemy-${index}`, targetId: `player-${index}` }));
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
    expect(spell[0]).toMatchObject({ assetCardId: "soul-lance", effectKind: "damage", source: { kind: "hand", side: "player", slot: 0, instanceId: "lance" }, target: { kind: "minion", side: "enemy", slot: 0 } });
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

  it("maps enemy card, targeted spell, minion attack, and boss area records in order", () => {
    const run = createRun(44);
    const before = withBattle(run, (state) => {
      const battle = state.battle!;
      battle.playerBoard = [
        { instanceId: "player-target", cardId: "crypt-guard", owner: "player", attack: 2, health: 3, maxHealth: 3, summonedTurn: 0, hasAttacked: false },
      ];
      battle.enemyBoard = [
        { instanceId: "enemy-minion", cardId: "bone-rat", owner: "enemy", attack: 1, health: 1, maxHealth: 1, summonedTurn: 0, hasAttacked: false },
      ];
    });
    const after = withBattle(before, (state) => {
      state.battle!.enemyTurnEvents = [
        { type: "play-minion", cardId: "cinder-imp", instanceId: "secret-card", handSlot: 1, summonedIds: ["enemy-minion"] },
        { type: "cast-spell", cardId: "soul-lance", instanceId: "enemy-lance", handSlot: 0, effects: [{ kind: "damage", targetId: "player-target" }] },
        { type: "boss-area", damage: 1, targetMinionIds: ["player-target"], targetHeroId: "player" },
        { type: "attack", cardId: "bone-rat", attackerId: "enemy-minion", targetId: "player-target" },
      ];
      state.battle!.playerBoard[0]!.health = 1;
    });
    const events = collectCombatEffectEvents(before, after, { type: "end-turn" }, 30);
    expect(events.map((event) => event.effectKind)).toEqual(["summon", "damage", "impact", "attack"]);
    expect(events[0]).toMatchObject({ assetCardId: "cinder-imp", source: { kind: "hand", side: "enemy", slot: 1, instanceId: "secret-card" }, target: { kind: "minion", side: "enemy", slot: 0 } });
    expect(events[1]).toMatchObject({ assetCardId: "soul-lance", source: { kind: "hand", side: "enemy", slot: 0 }, target: { kind: "minion", side: "player", slot: 0 }, soundCues: ["spell", "damage"] });
    expect(events[2]).toMatchObject({ areaImpact: true, effectKind: "impact", soundCues: ["damage"] });
    expect(events[3]).toMatchObject({ assetCardId: "bone-rat", source: { kind: "minion", side: "enemy", slot: 0 }, target: { kind: "minion", side: "player", slot: 0 } });
  });

  it("does not create an area impact when the enemy turn has no boss-area record", () => {
    const run = createRun(45);
    const before = withBattle(run, (state) => { state.battle!.enemyId = "boss-grave-king"; });
    const after = withBattle(before, (state) => { state.battle!.turnNumber += 1; });
    expect(collectCombatEffectEvents(before, after, { type: "end-turn" }, 1)).toEqual([]);
  });});
