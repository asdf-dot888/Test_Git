import { describe, expect, it } from "vitest";
import { createRun } from "../engine.js";
import type { CardInstance, PlayerClass, RunDifficulty, RunState } from "../types.js";
import {
  averageCompletion,
  chooseBotReward,
  classGap,
  simulateBatch,
  simulateRun,
  summarizeCell,
  wilsonInterval,
  type CellSummary,
} from "./simulate.js";

const CLASSES: PlayerClass[] = ["warrior", "assassin", "demonist"];
const DIFFICULTIES: RunDifficulty[] = ["normal", "hard"];

function withReward(playerClass: PlayerClass, choices: string[], deckIds?: string[]): RunState {
  const run = createRun(5, playerClass, "normal");
  if (deckIds) {
    run.deck = deckIds.map((cardId, index): CardInstance => ({ instanceId: `deck-${index}`, cardId }));
  }
  run.pendingReward = { tier: "normal", choices, encounterIndex: 0 };
  run.pendingVictoryAcknowledgement = false;
  return run;
}

function cell(overrides: Partial<CellSummary> & Pick<CellSummary, "playerClass" | "difficulty">): CellSummary {
  return {
    runs: 100,
    completionRate: 0.5,
    completionCi: [0.4, 0.6],
    meanBattlesCleared: 6,
    perBattleWinRate: 0.8,
    perBattleCi: [0.7, 0.9],
    perEncounterWinRate: [],
    perEncounterAttempts: [],
    meanTurnsPerBattle: 8,
    stalledBattles: 0,
    ...overrides,
  };
}

describe("wilsonInterval", () => {
  it("brackets the observed proportion", () => {
    const [low, high] = wilsonInterval(50, 100);
    expect(low).toBeGreaterThan(0.4);
    expect(high).toBeLessThan(0.6);
    expect(low).toBeLessThan(0.5);
    expect(high).toBeGreaterThan(0.5);
  });

  it("has a zero lower bound for zero successes and covers empty samples", () => {
    expect(wilsonInterval(0, 10)[0]).toBeCloseTo(0, 10);
    expect(wilsonInterval(0, 0)).toEqual([0, 1]);
  });
});

describe("chooseBotReward", () => {
  it("returns null when nothing is pending", () => {
    expect(chooseBotReward(createRun(5, "warrior", "normal"))).toBeNull();
  });

  it("skips a clearly worse card", () => {
    const run = withReward("warrior", ["hollow-giant"], ["warrior-vanguard", "warrior-vanguard", "ash-wolf", "ash-wolf"]);
    expect(chooseBotReward(run)).toBeNull();
  });

  it("prefers a card that completes a fusion recipe", () => {
    const run = withReward("warrior", ["warrior-stonewall", "warrior-hammerfall"], ["warrior-vanguard", "bone-rat"]);
    expect(chooseBotReward(run)?.cardId).toBe("warrior-stonewall");
  });

  it("never picks a card already at two copies", () => {
    const run = withReward("warrior", ["warrior-vanguard"], ["warrior-vanguard", "warrior-vanguard"]);
    expect(chooseBotReward(run)).toBeNull();
  });
});

describe("simulateRun", () => {
  it("is deterministic and terminates for every class and difficulty", () => {
    for (const playerClass of CLASSES) {
      for (const difficulty of DIFFICULTIES) {
        for (let seed = 1; seed <= 4; seed += 1) {
          const first = simulateRun(seed, playerClass, difficulty);
          const second = simulateRun(seed, playerClass, difficulty);
          expect(first).toEqual(second);
          expect(first.battlesWon).toBeLessThanOrEqual(12);
          expect(first.completed || first.failedEncounterIndex !== null).toBe(true);
          if (first.completed) expect(first.battlesWon).toBe(12);
        }
      }
    }
  }, 60_000);
});

describe("simulateBatch", () => {
  it("returns a consistent summary per class and difficulty", () => {
    const cells = simulateBatch({ runs: 5, baseSeed: 100, classes: CLASSES, difficulties: DIFFICULTIES });
    expect(cells).toHaveLength(6);
    for (const summary of cells) {
      expect(summary.runs).toBe(5);
      expect(summary.completionRate).toBeGreaterThanOrEqual(0);
      expect(summary.completionRate).toBeLessThanOrEqual(1);
      expect(summary.perBattleWinRate).toBeGreaterThanOrEqual(0);
      expect(summary.perBattleWinRate).toBeLessThanOrEqual(1);
      expect(summary.perEncounterWinRate).toHaveLength(12);
      expect(summary.perEncounterAttempts[0]).toBe(5);
    }
  }, 60_000);

  it("summarizes empty and mixed results", () => {
    expect(summarizeCell([], "warrior", "normal").runs).toBe(0);
  });
});

describe("classGap", () => {
  it("uses the completion rate when no class is saturated", () => {
    const cells = [
      cell({ playerClass: "warrior", difficulty: "normal", completionRate: 0.5 }),
      cell({ playerClass: "assassin", difficulty: "normal", completionRate: 0.4 }),
      cell({ playerClass: "demonist", difficulty: "normal", completionRate: 0.45 }),
      cell({ playerClass: "warrior", difficulty: "hard", completionRate: 0.05 }),
    ];
    const gap = classGap(cells, "normal");
    expect(gap.metric).toBe("completion");
    expect(gap.gapPp).toBeCloseTo(10, 6);
  });

  it("switches to the per-battle rate when a completion rate is saturated", () => {
    const cells = [
      cell({ playerClass: "warrior", difficulty: "hard", completionRate: 0.01, perBattleWinRate: 0.7 }),
      cell({ playerClass: "assassin", difficulty: "hard", completionRate: 0.3, perBattleWinRate: 0.75 }),
    ];
    const gap = classGap(cells, "hard");
    expect(gap.metric).toBe("perBattle");
    expect(gap.gapPp).toBeCloseTo(5, 6);
  });

  it("keeps the completion rate for low but informative values such as 7.8%", () => {
    const cells = [
      cell({ playerClass: "warrior", difficulty: "hard", completionRate: 0.078, perBattleWinRate: 0.896 }),
      cell({ playerClass: "demonist", difficulty: "hard", completionRate: 0.318, perBattleWinRate: 0.934 }),
    ];
    const gap = classGap(cells, "hard");
    expect(gap.metric).toBe("completion");
    expect(gap.gapPp).toBeCloseTo(24, 6);
  });
});

describe("averageCompletion", () => {
  it("averages one difficulty and ignores the others", () => {
    const cells = [
      cell({ playerClass: "warrior", difficulty: "normal", completionRate: 0.5 }),
      cell({ playerClass: "assassin", difficulty: "normal", completionRate: 0.7 }),
      cell({ playerClass: "warrior", difficulty: "hard", completionRate: 0.1 }),
    ];
    expect(averageCompletion(cells, "normal")).toBeCloseTo(0.6, 10);
    expect(averageCompletion(cells, "hard")).toBeCloseTo(0.1, 10);
  });

  it("is null when no cell matches", () => {
    expect(averageCompletion([], "normal")).toBeNull();
    expect(averageCompletion([cell({ playerClass: "warrior", difficulty: "hard" })], "normal")).toBeNull();
  });
});
