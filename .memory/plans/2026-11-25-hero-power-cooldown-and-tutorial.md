# Plan: Hero Power Cooldown and Spotlight Tutorial

## Goal
1. The hero power gets a cooldown: after one use it rests for the player's next 2 turns (used on turn 3, ready again on turn 6). Mana cost 2 and the Demonist's 2 soul shards stay. The button shows the remaining rest turns.
2. The simulation bot follows the cooldown and a 1000-run measurement is reported. No balance numbers change in this plan; adjustments are proposed to the user and applied only after confirmation.
3. The first-run tutorial becomes a spotlight tutorial with 8 steps (turn-order cards, mana, hand and cost, play a minion, end turn, attack, hero power, end turn), shows the turn-order cards in the tutorial battle (always first), and adds one-time tips for taunt and fatigue.

Decisions: [2026-11-25-hero-power-cooldown-and-tutorial](../decisions/2026-11-25-hero-power-cooldown-and-tutorial.md)

## Phases
| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `done` | Engine cooldown, API schema, bot + measurement report, cooldown on the hero power button and in the texts | [P01](../phases/2026-11-25-hero-power-cooldown-and-tutorial/P01-hero-power-cooldown/phase.md) |
| P02 | `in_progress` | Spotlight overlay, 8-step tutorial flow with the turn-order pick and hero power, taunt/fatigue tips, audit and close-out | [P02](../phases/2026-11-25-hero-power-cooldown-and-tutorial/P02-spotlight-tutorial/phase.md) |

## Boundaries
- No release, version bump or patch-note entry in this plan. Releases only when the user asks.
- No balance number changes (enemy health, bonuses, card stats). The measurement is reported; changes wait for the user's confirmation.
- Browser checks always run muted (`--mute-audio`), never with `--autoplay-policy=no-user-gesture-required`, and the headless Chrome is force-killed afterwards (`pgrep -f "Google Chrome.*--headless"` must be empty).
- Commit by explicit file paths only. Never commit the user's `Feedback` file.
- Node lives in `~/.local/node-v24.22.3-darwin-arm64/bin`: prefix shell commands with `export PATH="$HOME/.local/node-v24.22.3-darwin-arm64/bin:$PATH"`.
