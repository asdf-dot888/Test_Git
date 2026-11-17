import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { PlayerClass, RunDifficulty } from "../types.js";
import { renderReport } from "./report.js";
import { simulateBatch } from "./simulate.js";

/** Dev-only balance simulation CLI. Run through `npm run balance:sim`. */

const ALL_CLASSES: readonly PlayerClass[] = ["warrior", "assassin", "demonist"];
const ALL_DIFFICULTIES: readonly RunDifficulty[] = ["normal", "hard"];
const DEFAULT_RUNS = 500;
const DEFAULT_SEED = 20261117;

const USAGE = `Usage: npm run balance:sim -- [options]
  --runs <n>                    Runs per class/difficulty cell (default ${DEFAULT_RUNS})
  --seed <n>                    Base seed (default ${DEFAULT_SEED})
  --class <warrior|assassin|demonist|all>   (default all)
  --difficulty <normal|hard|all>            (default all)
  --out <path>                  Write the Markdown report to a file instead of stdout
  --label <text>                Report label (default "simulation")`;

interface CliOptions {
  runs: number;
  seed: number;
  classes: readonly PlayerClass[];
  difficulties: readonly RunDifficulty[];
  out: string | null;
  label: string;
}

function fail(message: string): never {
  process.stderr.write(`${message}\n${USAGE}\n`);
  process.exit(1);
}

function parsePositiveInteger(flag: string, raw: string | undefined): number {
  const value = Number(raw);
  if (raw === undefined || !Number.isInteger(value) || value < 1) fail(`${flag} needs a positive integer.`);
  return value;
}

function parseArgs(argv: readonly string[]): CliOptions {
  const options: CliOptions = { runs: DEFAULT_RUNS, seed: DEFAULT_SEED, classes: ALL_CLASSES, difficulties: ALL_DIFFICULTIES, out: null, label: "simulation" };
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (flag === "--runs") options.runs = parsePositiveInteger(flag, value);
    else if (flag === "--seed") options.seed = parsePositiveInteger(flag, value);
    else if (flag === "--class") {
      if (value === "all") options.classes = ALL_CLASSES;
      else if (ALL_CLASSES.includes(value as PlayerClass)) options.classes = [value as PlayerClass];
      else fail(`Unknown class: ${value ?? "(missing)"}`);
    } else if (flag === "--difficulty") {
      if (value === "all") options.difficulties = ALL_DIFFICULTIES;
      else if (ALL_DIFFICULTIES.includes(value as RunDifficulty)) options.difficulties = [value as RunDifficulty];
      else fail(`Unknown difficulty: ${value ?? "(missing)"}`);
    } else if (flag === "--out") {
      if (!value) fail("--out needs a path.");
      options.out = value;
    } else if (flag === "--label") {
      if (!value) fail("--label needs text.");
      options.label = value;
    } else {
      fail(`Unknown option: ${flag ?? "(missing)"}`);
    }
  }
  return options;
}

function gitCommit(): string {
  try {
    return execFileSync("git", ["rev-parse", "--short", "HEAD"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return "unknown";
  }
}

function main(): void {
  const options = parseArgs(process.argv.slice(2));
  const startedAt = Date.now();
  const cells = simulateBatch({
    runs: options.runs,
    baseSeed: options.seed,
    classes: options.classes,
    difficulties: options.difficulties,
    onCellDone: (cell) => {
      const seconds = ((Date.now() - startedAt) / 1000).toFixed(0);
      process.stderr.write(`[${seconds}s] ${cell.difficulty}/${cell.playerClass}: completion ${(cell.completionRate * 100).toFixed(1)}%, per-battle ${(cell.perBattleWinRate * 100).toFixed(1)}%\n`);
    },
  });
  const report = renderReport(cells, { label: options.label, baseSeed: options.seed, runs: options.runs, gameCommit: gitCommit() });
  if (options.out) {
    mkdirSync(dirname(options.out), { recursive: true });
    writeFileSync(options.out, report, "utf8");
    process.stderr.write(`Report written to ${options.out}\n`);
  } else {
    process.stdout.write(report);
  }
}

main();
