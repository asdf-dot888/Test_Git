# Task: T03 Main Menu Game Guide

## Status: done

## Goal

Add a `게임 방법` button directly below `새 원정 시작` that opens a readable modal explaining the selected core rules before a run begins.

## Decision Summary

- Keep the guide on the main-menu flow: clicking opens a modal; an explicit close button returns to the same menu. Explain only battle/phase structure, mana and card use, minion combat, and victory rewards.

## Implementation

### I01. Guide modal component

- Related Files:
  - `apps/web/src/components/GameGuideModal.tsx` :: `GameGuideModal` — new accessible dialog with selected guide content.
  - `apps/web/src/components/GameGuideModal.test.tsx` :: modal visibility, semantics, content, and close callback tests; new.
  - `apps/web/src/styles/board.css` :: `.game-guide-backdrop`, `.game-guide-panel`, and responsive guide content styles; modify.

#### Details

- **Signatures & Types**:
  ```ts
  import type { ReactElement } from "react";

  interface GameGuideModalProps {
    open: boolean;
    onClose(): void;
  }

  export function GameGuideModal(props: GameGuideModalProps): ReactElement | null
  ```
- **Data & Schema Fields**:
  - No persisted state or API fields. The component only receives `open` and `onClose`.
- **Execution Flow / Logic**:
  1. Return `null` while closed.
  2. While open, render a fixed modal above the menu with `role="dialog"`, `aria-modal="true"`, and a labelled heading. Put a visible `닫기` button in the dialog and call `onClose` from it.
  3. Import `createPortal` from `react-dom` and portal the modal backdrop to `document.body`, so `.menu-screen` overflow cannot clip it. Use a z-index above `.menu-screen` and the existing dialog palette.
  4. Keep all controls mouse-operable and do not add keyboard shortcuts. The game already reserves Escape for the game menu.
  5. Explain these facts accurately:
     - An expedition has three phases; each phase contains three normal battles and one boss battle.
     - Each battle starts with 5/10 mana. Playing cards spends mana; the player's later-turn recovery is +1 on turns 2–3, +2 on turns 4–6, and +3 from turn 7, up to 10.
     - Minion cards remain on the board and may attack once per turn starting the turn after they are played. When one minion attacks another, both take damage equal to the other minion's attack.
     - Spells resolve their printed effect immediately. After a win, confirm the victory, choose or skip one card reward, then confirm the next encounter.
     - The zero-cost `마력의 샘` spell grants 1 available mana, up to the 10-mana maximum.
  6. Do not add hand size, draw, discard, 20-second timer, or other edge-case explanations in this first guide.

### I02. Main-menu entry and interaction

- Related Files:
  - `apps/web/src/components/MainMenu.tsx` :: `MainMenu`, `MainMenuProps` — show the guide button under the new-run button and control modal state; modify.
  - `apps/web/src/components/MainMenu.test.tsx` :: main-menu button ordering and guide open/close integration tests; new.

#### Details

- Add `게임 방법` immediately after `새 원정 시작` in the rendered button order, whether or not `원정 계속하기` is present.
- Use the existing `menu-secondary` visual style. Keep `MainMenuProps` public handlers unchanged; the guide state is local to `MainMenu`.
- Clicking `게임 방법` opens `GameGuideModal`. Clicking `닫기` closes it without calling `onStart` or `onContinue`.
- Preserve the existing start, continue, disabled state, and session notice behavior.

## Acceptance Criteria

- [x] The main menu shows `게임 방법` immediately below `새 원정 시작`.
- [x] Clicking it opens a semantic modal with the selected core rules; closing returns to the menu.
- [x] The guide content matches the implemented phase, mana, combat, and reward rules.
- [x] The existing new-run and continue controls keep working, including their disabled state.
- [x] The modal is responsive and its controls remain usable with the pointer.

## Validation

- `npm.cmd test --workspace @board-game/web -- src/components/GameGuideModal.test.tsx src/components/MainMenu.test.tsx` — modal and menu tests pass.
- `npm.cmd run build --workspace @board-game/web` — TypeScript and Vite build pass.
- `npm.cmd run lint --workspace @board-game/web` — web lint passes.

## Commit Message

```text
feat(web): add a game guide to the main menu

Plan: 2026-10-23-player-mana-curve-and-menu-guide
Phase: P01-player-balance-and-menu-guide
Task: T03-main-menu-game-guide

- Explain core expedition rules in a menu modal
- Preserve existing start and continue actions
```

## Progress

- [x] Implementation complete
- [x] Validation passed
- commit: created
