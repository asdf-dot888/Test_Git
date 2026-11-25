import { describe, expect, it } from "vitest";
import { CARD_BY_ID } from "../catalog.js";
import { createRun } from "../engine.js";
import type { PlayerClass, RunDifficulty, RunState } from "../types.js";
import { cardValue, playBotTurn, startBattleAsBot } from "./bot.js";

const CLASSES: PlayerClass[] = ["warrior", "assassin", "demonist"];
const DIFFICULTIES: RunDifficulty[] = ["normal", "hard"];

function card(cardId: string) {
  const found = CARD_BY_ID.get(cardId);
  if (!found) throw new Error(`Missing card ${cardId}`);
  return found;
}

describe("cardValue", () => {
  it("ranks mana-efficient cards above inefficient ones", () => {
    expect(cardValue(card("warrior-iron-ram"))).toBeGreaterThan(cardValue(card("shade-stalker")));
    expect(cardValue(card("ember-priest"))).toBeGreaterThan(cardValue(card("moon-stag")));
  });
});

describe("playBotTurn", () => {
  it("plays a legal first turn for every class and difficulty across many seeds", () => {
    for (const playerClass of CLASSES) {
      for (const difficulty of DIFFICULTIES) {
        for (let seed = 1; seed <= 20; seed += 1) {
          const { run, report } = playBotTurn(createRun(seed, playerClass, difficulty));
          expect(report.stalled).toBe(false);
          expect(run.status === "active" || run.status === "defeat" || run.status === "victory").toBe(true);
          if (run.battle?.status === "active") expect(run.battle.turnNumber).toBeGreaterThan(1);
        }
      }
    }
  });

  it("is deterministic for identical input", () => {
    const start = createRun(7, "assassin", "hard");
    expect(JSON.stringify(playBotTurn(start))).toBe(JSON.stringify(playBotTurn(start)));
  });

  it("keeps playing whole battles without rule violations or stalls", () => {
    for (const playerClass of CLASSES) {
      for (const difficulty of DIFFICULTIES) {
        let run: RunState = createRun(11, playerClass, difficulty);
        let turns = 0;
        while (run.status === "active" && run.battle?.status === "active" && turns < 80) {
          const result = playBotTurn(run);
          expect(result.report.stalled).toBe(false);
          run = result.run;
          turns += 1;
        }
        expect(turns).toBeGreaterThan(0);
      }
    }
  });

  it("fuses a recipe pair that is on the board", () => {
    const start: RunState = createRun(3, "warrior", "normal");
    const battle = start.battle!;
    battle.hand = [];
    battle.playerMana.current = 5;
    const makeMinion = (instanceId: string, cardId: string) => {
      const stats = card(cardId).minion!;
      return {
        instanceId,
        cardId,
        owner: "player" as const,
        attack: stats.attack,
        health: stats.maxHealth,
        maxHealth: stats.maxHealth,
        summonedTurn: 0,
        hasAttacked: false,
      };
    };
    battle.playerBoard = [makeMinion("test-a", "warrior-vanguard"), makeMinion("test-b", "warrior-stonewall")];

    const { run } = playBotTurn(start);
    const discarded = run.battle?.discardPile.map(({ instanceId }) => instanceId) ?? [];
    expect(discarded).toContain("test-a");
    expect(discarded).toContain("test-b");
  });
});

describe("turn order and taunt", () => {
  it("picks first and second equally often and plays the enemy's opening turn when it is second", () => {
    let secondCount = 0;
    for (let seed = 1; seed <= 40; seed += 1) {
      const started = startBattleAsBot(createRun(seed, "warrior", "normal", { pickTurnOrder: true }));
      const battle = started.battle!;
      expect(battle.firstSide === "player" || battle.firstSide === "enemy").toBe(true);
      expect(battle.activeSide).toBe("player");
      if (battle.firstSide === "enemy") {
        secondCount += 1;
        expect(battle.hand.some(({ cardId }) => cardId === "the-coin")).toBe(true);
      }
    }
    expect(secondCount).toBeGreaterThan(10);
    expect(secondCount).toBeLessThan(30);
  });

  it("uses the hero power only when it is not recharging", () => {
    const quietTurn = (cooldown: number) => {
      const run = createRun(23, "warrior", "normal");
      const battle = run.battle!;
      battle.turnNumber = 3;
      battle.hand = [];
      battle.playerMana = { current: 10, max: 10, temporary: 0 };
      battle.enemyBoard = [];
      battle.enemyHand = [];
      battle.heroPowerCooldown = cooldown;
      return playBotTurn(run).run.battle!;
    };
    // Ready: the warrior gains 4 armor and the power starts its rest.
    expect(quietTurn(0).playerArmor).toBe(4);
    // Recharging: no armor, and the rest counts down at the next player turn instead of being wasted on a refused action.
    const recharging = quietTurn(2);
    expect(recharging.playerArmor).toBe(0);
    expect(recharging.heroPowerCooldown).toBe(1);
  });

  it("attacks the taunt minion first, and goes for the hero when nothing blocks it", () => {
    const makeMinion = (instanceId: string, cardId: string, owner: "player" | "enemy", attack: number, health: number) =>
      ({ instanceId, cardId, owner, attack, health, maxHealth: health, summonedTurn: 0, hasAttacked: false });
    const taunted = createRun(21, "warrior", "normal");
    const tauntedBattle = taunted.battle!;
    tauntedBattle.turnNumber = 3;
    tauntedBattle.hand = [];
    tauntedBattle.playerBoard = [makeMinion("mine", "ash-wolf", "player", 3, 3)];
    tauntedBattle.enemyBoard = [makeMinion("plain", "ash-wolf", "enemy", 1, 1), makeMinion("guard", "warrior-vanguard", "enemy", 1, 4)];
    const afterTaunt = playBotTurn(taunted).run.battle!;
    // The bot's 3-attack minion hit the taunt minion (4 health, left with 1) and not the hero; the enemy turn that follows does not heal.
    expect(afterTaunt.enemyBoard.find(({ instanceId }) => instanceId === "guard")?.health).toBe(1);
    expect(afterTaunt.enemyHero.health).toBe(tauntedBattle.enemyHero.health);

    const open = createRun(22, "warrior", "normal");
    const openBattle = open.battle!;
    openBattle.turnNumber = 3;
    openBattle.hand = [];
    openBattle.playerBoard = [makeMinion("mine", "ash-wolf", "player", 1, 1)];
    openBattle.enemyBoard = [makeMinion("big", "moon-stag", "enemy", 5, 5)];
    // A 1/1 into a 5/5 is a bad trade: it hits the hero instead.
    const afterOpen = playBotTurn(open).run.battle!;
    expect(afterOpen.enemyHero.health).toBeLessThan(openBattle.enemyHero.health);
  });
});

