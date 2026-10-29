# Plan: Damage-Scaled Combat Impact and Boss Area Effects

## Goal
Make combat hits immediately communicate their force. Every damaging event carries per-target damage information; light, medium, and heavy hits have clearly different visuals and sounds; minion retaliation, armor blocks, misses, direct minion hits on heroes, and phase-themed boss area attacks each have distinct feedback. Preserve gameplay rules and damage values.

Source decision: [2026-10-29-combat-impact-polish](../decisions/2026-10-29-combat-impact-polish.md)

## Phases
| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `in_progress` | Add per-target damage outcomes, scale combat visuals and audio, and sequence phase-themed boss area attacks. | [P01](../phases/2026-10-29-combat-impact/P01-combat-feedback/phase.md) |

## Scope and constraints
- Damage tiers use damage reaching health after armor absorption and before the remaining-health cap: 1–2 light, 3–4 medium, 5+ heavy. For a fully absorbed positive hit, show armor block feedback. For a zero random roll, show a miss.
- Minion retaliation stays at the light visual and audio tier regardless of its damage amount. Lethal hits additionally play the existing death effect sound.
- Apply the presentation to player and enemy attacks, damage spells, class damage abilities, and boss area damage. Compute multi-target intensity independently per target.
- Direct minion-to-hero attacks use a unique short red slash around the hero portrait and a dedicated hit sound. Boss area attacks instead use phase-specific casting visuals after their warning.
- Do not change gameplay damage, card rules, balance, board limits, turn timing, or victory logic. Play the full effects even when `prefers-reduced-motion` is enabled, as explicitly chosen.
- Produce the new sound clips from the existing attack/damage source audio; do not add external sound libraries.

