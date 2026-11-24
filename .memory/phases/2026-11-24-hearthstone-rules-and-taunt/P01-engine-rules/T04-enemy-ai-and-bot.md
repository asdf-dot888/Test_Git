# Task: T04 Enemy AI, Simulation Bot and Constants Follow the New Rules

## Status: done

## Goal
The enemy card planner, the enemy turn, the simulation bot and the shared constants use the new rules (taunt, fatigue, turn order, the Coin) so the simulation produces meaningful numbers.

## Decision Summary
D03, D06, D08. No difficulty retuning here (that is P03-T01); only make everything work and sensible.

## Implementation
### I01. Enemy card planning (`engine.ts`)
- `planEnemyTurn` / `scoreEnemyCard` / `isEnemyCardPlayable`: the Coin (cost 0, `gainMana`) is played when it allows spending more mana this turn (e.g. the plan with Coin plays a card that costs 1 more than the current mana); `isEnemySpellEffectWasted` already blocks it at 10 mana. Add a test: enemy with 3 mana and a 4-cost minion plus the Coin plays both (Coin first); with nothing to spend the extra mana on, it may keep the Coin.
- Taunt awareness in card scoring: `enemyBoardValue` adds a small bonus for the enemy's own taunt minions while the player's board has ready attackers (`ENEMY_TAUNT_BOARD_BONUS`, start value 6; a tuning knob for P03). No hidden information is read on normal difficulty.
- Enemy fatigue: nothing to plan; make sure the planner's `maxDepth` and loops do not assume a refill (`enemyDrawPile` may be empty).
- Enemy-first: `resolveEnemyTurnWithPlayback` plays its very first turn with 1 mana and 4 cards (3 + draw) or 5 (4 + Coin + draw); add a test that it plays a legal card and that the playback step list is non-empty when it can play.
### I02. Simulation bot (`packages/game-core/src/balance/bot.ts`, `simulate.ts`)
- `simulate.ts`: after creating a run and at every new battle (`startBattle`/`advanceRun`), call `chooseTurnOrder(run, index)` where `index = (run.seed + run.completedBattles) % 2` (deterministic, effectively random); when `firstSide === "enemy"` run `resolveEnemyTurn` once before the bot's first turn. Count "stalled" battles as today.
- `bot.ts`: `chooseAttackTarget` honors taunt (taunt targets only when present; otherwise it may attack the hero). Add a lethal check (total attack of ready minions ≥ hero health with no taunt → attack the hero with all) and a "go face when the enemy board is weak or the bot is ahead on board" rule (start with: attack the hero with minions that would otherwise only make a bad trade); the bot plays the Coin when it lets it spend 1 more mana, `handleOpeningRedraw` accounts for hands of 4. Remove any use of `attackAllReadyMinions` (the bot attacks one by one).
- `bot.test.ts`, `simulate.test.ts`: update expectations; add a test that a bot run with seed N finishes within the turn cap for 20 seeds per class on both difficulties (smoke) and that `firstSide` is chosen both ways across seeds.
### I03. Constants and exports
- `gameConstants` gains `turnOrderRoles`, `coinCardId`, and keeps `turnDrawCount` (now 1); remove constants nobody uses anymore (`CHEAP_CARD_COST` stays if enemy deck building still uses it).
- Update `docs/balance` tooling text if the report header prints rules (`report.ts`): add the new rule summary line.
### I04. Tests
- Re-capture golden hashes if they changed; the property test (planned attacks never worse than greedy) and the "enemy plays whenever it can" tests pass.

## Acceptance Criteria
- [ ] A smoke simulation runs: `npm run balance:sim -- --runs 20 --label rules-smoke --out docs/balance/2026-11-24-hs-rules-smoke.md` completes without exceptions on both difficulties and all classes (the numbers are not judged here; report them in Progress).
- [ ] `npm run build`, `npm test`, `npm run lint` pass.

## Validation
- `npm run build`
- `npm test -- packages/game-core`
- `npm run balance:sim -- --runs 20 --label rules-smoke --out docs/balance/2026-11-24-hs-rules-smoke.md`
- `npm test`, `npm run lint`

## Commit Message
```text
feat(core): teach the enemy AI and the simulation bot taunt, the Coin and turn order

Plan: 2026-11-24-hearthstone-rules-and-taunt
Phase: P01-engine-rules
Task: T04-enemy-ai-and-bot
```

## Progress
- [x] done. Bot: `startBattleAsBot` (picks first/second alternating by seed and battle, plays the enemy's opening turn when second), taunt-aware `chooseAttackTarget` (lethal face, taunt first, bad trade goes face), simulate.ts uses `pickTurnOrder`; engine: `ENEMY_TAUNT_BOARD_BONUS` = 6 in `enemyBoardValue`, `gameConstants.turnOrderRoles/enemyTauntBoardBonus`; the enemy Coin play is covered by the T03 test; report header names the new rules. Smoke simulation (30 runs per cell, ~1 s per cell, report docs/balance/2026-11-24-hs-rules-smoke.md): no stalled battles, about 8 turns per battle, completion 0 % (normal battle win 74-76 %, hard 64-67 %, first boss E4 only 12-42 %); retuning is P03-T01. 1249 tests (101 files), lint and build pass.
- commit: see Git history
