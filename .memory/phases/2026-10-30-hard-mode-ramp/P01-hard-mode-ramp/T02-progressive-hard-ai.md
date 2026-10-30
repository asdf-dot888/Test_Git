# Task: T02 Progressive Legal Hard AI

## Status: done

## Goal

Make Hard AI increasingly tactical and aggressive after the first Phase 1 battle, plan a complete legal card-play turn, and follow the same board-blocking combat rule as the player.

## Decision Summary

- The first Phase 1 battle keeps the current Hard AI planning strength; tactical strength grows after each completed battle.
- Hard AI may inspect the player's hidden hand and draw-pile order, but gains no extra mana/actions and cannot bypass combat rules.
- Prefer direct player-hero damage when legal. If player minions remain, prioritize ready threats and available kills instead.
- Normal AI behavior stays unchanged.

## Implementation

### I01. Add deterministic full-turn card planning for Hard mode

- Related Files:
  - `packages/game-core/src/engine.ts` :: `scoreEnemyCard`, `selectEnemyCard`, `playEnemyCard`, and `resolveEnemyTurnWithPlayback`; use the existing card scorer and effect resolver to search legal card sequences, then execute the selected sequence through the existing playback path.
  - `packages/game-core/src/engine.test.ts` :: Hard tactical AI tests; cover combination selection, progression, and Normal-mode compatibility.

#### Details

- Keep the current repeated `selectEnemyCard` behavior for Normal and for Hard when `completedBattles === 0`.
- For later Hard encounters, add a deterministic beam search over legal enemy hand plays. A search node contains a cloned `RunState`, the ordered list of selected enemy hand `instanceId`s, and cumulative plan score.
- At each depth, enumerate only cards in the node's current `enemyHand` for which `isEnemyCardPlayable(card, battle)` returns true. For each candidate, clone the node state and simulate that card through `playEnemyCard(clone, instanceId, true)` so costs, board slots, effects, target selection, hidden-information heuristics, and RNG all use existing game rules. Candidate simulations must not append presentation playback steps or mutate the real run.
- Score each transition using `scoreEnemyCard(card, prePlayBattle, enemy, "hard")`; add a resulting-board value of `3 * attack + 2 * health` per enemy minion and subtract `4 * attack + health` per surviving player minion. This gives the search a concrete value for combinations that remove threats or build a board.
- Expand a node until no legal card remains or every card in its hand has been considered. Keep only the highest-scoring `beamWidth` nodes after each depth, using a stable tie-break by original hand slot and then instance ID. Set `beamWidth = min(32, 8 + 2 * completedBattles)` so planning capability grows with completed battles and is capped at 32.
- Select the terminal sequence with the highest cumulative score. If no legal card is available, select an empty sequence.
- Execute the chosen sequence against the real `RunState`, resolving each instance ID through the current enemy hand and invoking `playEnemyCard` once. After every real play, record the same `EnemyCombatRecord` and `EnemyTurnPlaybackStep` used today. Stop if the run ends or the player hero is defeated.
- Add a Hard-mode aggression bonus of `2 * completedBattles` to legal hero-damage spell scoring when `playerBoard.length === 0`. Do not award this bonus when the spell must target player minions. Preserve existing profile and hidden-hand/draw-pile scoring.

### I02. Enforce legal Hard enemy attacks and prioritize blockers

- Related Files:
  - `packages/game-core/src/engine.ts` :: `resolveEnemyMinionAttacks`; choose a legal target for each ready enemy attacker.
  - `packages/game-core/src/engine.test.ts` :: existing Hard enemy attack targeting test; replace its lethal-through-board expectation and add empty-board direct-attack coverage.

#### Details

- Remove the Hard-only branch that attacks `playerHero` when attack is lethal while `playerBoard` is nonempty.
- If `playerBoard.length === 0`, a ready Hard enemy minion attacks `playerHero` regardless of whether that attack is lethal; create the normal `EnemyCombatRecord` and playback step, then resolve damage with the existing `deferDefeat` handling.
- If player minions exist, attack only one of those minions. Rank legal targets by: killable by the current attack first; then able to attack on its next turn (`summonedTurn < battle.turnNumber`, not already attacked, not rooted); then higher attack; then lower remaining health; then original board index. Keep Normal target ordering unchanged.
- Preserve `hasAttacked`, simultaneous combat damage, death cleanup, and loss handling.

### I03. Verify tactical and progression behavior

- Related Files:
  - `packages/game-core/src/engine.test.ts` :: Hard tactical AI test group.

#### Details

- Test that Hard AI attacks the player hero only when `playerBoard` is empty, including a nonlethal attack.
- Test that Hard AI never attacks the hero through a nonempty player board, even when the attack would be lethal.
- Test that when blocked, Hard AI chooses a killable ready threat according to the target ordering above.
- Test a hand where a multi-card combination has a higher specified plan score than the greedy first-card choice and assert that the planned order is executed.
- Test `completedBattles === 0` retains the existing Hard card selection path, later battles use the planner, beam width respects the formula/cap, and Normal selection/attacks remain unchanged.

## Acceptance Criteria

- [ ] Hard AI evaluates legal multi-card sequences before spending mana after the opening battle.
- [ ] Planning gets a larger beam after each completed battle, capped at 32.
- [ ] Hard AI obeys player-minion blockers and attacks the hero when the board is clear.
- [ ] Target selection removes killable, ready threats using the specified stable ordering.
- [ ] Normal AI behavior is unchanged.

## Validation

- `npm run test --workspace @board-game/game-core -- src/engine.test.ts` — all AI and engine tests pass.
- `npm run build --workspace @board-game/game-core` — TypeScript build passes.

## Commit Message

```text
feat(game-core): plan progressive hard enemy turns

Plan: 2026-10-30-hard-mode-ramp
Phase: P01-hard-mode-ramp
Task: T02-progressive-hard-ai

- Search legal Hard-mode card sequences with progressive beam width
- Enforce blocker rules and prioritize threatening minions
```

## Progress

- [x] Implementation complete
- [x] Validation passed
- commit: pending
