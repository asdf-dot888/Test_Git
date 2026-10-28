# Task: T01 Temporary Mana Display

## Status: done

## Goal

Show temporary mana as a distinct resource in the player's and enemy's mana displays, including mana above the normal maximum, and keep card play costs synchronized with the engine's total usable mana.

## Decision Summary

- Source: `.memory/decisions/2026-10-28-soul-bargain-card.md`.
- Temporary mana uses a distinct-colored orb style and is included in the total available mana value.
- Temporary mana expires at turn end in game-core; this task renders the state supplied by game-core and does not duplicate game rules in React.

## Implementation

### I01. Extend mana display inputs and rendering

- Related Files:
  - `apps/web/src/components/ManaDisplay.tsx` :: `ManaDisplayProps`, `ManaDisplay` — render current, max, temporary count, and orb distinction; modify.
  - `apps/web/src/components/GameBoard.tsx` :: both `ManaDisplay` calls — pass player and enemy temporary mana; modify.
  - `apps/web/src/game/combatEffects.ts` :: spell effect kind/target mapping — map temporary mana to the existing mana visual and random discard to the existing theft visual; modify.
  - `apps/web/src/styles/board.css` :: `.mana-display`, `.mana-orbs`, `.mana-orb`, `.enemy-resource-bar .mana-*` — style temporary orbs responsively; modify.
  - `apps/web/src/components/ManaDisplay.test.tsx` — add focused component coverage if the component test file exists; otherwise create it.
  - `apps/web/src/game/combatEffects.test.ts` — verify the new card effects still resolve to supported combat visuals; modify.

#### Details

- **Component contract**: `ManaDisplay({ current: number; max: number; temporary?: number })`; default missing `temporary` to `0` to remain compatible with isolated/legacy callers.
- Render one orb per regular maximum mana, with normal full orbs based on regular current mana `current - temporary`; render `temporary` additional orbs with a distinct contrasting color. Clamp rendered regular orbs to `0..max` and temporary orbs to `0..temporary`.
- Keep the numeric total usable amount visible as `current / max`; when `current > max`, make the overflow legible and provide an accessible label that includes regular maximum and temporary mana.
- Update the enemy compact display so temporary orbs remain distinguishable at desktop and mobile breakpoints.
- Tests cover normal mana, 10/10 plus 3 temporary (`13 / 10`), partially spent temporary mana, and `temporary=0` rendering.

## Acceptance Criteria

- [ ] Both player and enemy displays show temporary mana as distinct orbs and include it in the usable total.
- [ ] Spent temporary mana no longer appears as a lit orb, and the normal 10-orb maximum remains visually intact.
- [ ] The display remains readable at existing desktop and mobile breakpoints and has an accurate accessible label.

## Validation

- `npm test -- apps/web/src/components/ManaDisplay.test.tsx apps/web/src/components/GameBoard.test.tsx` — display and board tests pass.
- `npm test -- apps/web/src/game/combatEffects.test.ts` — spell visual mapping tests pass.
- `npx eslint apps/web/src/components/ManaDisplay.tsx apps/web/src/components/GameBoard.tsx apps/web/src/game/combatEffects.ts` — changed files pass lint.
- `npm run build --workspace @board-game/web` — web build succeeds.

## Commit Message

```text
feat(web): show temporary mana in combat UI

Plan: 2026-10-28-mangostone-game-polish
Phase: P02-player-experience
Task: T01-temporary-mana-display

- Distinguish temporary mana orbs from regular mana
- Show total usable mana for both sides
```

## Progress

- [x] Implementation complete
- [x] Validation passed
- commit: pending

