# Plan: Class/Card/Enemy Balance via Simulation Bot

- Date: 2026-11-17
- Decisions: [2026-11-17-class-balance-simulation](../decisions/2026-11-17-class-balance-simulation.md)
- Status: done (2026-11-17). Hard class gap 24.0pp -> 1.7pp on an independent seed; see `docs/balance/2026-11-17-final.md`.

## Goal
Build a headless simulation bot on the pure-function engine, measure class win rates for Normal and Hard difficulty, then tune numeric values only so the three classes land within ±5 percentage points of each other.

## Architecture
- New dev-only module `packages/game-core/src/balance/` (`bot.ts`, `simulate.ts`, `report.ts`, `cli.ts` plus tests). It is NOT re-exported from `packages/game-core/src/index.ts`, so the web bundle and API never import it.
- The CLI runs from the compiled output: `npm run balance:sim` builds game-core, then runs `node packages/game-core/dist/balance/cli.js`. (Source imports use `.js` suffixes, so Node cannot run the `.ts` directly.)
- Reports are Markdown files in `docs/balance/`.
- The bot only calls exported engine functions: `createRun`, `redrawOpeningHand`, `discardBeforeDraw`, `fuseMinions`, `playMinion`, `castSpell`, `useHeroPower`, `attackWithMinion`, `endPlayerTurn`, `acknowledgeVictory`, `chooseReward`, `chooseRewardAndDiscard`, `skipReward`, `advanceRun`. It must obey every engine rule (no engine changes needed for the bot).

## Engine flow the bot must follow (verified in `engine.ts`)
1. `createRun(seed, playerClass, difficulty)` starts encounter 1 with `run.battle` set.
2. On the player's turn: handle `battle.pendingDiscardBeforeDraw` with `discardBeforeDraw`, optional `redrawOpeningHand` (only while `run.openingHandRedrawAvailable`), then play/cast/fuse/use hero power/attack, then `endPlayerTurn` (which resolves the enemy turn).
3. After a win (`battle.status === "playerWon"`): if `run.pendingVictoryAcknowledgement` call `acknowledgeVictory`; then `chooseReward` / `chooseRewardAndDiscard` (deck cap 35, max 2 copies per card) or `skipReward`; then `advanceRun(run, nextSeed)`. After the last boss, `run.status === "victory"`.
4. On a loss `run.status === "defeat"`.
5. Safety caps: at most 60 actions per turn and 80 turns per battle; a stalled battle counts as a loss and is flagged.

## Metrics and judging rule
- Per (class, difficulty): expedition completion rate, mean battles cleared (0-12), per-battle win rate, per-encounter win rate (12 encounters), mean turns per battle, with 95% Wilson intervals.
- Primary judge: completion-rate gap ≤ 5pp between classes. If any class completes <2% or >98% (metric saturated, almost no information), judge by per-battle win rate instead and record that choice in the report. Success is judged per difficulty.
- Rule correction (2026-11-17, during P01-T03): the first draft used 10%/90%. The baseline showed Hard completion of 7.8% / 14.0% / 31.8% (a 24pp gap) that the 10% threshold wrongly hid behind per-battle rates, so the thresholds were tightened to 2%/98%.
- Seeds are paired: run `i` uses the same seed for every class.

## Phases
| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `done` | Build the simulation bot, batch runner, CLI, and baseline report | [P01](../phases/2026-11-17-class-balance-simulation/P01-simulation-harness/phase.md) |
| P02 | `done` | Tune numeric values from measurements and verify the ±5pp goal | [P02](../phases/2026-11-17-class-balance-simulation/P02-balance-tuning/phase.md) |

## Risks
- A weak bot could produce ~0% completion and hide differences. Mitigation: per-battle win rate and per-encounter breakdown; improve bot heuristics in T01/T02 before tuning.
- Hard-mode AI search may make simulation slow. Mitigation: CLI `--runs` flag; pick run counts from measured speed in P01-T03.
- Tuning changes break existing tests with hard-coded numbers. Mitigation: update expectations only where a number intentionally changed (P02).
