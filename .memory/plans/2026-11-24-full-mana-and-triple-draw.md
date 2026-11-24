# Plan: Hearthstone Mana Curve, Five Cards Per Turn, Stronger Starter Deck, Enemy All-Attack (file name kept from the first idea "full mana + triple draw")

- Date: 2026-11-24
- Decisions: [2026-11-24-full-mana-and-triple-draw](../decisions/2026-11-24-full-mana-and-triple-draw.md)
- Status: engine, texts and tests done (1198 tests); balance retune pending (T03)
- Shell setup: `export PATH="$HOME/.local/node-v24.22.3-darwin-arm64/bin:$PATH"`, repository root `/Users/gimjinhyeon/Downloads/Mango_Stone`.

## Goal
Both sides use the Hearthstone mana curve (1 mana on turn 1, +1 per turn up to 10, full refill, no carry-over) and draw 5 cards (player from turn 2, enemy every turn); the starter deck gets a higher cost curve and a cheap-card guarantee in the opening hand; the enemy attacks the hero with all ready minions as one action and never holds an attack back; then the difficulty is retuned with the simulation.

## Phases
| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `todo` | Engine rules, texts and tests, balance retune | [P01](../phases/2026-11-24-full-mana-and-triple-draw/P01-new-turn-rules/phase.md) |
