# Task: T01 Targetable Minion Appearance

## Status: done

## Goal
Show exhausted minions at full color while the player can actually select them as targets, without changing whether they can attack.

## Decision Summary
- A targetable minion loses the `is-exhausted` visual class but keeps `is-targetable` and its gold outline.
- Exhausted minions remain gray when not targeting them or when actions are disabled; they remain unselectable as attackers.

## Implementation

### I01. Derive targetability and exhausted appearance from the same actionable state

- Related Files:
  - `apps/web/src/components/MinionLane.tsx` :: `MinionLane`; modify
  - `apps/web/src/components/MinionCard.tsx` :: `MinionCard`; read-only unless the existing props cannot express the required state

#### Details
- **Signatures & Types**:
  ```typescript
  interface MinionLaneProps {
    side: PlayerSide;
    minions: MinionState[];
    selectedAttackerId: string | null;
    targetMode: "none" | "spell" | "attack" | "hero-power";
    targetSide: PlayerSide | null;
    disabled: boolean;
    turnNumber: number;
    onSelectTarget(targetId: string): void;
    onDropTarget?(payload: NonNullable<ReturnType<typeof readDragPayload>>, target: DropTarget): void;
    intentTargetIds?: string[];
  }
  ```
- **Data & Schema Fields**: No model or API changes. Reuse `MinionState`, `targetMode`, `targetSide`, `selectedAttackerId`, `disabled`, and `attackUnavailable`.
- **Execution Flow / Logic**:
  1. Keep `attackUnavailable` as the rule-derived state: friendly minion and (`summonedTurn >= turnNumber` or `hasAttacked`).
  2. Derive an `isSelectingAttacker` boolean for `targetMode === "attack" && selectedAttackerId === null`.
  3. Derive `targetable` as `!disabled && targetMode !== "none" && targetSide === side`, except exhausted friendly minions are not targetable during attacker selection (`isSelectingAttacker && attackUnavailable`).
  4. Pass this `targetable` value to `MinionCard` and pass `exhausted={attackUnavailable && !targetable}`. Thus only an actionable target loses the grayscale/opacity class. Do not change `MinionCard`'s click, attack, or spell-resolution behavior.
  5. Preserve `.is-targetable` CSS, including its gold outline and cursor. Do not add a new style or alter colors.
  6. Extend the `MinionLane` click guard so exhausted friendly minions are ignored both outside target mode and while choosing an attacker (`isSelectingAttacker`). Keep newly summoned and already-attacked minions unable to enter attack selection or attack; the target-mode appearance change remains visual-only for valid spell targets.

### I02. Cover the target visibility state transitions

- Related Files:
  - `apps/web/src/components/MinionLane.test.tsx` :: exhausted minion selection tests; modify

#### Details
- Keep six-slot, normal exhaustion, click selection, and attack-selection tests passing.
- Update the existing friendly spell target test to assert that an exhausted, actionable minion has `is-targetable`, does not have `is-exhausted`, remains enabled, and still calls `onSelectTarget` when clicked.
- Add a case where an exhausted minion is not an actionable target (no target mode, a different target side, or `disabled=true`) and assert it stays gray and lacks `is-targetable`.
- Add an attack-mode attacker-selection case with an exhausted minion and assert it stays gray, has no target highlight, and clicking it does not call `onSelectTarget`.

## Acceptance Criteria
- [ ] An exhausted friendly minion that is actionable for a spell target appears in full color and retains the target outline.
- [ ] An exhausted minion that is not currently actionable remains gray and has no target outline.
- [ ] Selecting an exhausted minion as an attacker remains blocked; combat rules are unchanged.
- [ ] Existing MinionLane interaction tests pass.

## Validation
- `npm.cmd test -- apps/web/src/components/MinionLane.test.tsx`: all MinionLane tests pass.
- `npm.cmd run build`: all TypeScript workspaces and the web production build succeed.

## Commit Message
```text
fix(ui): clarify exhausted spell targets

Plan: 2026-10-28-exhausted-minion-target-visibility
Phase: P01-target-highlight
Task: T01-targetable-minion-appearance

- Show actionable exhausted minions at full color while targeting
- Preserve attack restrictions and target highlight
```

## Progress
- [x] Implementation complete
- [x] Validation passed
- commit: pending
