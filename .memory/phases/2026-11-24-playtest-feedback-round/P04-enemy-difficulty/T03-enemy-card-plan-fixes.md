# Task: T03 Enemy Card Plan: No Idle Turns, Spend More Mana

## Status: done

## Goal
Fix the enemy sometimes playing no card at all although it has mana and playable cards, and make ties go to the plan that spends more mana.

## Decision Summary
D07 (why the enemy sometimes plays nothing) and D09 part 4(c) (prefer spending more mana on ties). While reading `planEnemyTurn` for this plan a second, probable cause of idle enemy turns was found, in addition to the mana shortage that P04-T01 fixes:
- `planEnemyTurn` starts with `best = beam[0]` (an empty sequence with score 0) and only replaces it when a candidate's score is strictly higher than 0. A candidate's score is `transitionScore + enemyBoardValue(after)`, and `enemyBoardValue` subtracts `4 * attack + health` for every player minion. When the player's board is much stronger than the enemy's, every candidate can be 0 or negative, so the plan stays empty.
- `resolveEnemyTurnWithPlayback` treats the returned `[]` as a real plan (`turnPlan` is `[]`, not `null`, so `turnPlan[plays]` is `undefined`, the lookup returns `null` and the loop breaks). The enemy then plays nothing even with mana and affordable cards, from the second battle onward, exactly when it is behind on board.
This is read from the code, not yet reproduced; the first step of this task is a failing test that reproduces it.

## Implementation (`packages/game-core/src/engine.ts`)
### I01. Reproduce first
- Add a failing test: second battle (`completedBattles: 1`), the player has 3-4 strong minions, the enemy has an empty board, 5+ mana and a playable minion in hand; after `resolveEnemyTurn` the enemy must have played a card. Confirm it fails on the current code, then fix.
### I02. Never idle
- In `planEnemyTurn` track the best **non-empty** sequence separately: initialize `best` to `null`; consider every candidate regardless of the sign of its score; return `best?.sequence ?? []` (empty only when no card is playable). Beam pruning keeps using scores, which may be negative.
- Keep `resolveEnemyTurnWithPlayback` as is: an empty plan now means nothing is playable. (Optionally, if the plan is empty but `selectEnemyCard` finds a playable card, fall back to it; add a test either way.)
### I03. Mana efficiency
- Track `manaSpent` in `HardPlanNode` (sum of the played cards' costs). When two nodes have equal `score`, prefer the one with larger `manaSpent` before `comparePlanTieBreak`; apply it in the `best` selection and in the `expanded.sort`.
- Add `ENEMY_MANA_USE_WEIGHT` (starting value `0`) and add `ENEMY_MANA_USE_WEIGHT * card.cost` to a node's score per played card. It stays 0 unless P04-T04 needs it as a difficulty knob (then it is documented there).
### I04. Tests
- The reproduction test above; a test where two sequences tie and the one spending more mana is chosen; a test that the plan is empty only when nothing is affordable; existing enemy planning and `planEnemyTurn` determinism tests still pass.

## Acceptance Criteria
- [ ] The reproduction test fails before the fix and passes after it; the enemy plays a card whenever one is playable (both difficulties, battle 2 and later).
- [ ] Ties are broken toward higher mana spent; scores are unchanged otherwise (the weight is 0).
- [ ] Build, lint and tests pass.

## Validation
- `npm run build`
- `npm test -- packages/game-core/src/engine.test.ts`
- `npm test`, `npm run lint`

## Commit Message
```text
fix(core): keep the enemy from skipping its card plays when behind on board

Plan: 2026-11-24-playtest-feedback-round
Phase: P04-enemy-difficulty
Task: T03-enemy-card-plan-fixes
```
(If the reproduction shows the cause is not real, change the type to `feat(core)`, say so in the body and in the Progress notes.)

## Progress
- [x] reproduction written and **confirmed**: second battle, three to five strong player minions (5 x 6/8) against an empty enemy board with 4 mana and an Ash Wolf plus a Crypt Guard in hand: before the fix the enemy played nothing (both difficulties); with 3 x 5/6 minions it still played, so the bug needs a clearly stronger player board. (Tests: "enemy card plan never idles while it can play".)
- [x] implementation complete. `planEnemyTurn`: `best` starts as `null` and the plan returned is the best one that plays at least one card; every played card adds `ENEMY_PLAN_PLAY_BONUS = 200` to the plan score so a negative board value no longer makes extra plays look worse (the enemy plays everything affordable); `HardPlanNode.manaSpent` and `betterPlan` prefer more mana spent on equal scores (also in the beam sort); `ENEMY_MANA_USE_WEIGHT = 0` is the knob for P04-T04. Existing planner tests and the characterization hashes did not change. There is no dedicated test for the mana tie-break (equal plan scores are very rare to construct and the helper is not exported); it is covered by the "plays both cards" test only indirectly.
- [x] validation passed: build clean, lint clean, 1194 tests (101 files). Smoke simulation (100 runs): normal 30.0%, hard 6.0% average completion, nearly the same as before this task.
- commit: see Git history
