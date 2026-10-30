import { createRun } from "@board-game/game-core";
import { describe, expect, it } from "vitest";
import { restoreTutorialPlayerHealth } from "./tutorialHealth.js";

describe("restoreTutorialPlayerHealth", () => {
  it("heals only the player side without mutating the input run", () => {
    const run = createRun(20261030);
    const battle = run.battle!;
    battle.playerHero.health = 11;
    battle.enemyHero.health -= 4;
    battle.playerBoard = [{
      instanceId: "tutorial-friendly", cardId: "ash-wolf", owner: "player", attack: 2,
      health: 1, maxHealth: 4, summonedTurn: 0, hasAttacked: true,
    }];
    battle.enemyBoard = [{
      instanceId: "tutorial-enemy", cardId: "ash-wolf", owner: "enemy", attack: 2,
      health: 1, maxHealth: 4, summonedTurn: 0, hasAttacked: false,
    }];
    const before = structuredClone(run);

    const restored = restoreTutorialPlayerHealth(run);

    expect(restored).not.toBe(run);
    expect(restored.battle?.playerHero.health).toBe(restored.battle?.playerHero.maxHealth);
    expect(restored.battle?.playerBoard[0]?.health).toBe(4);
    expect(restored.battle?.enemyHero.health).toBe(before.battle?.enemyHero.health);
    expect(restored.battle?.enemyBoard).toEqual(before.battle?.enemyBoard);
    expect(restored.battle?.battleId).toBe(before.battle?.battleId);
    expect(restored.battle?.turnNumber).toBe(before.battle?.turnNumber);
    expect(run).toEqual(before);
  });

  it("clones and preserves runs without an active battle", () => {
    const run = createRun(20261031);
    const restored = restoreTutorialPlayerHealth(run);
    expect(restored).not.toBe(run);
    expect(restored).toEqual(run);
  });
});
