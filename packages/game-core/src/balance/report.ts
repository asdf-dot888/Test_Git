import type { PlayerClass, RunDifficulty } from "../types.js";
import { classGap, type CellSummary } from "./simulate.js";

/** Dev-only Markdown report renderer. Not exported from the package index. */

export interface ReportMeta {
  label: string;
  baseSeed: number;
  runs: number;
  gameCommit: string;
}

export const TARGET_GAP_PP = 5;

const CLASS_NAMES: Record<PlayerClass, string> = {
  warrior: "전사",
  assassin: "암살자",
  demonist: "악마술사",
};

const DIFFICULTY_NAMES: Record<RunDifficulty, string> = {
  normal: "일반",
  hard: "하드",
};

const percent = (value: number): string => `${(value * 100).toFixed(1)}%`;
const interval = (range: readonly [number, number]): string => `${percent(range[0])} ~ ${percent(range[1])}`;

function difficultiesIn(cells: readonly CellSummary[]): RunDifficulty[] {
  const order: RunDifficulty[] = ["normal", "hard"];
  return order.filter((difficulty) => cells.some((cell) => cell.difficulty === difficulty));
}

function summaryTable(cells: readonly CellSummary[]): string[] {
  const lines = [
    "| 직업 | 런 수 | 완주율 | 완주율 95% 구간 | 평균 클리어 전투 | 전투 승률 | 전투 승률 95% 구간 | 전투당 평균 턴 | 정체 전투 |",
    "| :--- | ---: | ---: | :--- | ---: | ---: | :--- | ---: | ---: |",
  ];
  for (const cell of cells) {
    lines.push(
      `| ${CLASS_NAMES[cell.playerClass]} | ${cell.runs} | ${percent(cell.completionRate)} | ${interval(cell.completionCi)} | ${cell.meanBattlesCleared.toFixed(2)} | ${percent(cell.perBattleWinRate)} | ${interval(cell.perBattleCi)} | ${cell.meanTurnsPerBattle.toFixed(1)} | ${cell.stalledBattles} |`,
    );
  }
  return lines;
}

function encounterTable(cells: readonly CellSummary[]): string[] {
  const header = ["| 직업", ...Array.from({ length: 12 }, (_, index) => ` E${index + 1}`)].join(" |") + " |";
  const divider = ["| :---", ...Array.from({ length: 12 }, () => " ---:")].join(" |") + " |";
  const lines = [header, divider];
  for (const cell of cells) {
    const values = Array.from({ length: 12 }, (_, index) =>
      (cell.perEncounterAttempts[index] ?? 0) === 0 ? " -" : ` ${percent(cell.perEncounterWinRate[index] ?? 0)}`);
    lines.push(["| " + CLASS_NAMES[cell.playerClass], ...values].join(" |") + " |");
  }
  return lines;
}

export function renderReport(cells: readonly CellSummary[], meta: ReportMeta): string {
  const lines: string[] = [
    `# 밸런스 시뮬레이션 리포트: ${meta.label}`,
    "",
    `- 게임 커밋: ${meta.gameCommit}`,
    `- 기본 시드: ${meta.baseSeed}`,
    `- 셀당 런 수: ${meta.runs}`,
    "- 시드는 모든 직업에 동일하게 적용합니다(쌍 비교).",
    "- 봇은 사람보다 약하므로 절대 승률이 아니라 직업·난이도 간 상대 차이만 의미가 있습니다.",
    "- E1~E12는 원정의 열두 인카운터 순서입니다(페이즈당 일반 3 + 보스 1).",
  ];

  for (const difficulty of difficultiesIn(cells)) {
    const group = cells.filter((cell) => cell.difficulty === difficulty);
    lines.push("", `## ${DIFFICULTY_NAMES[difficulty]} 난이도`, "", ...summaryTable(group), "", "### 인카운터별 승률", "", ...encounterTable(group));
  }

  lines.push("", "## 직업 격차 판정", "");
  for (const difficulty of difficultiesIn(cells)) {
    const gap = classGap(cells, difficulty);
    const metricName = gap.metric === "completion" ? "완주율" : "전투 승률(완주율이 포화되어 대체)";
    const verdict = gap.gapPp <= TARGET_GAP_PP ? "목표 달성" : "목표 초과";
    lines.push(`- ${DIFFICULTY_NAMES[difficulty]}: 지표 ${metricName}, 최대 격차 ${gap.gapPp.toFixed(1)}%p (목표 ${TARGET_GAP_PP}%p 이내) → ${verdict}`);
  }
  lines.push("");
  return lines.join("\n");
}
