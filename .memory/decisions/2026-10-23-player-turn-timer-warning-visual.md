# Decisions: Player Turn Timer Warning Visual

- Date: 2026-10-23
- Status: Confirmed

## D01. Warning Effect Location and Trigger
- **Chosen**: When the visible player-turn timer reaches five seconds or less, show a red breathing glow around the game board edges. Keep it active through the final five-second countdown and stop it when the player turn ends or the timer is hidden.
- **Rationale**: The board edge draws attention to the deadline without adding another banner or changing the existing timer location.

## D02. Menu Behavior
- **Chosen**: Hide the board-edge warning while the in-game menu is open. When the menu closes, show it again based on the remaining timer value.
- **Rationale**: The timer pauses and hides while the menu is open, so its visual warning should follow the same visibility state.

## D03. Reduced-Motion Preference
- **Chosen**: Play the same breathing animation even when the device requests reduced motion.
- **Rationale**: The user prefers the warning to remain visually animated regardless of that system preference.

## D04. Existing Timer Cues
- **Chosen**: Keep the current red blinking timer text and the lower-volume warning sound played once per second during the last five seconds. Add no new warning sound.
- **Rationale**: The new board-edge cue supplements the existing countdown and sound without duplicating audio.
