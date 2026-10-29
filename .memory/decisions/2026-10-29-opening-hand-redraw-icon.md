# Decisions: Opening Hand Redraw Icon

- Date: 2026-10-29
- Status: Confirmed

## D01. Control placement and visual style
- **Chosen**: Move the opening-hand redraw control from beside the hand heading to immediately beside the player's deck and discard counts. Replace the text button with a circular, noticeable yellow-gold refresh-arrow icon.
- **Rationale**: The deck/discard area communicates card-pile actions, and the icon saves space while making the action easier to spot.

## D02. Help tooltip interactions
- **Chosen**: Show the tooltip on mouse hover on PC and on long press on mobile. Also show it for keyboard focus.
- **Rationale**: The user specified hover for PC and long press for touch devices; keyboard focus keeps the icon accessible without changing its behavior.
- **Tooltip text**: “손패를 1회 다시 뽑습니다”.
- **Touch dismissal**: Keep the tooltip visible for 2 seconds after the finger is lifted, then dismiss it.

## D03. Existing redraw behavior
- **Chosen**: Preserve the current one-use availability, redraw rules, persistence, and disabled state. The icon is shown only while the existing redraw is available; pressing it triggers the same redraw action.
- **Rationale**: This change is a presentation and discoverability adjustment, not a change to the game's redraw rules.

## Codebase Findings
- `GameBoard.tsx` already displays deck/discard counts in `.deck-counts` and passes redraw availability, disabled state, and callback to `HandPanel`.
- `HandPanel.tsx` currently owns the text redraw button next to “손패”; relocate its control rendering to the deck-count area without duplicating game-state logic.
- `CardInspection.tsx` uses a 500 ms touch long press and cancels when the pointer moves more than 10 px; follow the same interaction threshold for the mobile tooltip.
- Existing tests verify the redraw is available only when its saved run flag is true and disabled during resolution. No additional gameplay-rule change is needed.
