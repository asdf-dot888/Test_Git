# Task: T02 Enemy Attack Planning

## Status: todo

## Goal
Replace the greedy enemy attack code with a small search that chooses the order of attackers, their targets, and when to hold an attack back, so the enemy takes good trades, avoids bad ones and opens the way to the player hero when it can.

## Decision Summary
D09 part 4 (as corrected in the plan: a side can hit the opposing hero only while the opposing board is empty, so "go face" is already automatic; the missing intelligence is ordering, trades and holding back). Applies to both difficulties; normal difficulty must not use hidden information (attack planning only reads the public boards, heroes and own board, never the hand or draw pile). The first battle keeps the old greedy behavior (the README says the first battle keeps the base rules).

## Implementation (`packages/game-core/src/engine.ts`)
### I01. Planner
- New `function planEnemyAttacks(run: RunState): EnemyAttackStep[]` with `interface EnemyAttackStep { attackerId: string; targetId: string }` (`targetId` is a player minion's `instanceId` or `run.battle.playerHero.id`).
- Eligible attackers are exactly those the current loop allows (`attack > 0`, `summonedTurn < battle.turnNumber`, not `hasAttacked`, no `root` status). Targets: every living player minion; the player hero only while `playerBoard` is empty. A step list may stop early (holding the remaining attackers back).
- Search: beam search like `planEnemyTurn`. A node is a `cloneRun` after applying a step with the same helpers the executor uses (`applyMinionCombatDamage`, `removeDeadMinions`, `dealDamageToPlayerHero(..., true)`), the steps so far and a score. Expand by (eligible attacker, target) pairs plus one "stop" terminal; keep the best `ENEMY_ATTACK_BEAM_WIDTH[difficulty]` nodes per depth, depth at most the number of eligible attackers. Pick the best node, ties broken by the order of attackers on the board (stable and deterministic, no random draws).
- Score of a state (constants at the top of the file, `ENEMY_ATTACK_WEIGHTS`): `sum(minionValue(enemy minions)) - ENEMY_ATTACK_WEIGHTS.playerMinion * sum(minionValue(player minions)) + ENEMY_ATTACK_WEIGHTS.heroDamage * (player hero health lost) + (player hero dead ? 100000 : 0)`, with `minionValue = 3 * attack + 2 * health` (+ a small constant for minions that have a status or effect, same spirit as `enemyBoardValue`). Starting values: `playerMinion = 1.2`, `heroDamage = 4`.
- Strength per difficulty: `ENEMY_ATTACK_BEAM_WIDTH = { normal: 3, hard: 8 }` (starting values, tuning knobs for P04-T04).
- Planning only from the second battle (`run.completedBattles > 0`), exactly like `planEnemyTurn`; in the first battle keep the existing sort-based target choice (move it unchanged into a helper `greedyEnemyAttackTarget`).
### I02. Executor
- `resolveEnemyMinionAttacks` keeps its signature and `onAttack` callbacks. When a plan exists it executes the steps in order, skipping a step whose attacker or target is gone (re-validate before each step, because earlier steps change the board), and records the same `EnemyCombatRecord` shape as today (`type: "attack"`, `cardId`, `attackerId`, `targetId`). When a step's target no longer exists but the player board is empty it hits the hero, as the current code does. Remaining attackers after the plan are held back (not forced to attack).
- Do not change boss area attack timing or the order of the enemy turn (cards first, then minion attacks, then the boss area attack).
### I03. Tests (`packages/game-core/src/engine.test.ts` or a new `engine.enemyAttack.test.ts`)
- Crafted scenarios (set up `run.battle` boards directly like the existing enemy tests do), each comparing the new result with what the old greedy code would do (keep the old rule as the helper from I01 so tests can call it):
  1. Bad trade is skipped: enemy 2/1 vs a player 1/5 that cannot be killed and would only cost the attacker (the attacker stays alive and keeps blocking).
  2. Good trade is taken: a cheap enemy minion kills a valuable player minion.
  3. Order matters: two attackers where the first greedy attacker wastes its attack and the right order clears the last blocker so the second attacker hits the hero.
  4. Lethal: with the player hero at low health and one blocker, the plan kills the blocker and then hits the hero for lethal.
  5. First battle (`completedBattles === 0`) behaves exactly as before.
- Property test: over 200 generated boards (use the seeded `random.ts` helpers, at most 6 minions per side) the planned result's score is never lower than the greedy result's score.
- Determinism: the same run produces the same plan twice; the enemy turn playback test (`App.enemy-turn-playback.test.tsx`) and `EnemyCombatRecord` consumers still work.
- Performance guard: an enemy turn with 6 attackers against 6 minions runs under a generous bound (for example 250 ms) in a test, and the balance simulation speed stays about the same order (note the time of a 100-run simulation before and after in the Progress notes).

## Acceptance Criteria
- [ ] The five crafted scenarios and the property test pass.
- [ ] No hidden information is read by the attack planner (code review point; no access to `playerHand`/`drawPile`).
- [ ] All existing enemy turn tests pass (update only expectations that depended on the old greedy order, and say which).
- [ ] Build, lint and tests pass.

## Validation
- `npm run build`
- `npm test -- packages/game-core/src/engine.test.ts apps/web/src/App.enemy-turn-playback.test.tsx`
- `npm run balance:sim -- --runs 100 --label attack-planning-smoke` (just to see it runs and its speed)
- `npm test`, `npm run lint`

## Commit Message
```text
feat(core): plan enemy attacks with a small search instead of greedy targets

Plan: 2026-11-24-playtest-feedback-round
Phase: P04-enemy-difficulty
Task: T02-enemy-attack-planning
```

## Progress
- [ ] implementation complete
- [ ] validation passed
- commit: pending
