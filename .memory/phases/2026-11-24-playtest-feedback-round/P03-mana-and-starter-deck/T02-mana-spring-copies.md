# Task: T02 Two Mana Springs in the Starter Deck

## Status: todo

## Goal
New runs start with 2 copies of `mana-spring` (cost 0, +1 mana) instead of 1, and the starter deck stays at 30 cards by removing one copy of a weak duplicated card.

## Decision Summary
D06 (second part, option A). Which card to remove is decided with the balance simulation and reported to the user.

## Implementation
### I01. Pick the card to remove
- Read `SHARED_STARTER_CARD_IDS` in `packages/game-core/src/catalog.ts` (20 cards: nine duplicated minions or spells, plus one `mana-spring` and one `healing-mist`). List the duplicated cards with cost, attack, health and effect (from `CARD_BY_ID`) and shortlist the three weakest (lowest `attack * 2 + health`, no battlecry or useful effect).
- For each of the three candidates, temporarily remove one copy and run `npm run balance:sim -- --runs 300 --difficulty normal --label mana-spring-<candidate> --out <scratchpad path>` (the scratchpad directory, not `docs/balance/`), and also one run of the unchanged deck as a control with the same `--seed`. Pick the candidate whose normal-difficulty completion rate and per-class rates are closest to or above the control. Record the shortlist, the numbers and the pick in this file's Progress notes.
### I02. Apply
- `SHARED_STARTER_CARD_IDS`: add a second `"mana-spring"` and remove one copy of the chosen card. The array stays 20 long (the engine builds the deck as `[...SHARED_STARTER_CARD_IDS, ...classDefinition.starterCardIds]` = 30 cards).
- `STARTER_DECK_CARD_IDS` is a legacy 30-card list that only tests read; leave it unchanged and say so in a one-line comment if one does not exist yet.
- Do not change the class-specific starter cards or the reward pool.
### I03. Tests
- `packages/game-core/src/engine.test.ts` (around lines 286-365): add assertions that a new run's deck contains exactly 2 `mana-spring`, that `SHARED_STARTER_CARD_IDS` has length 20 and the new card counts, and that the deck is still 30 cards for each class. Update any test that depends on the first hand drawn from a given seed (tutorial and opening hand tests may shift because the shuffle input changed; fix the expectation only, never the rule). Check `apps/web` tutorial tests (`App.tutorial.test.tsx`, `tutorialProgress.test.ts`) that rely on a specific opening hand.

## Acceptance Criteria
- [ ] A new run of each class has 30 cards with exactly two `mana-spring`.
- [ ] The chosen card, the simulation numbers and the control are written in the Progress notes and told to the user at close-out.
- [ ] The first-run tutorial still reaches every step (its tests pass without weakening).
- [ ] Build, lint and tests pass.

## Validation
- `npm run build`
- `npm run balance:sim -- --runs 300 --difficulty normal --label mana-spring-check` (once with the final deck; the output stays out of git unless the run is part of P04-T04's report)
- `npm test -- packages/game-core/src/engine.test.ts apps/web/src/App.tutorial.test.tsx`
- `npm test`, `npm run lint`

## Commit Message
```text
feat(core): add a second Mana Spring to the starter deck

Plan: 2026-11-24-playtest-feedback-round
Phase: P03-mana-and-starter-deck
Task: T02-mana-spring-copies
```

## Progress
- [ ] implementation complete (record the removed card here)
- [ ] validation passed
- commit: pending
