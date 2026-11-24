import { CARD_BY_ID, FUSION_RECIPES } from "../catalog.js";
import {
  acknowledgeVictory,
  advanceRun,
  chooseReward,
  chooseRewardAndDiscard,
  createRun,
  skipReward,
} from "../engine.js";
import type { PlayerClass, RunDifficulty, RunState } from "../types.js";
import { cardValue, playBotTurn, startBattleAsBot } from "./bot.js";

/** Dev-only expedition simulator. Not exported from the package index. */

const MAX_TURNS_PER_BATTLE = 80;
const MAX_LOOP_ITERATIONS = 2000;
const MAX_DECK_SIZE = 35;
const SEED_STRIDE = 7919;
const TOTAL_ENCOUNTERS = 12;
const CLASS_REWARD_BONUS = 0.5;
const FUSION_REWARD_BONUS = 1.0;

// Completion rates this close to 0% or 100% carry almost no class information.
// (A first draft used 10%/90%, which wrongly hid a 7.8% vs 31.8% Hard-mode gap.)
export const SATURATION_LOW = 0.02;
export const SATURATION_HIGH = 0.98;

// ---------------------------------------------------------------------------
// Reward policy
// ---------------------------------------------------------------------------

export interface BotRewardChoice {
  cardId: string;
  discardInstanceId?: string;
}

function fusionSourceIds(playerClass: PlayerClass | undefined): Set<string> {
  const ids = new Set<string>();
  for (const recipe of FUSION_RECIPES) {
    if (recipe.classId === playerClass) for (const id of recipe.sourceCardIds) ids.add(id);
  }
  return ids;
}

function valueOfCardId(cardId: string): number {
  const card = CARD_BY_ID.get(cardId);
  return card ? cardValue(card) : 0;
}

export function chooseBotReward(run: RunState): BotRewardChoice | null {
  const reward = run.pendingReward;
  if (!reward) return null;

  const counts = new Map<string, number>();
  for (const instance of run.deck) counts.set(instance.cardId, (counts.get(instance.cardId) ?? 0) + 1);
  const sources = fusionSourceIds(run.playerClass);
  const partners = new Map<string, string>();
  for (const recipe of FUSION_RECIPES) {
    if (recipe.classId !== run.playerClass) continue;
    partners.set(recipe.sourceCardIds[0], recipe.sourceCardIds[1]);
    partners.set(recipe.sourceCardIds[1], recipe.sourceCardIds[0]);
  }

  let best: { cardId: string; score: number } | null = null;
  for (const cardId of reward.choices) {
    if ((counts.get(cardId) ?? 0) >= 2) continue;
    const card = CARD_BY_ID.get(cardId);
    if (!card) continue;
    let score = cardValue(card);
    if (card.classId === run.playerClass) score += CLASS_REWARD_BONUS;
    const partner = partners.get(cardId);
    if (partner && ((counts.get(partner) ?? 0) > 0 || reward.choices.includes(partner))) score += FUSION_REWARD_BONUS;
    if (!best || score > best.score || (score === best.score && cardId < best.cardId)) best = { cardId, score };
  }
  if (!best) return null;

  const meanDeckValue = run.deck.length === 0
    ? 0
    : run.deck.reduce((total, instance) => total + valueOfCardId(instance.cardId), 0) / run.deck.length;
  if (best.score < meanDeckValue) return null;

  if (run.deck.length < MAX_DECK_SIZE) return { cardId: best.cardId };

  const discard = [...run.deck]
    .filter((instance) => !sources.has(instance.cardId))
    .sort((left, right) => valueOfCardId(left.cardId) - valueOfCardId(right.cardId) || (left.instanceId < right.instanceId ? -1 : 1))[0];
  if (!discard || valueOfCardId(discard.cardId) >= best.score) return null;
  return { cardId: best.cardId, discardInstanceId: discard.instanceId };
}

