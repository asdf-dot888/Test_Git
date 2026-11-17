# Decisions: Overall Difficulty Uplift (Normal and Hard)

- Date: 2026-11-17
- Status: Confirmed
- Related decisions: `2026-10-30-hard-mode-ramp.md`, `2026-10-30-tutorial-hard-mode.md`, `2026-11-17-class-balance-simulation.md`
- Scope: Make enemies stronger on both Normal and Hard so the game is no longer "too easy". No new content (cards, enemies, classes).

## D01. Scope
- **Chosen**: Raise difficulty on both Normal and Hard.
- **Rationale**: The user finds the game too easy overall. The balance simulation (docs/balance/2026-11-17-final.md) showed the bot clears ~100% of Normal and ~17% of Hard.

## D02. Targets and tolerance (bot simulation, per-difficulty average of the three classes)
- **Chosen**: Normal expedition completion about 60%; accepted range 55-65%.
- **Chosen**: Hard expedition completion about 8%; accepted range 6-10%.
- **Chosen**: The existing class-parity rule stays: class completion gap <= 5pp on each difficulty (see the balance plan).
- **Caveat**: The bot is weaker than a human, so real play will feel easier than these numbers. The user accepted this; the targets are for relative, repeatable calibration only.
- **Judging**: Use `npm run balance:sim` with at least 500 runs per cell for the final check; use an independent seed for final verification.

## D03. Allowed ways to strengthen enemies
- **Chosen**: Enemy stat strengthening (hero health and minion stat bonuses). Normal gains phase-based bonuses similar in shape to the existing `HARD_PHASE_*` constants; Hard values are raised as needed. Exact numbers are found by simulation.
- **Chosen**: Normal-mode AI strengthening (see D04).
- **Not chosen**: Enemy deck composition/mana-curve changes; boss-only strengthening. These stay out of scope.
- **Not allowed**: New cards, new enemies, new rules or hero power rule changes, player nerfs beyond what class parity already tuned.

## D04. Normal-mode AI
- **Chosen**: Normal AI plans a complete legal turn (card combination and play order before spending mana), like Hard's planner.
- **Chosen**: Normal AI must NOT use hidden information (the player's hand and deck order). Hard keeps its existing hidden-information access.
- **Chosen**: The AI gets no extra mana, extra actions, or exceptions to combat rules.
- **Interpretation**: Reuse the Hard planner (`planHardEnemyTurn`, beam width ramp) with a visible-information-only variant for Normal. Other Hard-only behaviors (direct hero attack when the player board is empty, boss area-attack cadence every 2 turns) are not part of this decision.

## D05. First battle
- **Chosen**: The first battle keeps its current rules in BOTH difficulties (no new stat bonuses, Normal AI stays on the existing single-card selection, Hard keeps its existing first-battle behavior). The uplift applies from the second battle onward.
- **Rationale**: The tutorial runs inside the real first battle; new players must not be stopped there.

## D06. Out of scope / compatibility
- **Not changed**: Leaderboard scoring, API, and stored data. Harder battles will make future leaderboard progress harder to reach; existing entries keep their values.
- **Saved runs**: Enemy stat bonuses are computed from the run's difficulty and phase when a minion or hero is created, so in-progress saves continue without migration. Already-created minions keep the stats they were created with.
- **Not changed**: Card IDs, names, effect kinds, and save formats.

## Implementation notes
- Relevant code: `packages/game-core/src/engine.ts` (`HARD_PHASE_HERO_HEALTH_BONUS`, `HARD_PHASE_MINION_STAT_BONUS`, `createMinion`, `beginEncounter`, `selectEnemyCard`, `planHardEnemyTurn`, `resolveEnemyTurnWithPlayback`, `hardAiBeamWidth`).
- The simulation bot (`packages/game-core/src/balance/`) already measures completion; Normal at ~60% means the completion-rate metric is no longer saturated, so class gaps become measurable on Normal too.
- Update tests that assert current Normal/Hard enemy stats or AI behavior only where the change is intentional.
