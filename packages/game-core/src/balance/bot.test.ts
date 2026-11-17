import { describe, expect, it } from "vitest";
import { CARD_BY_ID } from "../catalog.js";
import { createRun } from "../engine.js";
import type { PlayerClass, RunDifficulty, RunState } from "../types.js";
import { cardValue, playBotTurn } from "./bot.js";

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