function applyReward(run: RunState): RunState {
  if (!run.pendingReward) return run;
  const choice = chooseBotReward(run);
  if (!choice) return skipReward(run);
  try {
    return choice.discardInstanceId
      ? chooseRewardAndDiscard(run, choice.cardId, choice.discardInstanceId)
      : chooseReward(run, choice.cardId);
  } catch {
    // The engine rejected the pick (e.g. copy limit after a discard); skip rather than stall.
    return skipReward(run);
  }
}

// ---------------------------------------------------------------------------
// Single-run simulation
// ---------------------------------------------------------------------------

export interface EncounterResult {
  index: number;
  won: boolean;
  turns: number;
}

export interface RunSimulationResult {
  seed: number;
  playerClass: PlayerClass;
  difficulty: RunDifficulty;
  completed: boolean;
  battlesWon: number;
  failedEncounterIndex: number | null;
  encounterResults: EncounterResult[];
  stalledBattles: number;
  finalDeckSize: number;
}

export function simulateRun(seed: number, playerClass: PlayerClass, difficulty: RunDifficulty): RunSimulationResult {
  let run = startBattleAsBot(createRun(seed, playerClass, difficulty, { pickTurnOrder: true }));
  const encounterResults: EncounterResult[] = [];
  let stalledBattles = 0;
  let completed = false;
  let failedEncounterIndex: number | null = null;

  for (let iteration = 0; iteration < MAX_LOOP_ITERATIONS; iteration += 1) {
    const encounterIndex = run.completedBattles;
    let turns = 0;
    let stalledByCap = false;
    let stalledInBattle = false;
    while (run.status === "active" && run.battle?.status === "active") {
      if (turns >= MAX_TURNS_PER_BATTLE) {
        stalledByCap = true;
        break;
      }
      const result = playBotTurn(run);
      if (result.report.stalled) stalledInBattle = true;
      run = result.run;
      turns += 1;
    }
    if (stalledByCap || stalledInBattle) stalledBattles += 1;

    const won = !stalledByCap && run.battle?.status === "playerWon";
    if (!won) {
      encounterResults.push({ index: encounterIndex, won: false, turns });
      failedEncounterIndex = encounterIndex;
      break;
    }
    encounterResults.push({ index: encounterIndex, won: true, turns });

    if (run.pendingVictoryAcknowledgement) run = acknowledgeVictory(run);
    if (run.status === "victory") {
      completed = true;
      break;
    }
    run = applyReward(run);
    run = startBattleAsBot(advanceRun(run, run.seed + run.completedBattles * SEED_STRIDE + 1, { pickTurnOrder: true }));
  }

  if (!completed && failedEncounterIndex === null) {
    throw new Error(`Simulation did not terminate for seed ${seed} (${playerClass}, ${difficulty}).`);
  }

  return {
    seed,
    playerClass,
    difficulty,
    completed,
    battlesWon: encounterResults.filter((result) => result.won).length,
    failedEncounterIndex,
    encounterResults,
    stalledBattles,
    finalDeckSize: run.deck.length,
  };
}

// ---------------------------------------------------------------------------
// Batch statistics
// ---------------------------------------------------------------------------

export interface BatchOptions {
  runs: number;
  baseSeed: number;
  classes: readonly PlayerClass[];
  difficulties: readonly RunDifficulty[];
  onCellDone?: (summary: CellSummary) => void;
}

export interface CellSummary {
  playerClass: PlayerClass;
  difficulty: RunDifficulty;
  runs: number;
  completionRate: number;
  completionCi: [number, number];
  meanBattlesCleared: number;
  perBattleWinRate: number;
  perBattleCi: [number, number];
  perEncounterWinRate: number[];
  perEncounterAttempts: number[];
  meanTurnsPerBattle: number;
  stalledBattles: number;
}

