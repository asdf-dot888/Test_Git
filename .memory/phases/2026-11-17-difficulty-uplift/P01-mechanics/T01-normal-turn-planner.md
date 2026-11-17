# Task: T01 Normal Turn Planner

## Status: done

## Goal
Let the Normal AI plan a whole legal turn (card combination and order) from the second battle onward, using only information the player could also see. Hard behavior stays exactly as it is.

## Decision Summary
- D04: Normal plans a full turn, no hidden information, no extra mana/actions/rule exceptions.
- D05: the first battle (`completedBattles === 0`) keeps today's single-card selection in both difficulties.

## Implementation
### I01. Characterization tests first (before any engine change)
- `packages/game-core/src/engine.test.ts` (new describe "enemy turn characterization")
  - For 5 fixed seeds, play a Normal first battle: `createRun(seed, "warrior", "normal")`, `endPlayerTurn` three times, and assert a stable snapshot (enemy board card ids/health, enemy hand size, player hero health, enemy events length). Capture the expected values from the CURRENT code, then hard-code them. These must keep passing after the change (first battle unchanged).
  - Same for 3 Hard seeds from the second battle (`completedBattles = 1` via the existing `winCurrentBattle`/`skipReward`/`advanceRun` helpers) so Hard stays unchanged.
### I02. Planner
- `packages/game-core/src/engine.ts`
  - Rename `planHardEnemyTurn(run, enemy)` -> `planEnemyTurn(run, enemy)`; keep the early return `if (!initialBattle || run.completedBattles === 0) return []`.
  - Inside, replace the hard-coded `"hard"` in `scoreEnemyCard(card, battle, enemy, "hard", ...)` with `run.difficulty`. `scoreEnemyCard` already limits `hasBoardClearSpellInHand`, `hasHighCostMinionInNextDraws`, `hasIncomingRemovalFor` to `difficulty === "hard"`, so Normal never reads the player's hand or draw pile.
  - Beam width: `const beamWidth = run.difficulty === "hard" ? hardAiBeamWidth(run.completedBattles) : normalAiBeamWidth(run.completedBattles)`.
  - New `function normalAiBeamWidth(completedBattles: number): number { return Math.min(16, 4 + completedBattles); }`; export it in `gameConstants` next to `hardAiBeamWidth`.
  - For Normal only, after `playEnemyCard(cloneRun(node.run), ...)` in the planning simulation, re-seed the simulated battle's RNG (`simulated.battle.rngState = normalizeSeed(simulated.battle.rngState ^ 0x9e3779b9)`) so planned random outcomes (random damage, discard, steal) are not the real ones. Hard keeps the unchanged simulation.
  - In `resolveEnemyTurnWithPlayback` replace `const hardPlan = next.difficulty === "hard" && next.completedBattles > 0 ? planHardEnemyTurn(...) : null` with `const turnPlan = next.completedBattles > 0 ? planEnemyTurn(next, enemy) : null`, and rename uses of `hardPlan` to `turnPlan`.
  - Do not change `selectEnemyCard`, `resolveEnemyMinionAttacks`, boss cadence, or any Hard-only rule.
### I03. Tests
- `packages/game-core/src/engine.test.ts`
  - `gameConstants.normalAiBeamWidth(0)` is 4, `(1)` is 5, `(12)` is 16, `(40)` is 16.
  - First-battle characterization tests from I01 still pass (Normal and Hard).
  - Hidden-information independence (Normal, `completedBattles = 1`): build two runs identical except the player's `hand` and `drawPile` (replace with board-clear spells in one), run `endPlayerTurn`, and assert the enemy's `enemyTurnEvents` (card ids and order) are identical.
  - Hard still reacts: a constructed Hard scenario where the player's hand holds a board-clear spell yields a different plan than the same scenario with an empty player hand (documents the retained hidden-information behavior); if no cheap scenario exists, assert `scoreEnemyCard` indirectly via existing Hard tests and note it in the progress log.
  - Legality: Normal planned turns never overspend mana or exceed the board cap over 20 seeds x 3 turns.
  - Determinism: same input run gives deep-equal output twice.

## Acceptance Criteria
- [ ] Characterization snapshots (Normal and Hard first battle, Hard second battle) unchanged by the refactor.
- [ ] Normal AI plans whole turns from the second battle and cannot see the player's hand/draw order or real random outcomes.
- [ ] Hard behavior unchanged.
- [ ] All tests, lint, build pass.

## Validation
- `npm test -- packages/game-core/src/engine.test.ts`
- `npm test`
- `npm run lint`
- `npm run build`

## Commit Message
```text
feat(ai): plan full Normal enemy turns without hidden information

Plan: 2026-11-17-difficulty-uplift
Phase: P01-mechanics
Task: T01-normal-turn-planner
```

## Progress
- [x] implementation complete: `planHardEnemyTurn` -> `planEnemyTurn`, `normalAiBeamWidth` (min(16, 4 + completedBattles)), Normal re-seeds the planning RNG per simulated step, gate is `completedBattles > 0` for both difficulties.
- [x] validation passed: 770 tests, lint clean, build clean.
- Characterization: 11 hashed enemy-turn snapshots (5 Normal first battle, 3 Hard first battle, 3 Hard second battle) captured from the pre-change engine still pass.
- Hard hidden-information test uses iron-hound/rune-smith (found by search): Hard picks iron-hound with an empty player hand and rune-smith when the player holds a board-clear spell; Normal ignores it.
- Note: `dist/` contains compiled copies of tests and vitest runs them too, so run `npm run build` before `npm test` after editing tests.
- commit: see Git history
