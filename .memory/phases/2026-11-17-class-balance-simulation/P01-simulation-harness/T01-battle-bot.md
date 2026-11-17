# Task: T01 Battle Bot

## Status: done

## Goal
Create a deterministic bot that plays one complete, legal player turn (including ending it) through the public engine API.

## Decision Summary
- D02/D03: headless bot on the pure-function engine; simple greedy heuristics; dev-only.
- The bot must never bypass engine rules (blocking, mana, board cap, targeting).

## Implementation
### I01. Types and entry point
- `packages/game-core/src/balance/bot.ts` (new)
  - `export interface BotTurnReport { actions: number; stalled: boolean }`
  - `export function playBotTurn(run: RunState): { run: RunState; report: BotTurnReport }`
    - Precondition: `run.battle?.status === "active"` and `activeSide === "player"`.
    - Returns the run after `endPlayerTurn` (enemy turn already resolved), or earlier if the battle ended (`playerWon` / `playerLost`).
  - Helpers (module-private, deterministic, no `Math.random`; ties broken by `instanceId` ascending):
    - `handleOpeningTurn(run)`: if `run.openingHandRedrawAvailable` and the hand has no card with cost <= 2, call `redrawOpeningHand`.
    - `handlePendingDiscard(run)`: if `battle.pendingDiscardBeforeDraw`, call `discardBeforeDraw` on the lowest-value hand card (value = `cardValue`).
    - `cardValue(card: CardDefinition): number`: minions = (attack + maxHealth + effect bonus) / max(cost, 1); spells use a fixed score table by `effect.kind` (damage/removal highest, draw medium, heal low). Pure function, exported for tests.
    - `tryFuse(run)`: if any pair on `battle.playerBoard` matches a `FUSION_RECIPES` entry for `run.playerClass` and mana >= 1 and result stat total > sum loss threshold (always accept; fusion recipes are strictly stronger), call `fuseMinions`.
    - `spendMana(run)`: repeat until nothing affordable/legal: removal spells on the best target, then minions by `cardValue` desc that fit the board (max 6), then buff spells on the highest-attack ready minion, then draw/heal spells (heal only when hero health <= 20 or minion damaged). Catch `GameError` per attempted action and skip that action (do not abort the turn).
    - `useHeroPowerIfUseful(run)`: warrior = if mana >= 2 left after spending; assassin = target a killable minion, else enemy hero; demonist = if `soulShards >= 3`, mana >= 2, board < 6. Leave at least the cost of a playable card unspent only if a playable card still exists (spend cards first).
    - `attackPhase(run)`: for each ready minion (`summonedTurn < turnNumber`, not `hasAttacked`, not rooted): while enemy minions exist, choose the enemy target that the attacker kills; prefer trades where the attacker survives, then trades where the target's cost >= the attacker's cost. Skip the attack when every available trade is bad (the attacker dies without killing, or trades down in cost) and the bot's hero health is above 15; otherwise attack the highest-attack enemy minion. With an empty enemy board, attack `battle.enemyHero.id`.
    - Action cap: 60 engine calls per turn; if exceeded, set `report.stalled = true` and call `endPlayerTurn`.
- Public types used from `./../types.js` and functions from `./../engine.js`, `./../catalog.js` (relative imports with `.js` suffix).
- `packages/game-core/src/index.ts` MUST NOT be changed (bot stays dev-only).

### I02. Tests
- `packages/game-core/src/balance/bot.test.ts` (new)
  - `cardValue` orders a 4/4 for 4 above a 1/1 for 4.
  - `playBotTurn` on `createRun(1, "warrior")` returns a run whose `battle.turnNumber` advanced or battle ended, without throwing, for all three classes and both difficulties.
  - Determinism: the same input run yields deep-equal output.
  - Fusion: build a run whose board holds both source minions of one recipe (construct via engine `playMinion` over several turns or by cloning a run and editing `battle.playerBoard`) and assert the fused card id is present after `playBotTurn`.
  - Over 20 seeds x 3 classes, `playBotTurn` never throws and `report.stalled` stays false.

## Acceptance Criteria
- [ ] `playBotTurn` completes a legal turn for every class on both difficulties without throwing.
- [ ] Output is deterministic for identical input.
- [ ] `index.ts` unchanged; no web/API import of `balance/`.
- [ ] Bot tests pass.

## Validation
- `npm test -- packages/game-core/src/balance/bot.test.ts`
- `npm run lint`
- `npm run build --workspace @board-game/game-core`

## Commit Message
```text
feat(balance): add deterministic battle bot for simulation

Plan: 2026-11-17-class-balance-simulation
Phase: P01-simulation-harness
Task: T01-battle-bot
```

## Progress
- [x] implementation complete
- [x] validation passed: bot tests 5/5, lint clean, game-core build clean.
- commit: see Git history
