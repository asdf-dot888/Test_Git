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

    expect(events).toEqual([{ id: 12, assetCardId: "ash-wolf", effectKind: "attack", source: { kind: "minion", side: "player", slot: 0 }, target: { kind: "minion", side: "enemy", slot: 0 } }]);
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

    const after = withBattle(before, (state) => { state.battle!.playerHero.health -= 3; });
    const impact = collectCombatEffectEvents(before, after, { type: "end-turn" }, 9);
    expect(impact[0]).toMatchObject({ assetCardId: null, effectKind: "impact", source: { kind: "hero", side: "enemy" }, target: { kind: "hero", side: "player" } });
  });
});
