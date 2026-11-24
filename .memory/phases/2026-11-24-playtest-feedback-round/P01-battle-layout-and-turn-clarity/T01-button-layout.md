# Task: T01 All-Attack and End-Turn Button Layout

## Status: done

## Goal
PC: the all-attack button sits directly left of the end-turn button in the player toolbar. Mobile (viewport width <= 760px): the end-turn button moves to the top of the player hero panel (above the portrait, same gold style, smaller, as wide as the panel) and the all-attack button takes the old end-turn slot in the toolbar.

## Decision Summary
D01 (PC and mobile placement). End-turn keeps its gold style on mobile. Disabled rules and handlers do not change.

## Implementation
### I01. Compact layout hook
- New `apps/web/src/game/useCompactBoard.ts`: `export const COMPACT_BOARD_QUERY = "(max-width: 760px)";` and `export function useCompactBoard(): boolean`, written like `useTouchGuidance` in `game/inputMode.ts` (initial state from `window.matchMedia(...).matches`, listener on `change`, returns `false` when `matchMedia` does not exist so jsdom tests keep the PC layout). Using one DOM instance of each button (chosen by this hook) avoids duplicate buttons that CSS merely hides, which would break role-based tests.
### I02. Components
- New `apps/web/src/components/AllAttackButton.tsx`: props `{ disabled: boolean; readyMinionCount: number; enemyHasMinions: boolean; onAllAttack(): void }`. Move the markup from `GameBoard.tsx` unchanged (classes `all-attack-button is-ready|is-unavailable`, `aria-label` `전체 공격, 공격 가능한 하수인 N명`, the same `title` strings, the `⚔` span).
- `apps/web/src/components/TurnControls.tsx`: export `EndTurnButton` (props `{ onEndTurn; status; disabled?; className? }`, the existing `button.end-turn-button` with the `↗` mark). `TurnControls` gains `leading?: ReactNode` (rendered first) and `showEndTurn?: boolean` (default `true`; `false` renders no end-turn button) and uses `EndTurnButton`. Keep the status span.
- `apps/web/src/components/HeroPanel.tsx`: new optional prop `topControl?: ReactNode`, rendered as the first child of the panel (before `.hero-portrait-wrap`) for the player side only.
- `apps/web/src/components/GameBoard.tsx`:
  - `const compact = useCompactBoard();`
  - Delete `div.field-action-bar` and its all-attack button.
  - In `.turn-controls-spacer`: `<TurnControls leading={<AllAttackButton .../>} showEndTurn={!compact} .../>` with the same `disabled={actionsDisabled || !canEndTurn}` for end turn and `allAttackDisabled` for all-attack.
  - Player `HeroPanel`: `topControl={compact ? <EndTurnButton className="hero-end-turn-button" .../> : undefined}` (same props as the toolbar one).
### I03. Styles (`apps/web/src/styles/board.css`)
- Remove `.field-action-bar` rules (base and the three media-query overrides). Re-check the rows of `.battle-board` and `.enemy-intent-preview { top: ... }` (mobile) that assumed that bar and keep the visual spacing equivalent or better (the bar's height is freed).
- `.turn-controls-spacer .turn-controls { gap: 8px }`; `.turn-controls-spacer .all-attack-button` keeps its current size; on `<= 760px` keep the existing smaller sizes and drop the `grid-row: 2` override only if the toolbar still lays out in one row (verify).
- New `.hero-end-turn-button` (only exists on compact): `width: 100%; min-height: 28px; padding: 0 6px; font-size: 10px;` plus the existing gold gradient from `.end-turn-button`; add it under the `max-width: 390px` rules with a smaller `min-height: 26px`.
- The `touch-action` and drag rules must not be affected (the hero power control sits below the portrait; no overlap).

## Acceptance Criteria
- [ ] PC layout (`matchMedia` absent or not matching): `.player-toolbar` contains the all-attack button followed by the end-turn button; no `.field-action-bar` in the DOM; no end-turn button in the hero panel.
- [ ] Compact layout (`matchMedia("(max-width: 760px)")` mocked to match): the hero panel of the player contains exactly one end-turn button before the portrait; the toolbar contains the all-attack button and no end-turn button.
- [ ] All-attack: same `aria-label`, `title`, disabled and `is-ready`/`is-unavailable` state as before; clicking calls `onAllAttack`. End turn: same disabled rules; clicking calls `onEndTurn`.
- [ ] The first-run tutorial still works (tutorial tests unchanged and pass).
- [ ] Build, lint and all tests pass.

## Validation
- `npm run build`
- `npm test -- apps/web/src/components/GameBoard.test.tsx apps/web/src/components/HeroPanel.test.tsx apps/web/src/components/GameBoard.touch.test.tsx`
- Tests to add: `GameBoard.test.tsx` (PC order and compact placement with a `matchMedia` stub; update any test that located the old `.field-action-bar`), `HeroPanel.test.tsx` (`topControl`), `apps/web/src/game/useCompactBoard.test.ts` (initial value, change event, missing `matchMedia`), `TurnControls` behavior covered through `GameBoard.test.tsx`.
- `npm test`, `npm run lint`

## Commit Message
```text
feat(web): move all-attack next to end turn and compact end turn to the hero panel

Plan: 2026-11-24-playtest-feedback-round
Phase: P01-battle-layout-and-turn-clarity
Task: T01-button-layout
```
Commit only the files this task changed, by explicit path.

## Progress
- [x] implementation complete. New `game/useCompactBoard.ts` (matchMedia `(max-width: 760px)`, false without matchMedia), `AllAttackButton.tsx`, `EndTurnButton` exported from `TurnControls.tsx` (`leading`, `showEndTurn`), `HeroPanel` `topControl` (player only), `GameBoard` wiring; `.field-action-bar` and its 4 CSS rules removed; `.hero-end-turn-button` styles added. The mobile toolbar grid override (`.turn-controls-spacer { grid-column: 3; grid-row: 2 }`) was kept; the real phone layout still needs the user's check (P05 checklist).
- [x] validation passed: build clean, lint clean, 1145 tests (99 files; +5 new: compact layout tests in `GameBoard.test.tsx`, `useCompactBoard.test.ts`, `HeroPanel` top control).
- commit: see Git history
