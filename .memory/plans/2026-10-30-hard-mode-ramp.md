# Plan: Hard Mode Ramp and Tutorial Health Reset

## Goal

Make the existing Hard expedition progressively tougher without changing Normal. Preserve the current Phase 1 opening encounter, ramp enemy stats at later phase boundaries, make Hard AI plan stronger legal turns as the run advances, and restore player-side health when the first-run tutorial is completed or skipped.

## Status: complete

Source decision: [Hard Mode Ramp and Tutorial Health Reset](../decisions/2026-10-30-hard-mode-ramp.md)

## Phases

| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `complete` | Add phase-based Hard enemy scaling, progressing full-turn AI with legal attacks, and tutorial health recovery. | [P01](../phases/2026-10-30-hard-mode-ramp/P01-hard-mode-ramp/phase.md) |

## Scope and constraints

- Normal-mode stats, AI, turn rules, and tutorial replay behavior stay unchanged.
- Hard Phase 1 enemy stats keep their current values. New phase bonuses are +8 enemy hero health/+1 attack and health to every enemy minion in Phase 2, and +16/+2 attack and health in Phase 3. These are additional to existing Hard bonuses.
- Minion bonuses apply to enemy minions created from cards and all enemy summons, including tokens and boss-card summons. They never apply to player minions.
- AI tactical planning increases after the opening battle. It may inspect the player's hidden hand and draw-pile order, but must obey mana, targeting, board-blocking, and action rules.
- Hard AI plans a legal card-play sequence for the enemy turn, selects threatening/killable player minions when blocked, and attacks the player hero only when the player's board is empty.
- First-run tutorial completion or skip restores the player hero and friendly minions to their battle-start health. Tutorial replay continues restoring its pre-replay run snapshot.
- No deployment, Git push, or unrelated changes are included.

## Implementation order

1. Add and validate phase-based Hard stat scaling in the game core.
2. Implement progressive full-turn Hard AI planning and legal attack targeting.
3. Restore player-side health when the first-run tutorial ends or is skipped.
