# Plan: First-Run Tutorial and Hard Expedition Mode

## Goal

Add a short interactive tutorial during a player's first expedition, an optional Hard difficulty with much stronger enemy AI and distinct boss cards, and separate Normal/Hard top-ten rankings. Existing Normal-mode game behavior and records remain available. Season 2 is deferred.

Source decision: [First-Run Tutorial and Hard Expedition Mode](../decisions/2026-10-30-tutorial-hard-mode.md)

## Phases

| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `done ✅` | Persist first-run tutorial completion and guide the player through the actual opening battle with action gating and replay entry. | [P01](../phases/2026-10-30-tutorial-hard-mode/P01-first-run-tutorial/phase.md) |
| P02 | `done` | Add run difficulty selection/state, hard-mode enemy and boss mechanics, and hidden-information-aware enemy tactics. | [P02](../phases/2026-10-30-tutorial-hard-mode/P02-hard-expedition/phase.md) |
| P03 | `done` | Store and display separate top-ten progress rankings for Normal and Hard. | [P03](../phases/2026-10-30-tutorial-hard-mode/P03-difficulty-rankings/phase.md) |

## Scope and constraints

- The difficulty is selected before class selection starts the expedition and is fixed for that run. `normal` is the default for existing saved runs and preserves existing rules.
- Hard mode adds 3 health to ordinary enemy heroes and 5 health to boss heroes. Mana progression remains unchanged.
- Hard-mode boss decks each include one copy of three boss-specific cards. Each boss uses its area attack every 2 turns in Hard mode; Normal mode retains the existing every-3-turn cadence.
- Tutorial completion is stored in browser local storage under the signed-in Entra user ID. Skip marks completion. The menu game guide remains the replay entry.
- Rankings are queried and recorded independently by difficulty. Existing legacy leaderboard records without a difficulty field count as Normal records.
- No Season 2 content is included. Do not deploy or push as part of this plan.

## Implementation order

1. Complete P01 so first-time players can learn the current battle loop.
2. Complete P02 so each run has an explicit difficulty and Hard mode is implemented without changing Normal behavior.
3. Complete P03 so ranking submissions and reads carry that difficulty end to end.