export function wilsonInterval(successes: number, total: number): [number, number] {
  if (total <= 0) return [0, 1];
  const z = 1.96;
  const p = successes / total;
  const denominator = 1 + (z * z) / total;
  const center = (p + (z * z) / (2 * total)) / denominator;
  const margin = (z * Math.sqrt((p * (1 - p)) / total + (z * z) / (4 * total * total))) / denominator;
  return [Math.max(0, center - margin), Math.min(1, center + margin)];
}

export function summarizeCell(results: readonly RunSimulationResult[], playerClass: PlayerClass, difficulty: RunDifficulty): CellSummary {
  const runs = results.length;
  const completedRuns = results.filter((result) => result.completed).length;
  const battlesWon = results.reduce((total, result) => total + result.battlesWon, 0);
  const battlesPlayed = results.reduce((total, result) => total + result.encounterResults.length, 0);
  const totalTurns = results.reduce((total, result) => total + result.encounterResults.reduce((sum, entry) => sum + entry.turns, 0), 0);
  const perEncounterAttempts = Array.from({ length: TOTAL_ENCOUNTERS }, () => 0);
  const perEncounterWins = Array.from({ length: TOTAL_ENCOUNTERS }, () => 0);
  for (const result of results) {
    for (const entry of result.encounterResults) {
      if (entry.index < 0 || entry.index >= TOTAL_ENCOUNTERS) continue;
      perEncounterAttempts[entry.index]! += 1;
      if (entry.won) perEncounterWins[entry.index]! += 1;
    }
  }
  return {
    playerClass,
    difficulty,
    runs,
    completionRate: runs === 0 ? 0 : completedRuns / runs,
    completionCi: wilsonInterval(completedRuns, runs),
    meanBattlesCleared: runs === 0 ? 0 : battlesWon / runs,
    perBattleWinRate: battlesPlayed === 0 ? 0 : battlesWon / battlesPlayed,
    perBattleCi: wilsonInterval(battlesWon, battlesPlayed),
    perEncounterWinRate: perEncounterWins.map((wins, index) => (perEncounterAttempts[index]! === 0 ? 0 : wins / perEncounterAttempts[index]!)),
    perEncounterAttempts,
    meanTurnsPerBattle: battlesPlayed === 0 ? 0 : totalTurns / battlesPlayed,
    stalledBattles: results.reduce((total, result) => total + result.stalledBattles, 0),
  };
}

export function simulateBatch(options: BatchOptions): CellSummary[] {
  const summaries: CellSummary[] = [];
  for (const difficulty of options.difficulties) {
    for (const playerClass of options.classes) {
      const results: RunSimulationResult[] = [];
      for (let index = 0; index < options.runs; index += 1) {
        results.push(simulateRun(options.baseSeed + index * SEED_STRIDE, playerClass, difficulty));
      }
      const summary = summarizeCell(results, playerClass, difficulty);
      summaries.push(summary);
      options.onCellDone?.(summary);
    }
  }
  return summaries;
}

export function averageCompletion(cells: readonly CellSummary[], difficulty: RunDifficulty): number | null {
  const relevant = cells.filter((cell) => cell.difficulty === difficulty);
  if (relevant.length === 0) return null;
  return relevant.reduce((total, cell) => total + cell.completionRate, 0) / relevant.length;
}

export interface ClassGap {
  metric: "completion" | "perBattle";
  gapPp: number;
}

export function classGap(cells: readonly CellSummary[], difficulty: RunDifficulty): ClassGap {
  const relevant = cells.filter((cell) => cell.difficulty === difficulty);
  const saturated = relevant.some((cell) => cell.completionRate < SATURATION_LOW || cell.completionRate > SATURATION_HIGH);
  const metric = saturated ? "perBattle" : "completion";
  const values = relevant.map((cell) => (metric === "completion" ? cell.completionRate : cell.perBattleWinRate));
  if (values.length < 2) return { metric, gapPp: 0 };
  return { metric, gapPp: (Math.max(...values) - Math.min(...values)) * 100 };
}
