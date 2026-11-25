# Decisions: Exhausted Minion Target Visibility

- Date: 2026-10-28
- Status: Confirmed

## D01. Exhausted appearance while selecting a target
- **Chosen**: When a minion is a selectable target, remove its exhausted grayscale/opacity treatment and retain the existing target highlight.
- **Rationale**: Exhaustion only prevents attacking. It should not make a valid spell target appear unavailable.

## D02. Preserve attack restrictions
- **Chosen**: Keep newly summoned and already-attacked minions unable to attack as before; only change their visual treatment while they are selectable targets.
- **Rationale**: Spell targeting should not alter combat eligibility or attack rules.

## Implementation scope
- Use the existing `targetable` state in `MinionLane`/`MinionCard` to suppress `is-exhausted` styling only for selectable targets.
- Preserve the `is-targetable` outline and cursor styling.
- Add regression coverage for exhausted minions in and out of target selection, including attack mode.
