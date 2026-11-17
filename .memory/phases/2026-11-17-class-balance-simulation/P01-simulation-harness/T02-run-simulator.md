# Task: T02 Run Simulator

## Status: done

## Goal
Simulate a full 12-encounter expedition with the bot (battle play, victory acknowledgement, reward selection, advancing) and aggregate results over many seeds, classes, and difficulties.

## Decision Summary
- D03: reward selection uses a stat-efficiency heuristic with class preference and fusion awareness.
- Metrics and judging rule are defined in the plan (completion rate, mean battles cleared, per-battle and per-encounter win rate, Wilson 95% intervals). Seeds are paired across classes.

## Implementation
### I01. Reward policy
- `packages/game-core/src/balance/simulate.ts` (new)
  - `export function chooseBotReward(run: RunState): { cardId: string; discardInstanceId?: string } | null`
    - Candidates: `run.pendingReward.choices` minus cards already at 2 copies in `run.deck`.
    - Score = `cardValue(card)` (from `bot.ts`) + 0.5 when `card.classId === run.playerClass` + a fusion bonus (+1.0) when the card is a source of a `FUSION_RECIPES` entry for the class whose other source is already in the deck or on offer.
    - Return `null` (skip) when the best score is below the deck's mean `cardValue`; this mirrors a sensible human skip.
    - When `run.deck.length >= 35`, include `discardInstanceId` = lowest-value non-source card (`chooseRewardAndDiscard`).
### I02. Single-run simulator
- `export interface RunSimulationResult { seed: number; playerClass: PlayerClass; difficulty: RunDifficulty; completed: boolean; battlesWon: number; failedEncounterIndex: number | null; encounterResults: Array<{ index: number; won: boolean; turns: number }>; stalledBattles: number; finalDeckSize: number }`
- `export function simulateRun(seed: number, playerClass: PlayerClass, difficulty: RunDifficulty): RunSimulationResult`
  - Loop: while `run.status === "active"`: if `run.battle?.status === "active"` call `playBotTurn` (turn cap 80 per battle, over cap = loss + `stalledBattles += 1`); on `playerWon`: `acknowledgeVictory` if `pendingVictoryAcknowledgement`, apply `chooseBotReward` (or `skipReward`), then `advanceRun(run, run.seed + run.completedBattles * 7919 + 1)`; on `run.status === "defeat"` stop. Hard iteration guard of 2000 loop iterations; exceeding it throws an Error naming the seed (so bugs surface).
### I03. Batch statistics
- `export interface BatchOptions { runs: number; baseSeed: number; classes: PlayerClass[]; difficulties: RunDifficulty[] }`
- `export interface CellSummary { playerClass: PlayerClass; difficulty: RunDifficulty; runs: number; completionRate: number; completionCi: [number, number]; meanBattlesCleared: number; perBattleWinRate: number; perBattleCi: [number, number]; perEncounterWinRate: number[]; meanTurnsPerBattle: number; stalledBattles: number }`
- `export function simulateBatch(options: BatchOptions): CellSummary[]` (seed for run `i` = `baseSeed + i * 7919`, identical across classes).
- `export function wilsonInterval(successes: number, total: number): [number, number]` (z = 1.96).
- Win-rate gap helper: `export function classGap(cells: CellSummary[], difficulty: RunDifficulty): { metric: "completion" | "perBattle"; gapPp: number }` applying the plan's judging rule (use per-battle when any class completion is <10% or >90%).
### I04. Tests
- `packages/game-core/src/balance/simulate.test.ts` (new)
  - `wilsonInterval(50, 100)` is within [0.40, 0.60] and contains 0.5; `wilsonInterval(0, 10)` lower bound is 0.
  - `chooseBotReward` skips a clearly worse card and prefers a fusion partner.
  - `simulateRun` is deterministic (same inputs => deep-equal result) and terminates for 10 seeds x 3 classes x 2 difficulties.
  - `simulateBatch({ runs: 5, ... })` returns 6 cells with rates in [0, 1] and consistent counts.
  - `classGap` switches to `perBattle` when a class completion rate is saturated.

## Acceptance Criteria
- [ ] A simulated run always terminates in victory or defeat (no infinite loops, no thrown rule violations).
- [ ] Results are fully deterministic for a given base seed.
- [ ] Batch summary and gap helper tested.
- [ ] Nothing exported from `index.ts`.

## Validation
- `npm test -- packages/game-core/src/balance/simulate.test.ts`
- `npm test -- packages/game-core/src/balance/bot.test.ts`
- `npm run lint`

## Commit Message
```text
feat(balance): add run simulator and batch statistics

Plan: 2026-11-17-class-balance-simulation
Phase: P01-simulation-harness
Task: T02-run-simulator
```

## Progress
- [x] implementation complete
- [x] validation passed: balance tests 16/16, lint clean, game-core build clean.
- Measured speed: about 0.14 s per simulated run (used to size the T03 baseline).
- Extra exports beyond the blueprint: `summarizeCell`, `SATURATION_LOW/HIGH`, `BatchOptions.onCellDone` (progress callback for the CLI), `CellSummary.perEncounterAttempts`.
- commit: see Git history
