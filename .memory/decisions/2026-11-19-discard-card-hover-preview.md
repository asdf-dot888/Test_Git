# Decisions: Discard Picker Card Hover Preview

- Date: 2026-11-19
- Status: Confirmed

## D01. Preview presentation
- **Chosen**: When the mouse hovers a card in the discard picker, show the same floating full-card preview the hand uses: card art, cost, name, kind, attack/health (minions) and effect description. Do not add a fixed side panel or redesign the option chips.
- **Rationale**: The hand already uses this preview (`CardInspection` with `desktopHover`), so it is the simplest option and stays consistent with the rest of the game.

## D02. Preview size
- **Chosen**: Use a fixed preview size of about 220×320 px regardless of the hovered chip size. Shrink it to fit inside the viewport on small screens and keep the existing placement rules (above the chip when there is room, otherwise below; clamped to the screen).
- **Rationale**: Discard chips are small (about 105×72 px). The current preview scales the hovered element by 1.5×, which would render a tiny card with a clipped description.

## D03. The card being added
- **Chosen**: In the reward-overflow case, the “추가할 카드: <name>” line gets the same hover preview (and the same mobile long-press details), so the player can compare it with the card to discard. Only that name line becomes inspectable; the layout and the discard rules do not change.
- **Rationale**: Deciding what to discard depends on what is being added.

## D04. Unchanged behavior and defaults
- **Chosen**: The discard flow, rules, and selection behavior do not change on PC. Mobile details/selection behavior is defined in [2026-11-19-mobile-card-tap-details-and-touch-drag.md](./2026-11-19-mobile-card-tap-details-and-touch-drag.md) (tap for details, in-popup “버리기” button), which replaces the long-press popup. Both discard situations use the same component and therefore get the preview: hand overflow in battle and deck overflow after a reward. Keyboard focus also shows the preview (default, consistent with the redraw tooltip).
- **Rationale**: This is a presentation and discoverability change, not a gameplay change.

## Codebase Findings
- `DiscardPicker.tsx` already wraps each option in `CardInspection` but does not pass `desktopHover`, so only the touch long-press details work today.
- `CardInspection.tsx` sizes the hover preview as 1.5× the hovered element's rectangle (`showDesktopPreview`); the preview renders into `document.body` at `z-index: 80` (`.game-card-hover-preview` in `board.css`), above the picker (`z-index: 15`–`20`), so stacking is not a problem.
- `DiscardPicker` is used in `GameBoard.tsx` (hand overflow, `battle.hand`) and `App.tsx` (deck overflow after a reward, `run.deck`, with `rewardCardId`).
- `.discard-options` scrolls (`max-height: 48vh`), and the preview is `position: fixed`, so it is not clipped by the scroll area.
