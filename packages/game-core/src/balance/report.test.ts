import { describe, expect, it } from "vitest";
import { renderReport } from "./report.js";
import type { CellSummary } from "./simulate.js";

function cell(playerClass: CellSummary["playerClass"], difficulty: CellSummary["difficulty"], completionRate: number): CellSummary {
  return {
    playerClass,
    difficulty,
    runs: 100,
    completionRate,
    completionCi: [completionRate - 0.1, completionRate + 0.1],
    meanBattlesCleared: 7.5,
    perBattleWinRate: 0.8,
    perBattleCi: [0.75, 0.85],
    perEncounterWinRate: Array.from({ length: 12 }, () => 0.8),
    perEncounterAttempts: Array.from({ length: 12 }, () => 100),
    meanTurnsPerBattle: 9.2,
    stalledBattles: 0,
  };
}

const META = { label: "unit", baseSeed: 42, runs: 100, gameCommit: "abc1234" };

describe("renderReport", () => {
  const cells = [
    cell("warrior", "normal", 0.5),
    cell("assassin", "normal", 0.46),
    cell("demonist", "normal", 0.4),
    cell("warrior", "hard", 0.3),
    cell("assassin", "hard", 0.3),
    cell("demonist", "hard", 0.31),
  ];

  it("names each class, difficulty, and the verdict", () => {
    const report = renderReport(cells, META);
    for (const text of ["전사", "암살자", "악마술사", "일반 난이도", "하드 난이도", "직업 격차 판정", "abc1234", "42"]) {
      expect(report).toContain(text);
    }
    expect(report).toContain("일반: 지표 완주율, 최대 격차 10.0%p");
    expect(report).toContain("목표 초과");
    expect(report).toContain("목표 달성");
  });

  it("is stable for a fixed input", () => {
    expect(renderReport(cells, META)).toBe(renderReport(cells, META));
  });

  it("reports the per-battle metric when completion rates are saturated", () => {
    const saturated = [cell("warrior", "hard", 0.0), cell("assassin", "hard", 0.2)];
    expect(renderReport(saturated, META)).toContain("전투 승률(완주율이 포화되어 대체)");
  });

  it("marks encounters nobody reached", () => {
    const sparse = cell("warrior", "normal", 0.5);
    sparse.perEncounterAttempts = [100, ...Array.from({ length: 11 }, () => 0)];
    expect(renderReport([sparse], META)).toContain("| -");
  });
});

describe("renderReport difficulty targets", () => {
  it("reports where the average completion sits against each target range", () => {
    const easy = renderReport([cell("warrior", "normal", 1), cell("assassin", "normal", 1), cell("warrior", "hard", 0.08)], META);
    expect(easy).toContain("## 난이도 목표 판정");
    expect(easy).toContain("일반: 직업 평균 완주율 100.0%, 목표 55.0% ~ 65.0% → 범위보다 쉬움");
    expect(easy).toContain("하드: 직업 평균 완주율 8.0%, 목표 6.0% ~ 10.0% → 범위 안");

    const inside = renderReport([cell("warrior", "normal", 0.6), cell("assassin", "normal", 0.6)], META);
    expect(inside).toContain("→ 범위 안");

    const harder = renderReport([cell("warrior", "hard", 0.03)], META);
    expect(harder).toContain("하드: 직업 평균 완주율 3.0%, 목표 6.0% ~ 10.0% → 범위보다 어려움");
  });

  it("keeps the earlier sections", () => {
    const report = renderReport([cell("warrior", "normal", 0.6)], META);
    expect(report).toContain("## 직업 격차 판정");
    expect(report).toContain("### 인카운터별 승률");
  });
});
