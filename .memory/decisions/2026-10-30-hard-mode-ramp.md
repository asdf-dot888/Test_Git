# Decisions: Hard Mode Ramp and Tutorial Health Reset

- Date: 2026-10-30
- Status: Confirmed
- Related decision: `.memory/decisions/2026-10-30-tutorial-hard-mode.md`
- Scope: Make the existing Hard expedition progressively more challenging and prevent first-run tutorial damage from leaving the player at a disadvantage. Normal mode and Season 2 remain out of scope.

## D01. Difficulty scope and baseline
- **Chosen**: Apply the new progression only to Hard mode; leave Normal unchanged.
- **Chosen**: Keep the existing Hard-mode rules for the first battle of Phase 1. No new stat scaling applies there.
- **Rationale**: Preserve the opening encounter while making later expedition phases substantially harder.

## D02. Phase-based enemy stat scaling
- **Chosen**: At Phase 2, add 8 health to enemy heroes and +1 attack/+1 health to enemy minions.
- **Chosen**: At Phase 3, add 16 health to enemy heroes and +2 attack/+2 health to enemy minions.
- **Chosen**: Apply minion scaling to every enemy minion, including tokens and minions summoned by boss-only cards.
- **Interpretation**: These are phase progression bonuses layered on the existing Hard-mode bonuses; Phase 1 keeps its current values.

## D03. Hard AI progression and planning
- **Chosen**: Keep the current AI behavior for the first Phase 1 battle, then increase its tactical strength and aggression as the expedition advances.
- **Chosen**: The AI may inspect the player's hidden hand and deck order, as already allowed for Hard mode.
- **Chosen**: Do not grant the AI extra mana, extra actions, or exceptions to combat rules.
- **Chosen**: Plan a complete legal turn, evaluating card combinations and play order before spending mana.
- **Chosen**: Prefer fast hero damage when legal; do not attack the player hero while player minions remain.
- **Chosen**: When blocked by player minions, prioritize ready, threatening attackers and take available kills.
- **Correction from current implementation**: Remove the Hard-mode lethal exception that lets an enemy minion bypass the player's board to attack the hero. AI must obey the same board-blocking rule as the player.

## D04. Tutorial damage recovery
- **Chosen**: On first-run tutorial completion, restore the player's hero and friendly minions to their battle-start health.
- **Chosen**: Apply the same recovery if the player skips the tutorial.
- **Rationale**: Tutorial damage should not make the first real play after the tutorial feel unfair.
- **Interpretation**: Continue the current battle state after restoring player-side health; this choice does not reset damage already dealt to enemies.

## Implementation notes
- The existing tutorial is played within the real first battle. Tutorial replay already restores its saved run snapshot and is not part of this health-reset change.
- The existing Hard AI chooses a highest-scoring playable card repeatedly; full-turn planning must preserve legal costs, turn order, board capacity, and targeting.
- Keep phase stat scaling separate from per-encounter AI progression so Phase 1 can retain its current stats while AI decisions become stronger after the opening encounter.
