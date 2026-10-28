# Task: T03 Hero Power Popover

## Status: done

## Goal
Replace the wide class ability button in the player toolbar with a compact icon beside the player hero portrait, while making activation costs and description easy to inspect.

## Decision Summary
- Activating the class icon triggers its existing behavior immediately; show a compact cost-and-description popup without a second confirmation action.
- Every class ability costs 2 mana. Demonist also consumes 3 soul shards.
- Preserve the current once-per-turn readiness and Assassin target-selection behavior.

## Implementation

### I01. Render a portrait-adjacent ability icon and cost popup
- Related Files:
  - `apps/web/src/components/HeroPowerControl.tsx` :: `HeroPowerControlProps`, `HeroPowerControl`; modify.
  - `apps/web/src/components/GameBoard.tsx` :: player hero composition and `.player-toolbar`; move ability control beside player `HeroPanel` and remove it from toolbar.
  - `apps/web/src/styles/board.css` :: `.battle-player`, `.hero-power-control`, `.hero-power-button`, `.hero-power-cost`, `.soul-shard-count`, and new popover/icon rules; modify.
  - `apps/web/src/components/GameBoard.test.tsx` :: class power placement, costs, and existing target mode; modify.
  - `apps/web/src/components/HeroPowerControl.test.tsx` :: new focused interaction tests.
- Details
  - Keep the current props unless the composition requires a display-only status prop: `playerClass?: PlayerClass`, `currentMana: number`, `used: boolean`, `active: boolean`, `resolving: boolean`, `shardCount: number`, `boardSize: number`, `targetMode: boolean`, `onActivate(): void`.
  - Replace the text-heavy wide button with a compact accessible button containing a class-appropriate power icon and label for screen readers. It remains enabled only when existing `ready` conditions pass, or when `targetMode` is active to allow cancellation.
  - Position the control adjacent to the player `HeroPanel` in the player-side field layout, not in the bottom toolbar.
  - Show a non-blocking anchored popover on hover/focus and immediately after activation. It contains `heroPowerName`, `heroPowerDescription`, a blue mana badge `마나 2`, and for Demonist a distinct soul-shard badge `영혼 조각 3` plus current count `${shardCount}/6`.
  - The popover is informational only: no second “use” button and no duplicate activation. Clicking the icon calls `onActivate` exactly once. Assassin activation enters the existing enemy-minion-or-hero targeting mode; clicking again while targeting cancels as it does today.
  - Preserve `aria-pressed` for target mode, accessible name/description, used/disabled styling, and status indicators for insufficient resources or already-used powers. Do not change `useHeroPower` or game-core costs.
  - On narrow screens, anchor the popover within the viewport and keep the icon reachable without widening the toolbar or covering target controls.

## Acceptance Criteria
- [x] Class ability icon is visually adjacent to the player hero portrait and absent from the bottom toolbar.
- [x] Clicking a ready icon calls activation once and displays the descriptive cost popup.
- [x] Popup explicitly shows 2 mana for all classes and 3 soul shards for Demonist.
- [x] Demonist current shard count and insufficient-resource state remain clear.
- [x] Assassin target selection and cancel behavior work as before; no game-core rules change.
- [x] Keyboard focus and screen-reader labels expose the ability name, description, and costs.

## Validation
- `npm run test --workspace @board-game/web -- src/components/HeroPowerControl.test.tsx src/components/GameBoard.test.tsx` — activation, costs, placement, and targeting pass.
- `npm run test --workspace @board-game/game-core -- src/engine.test.ts` — existing power resource rules remain intact.
- `npm run build --workspace @board-game/web` — production build passes.

## Commit Message
```text
feat(web): move class ability beside hero portrait

Plan: 2026-10-28-battlefield-layout-class-ui
Phase: P01-battlefield-presentation
Task: T03-hero-power-popover

- Replace the wide ability button with a portrait-adjacent icon
- Show explicit mana and soul-shard costs in a compact popup
```

## Progress
- [x] Implementation complete
- [x] Validation passed
- commit: pending
