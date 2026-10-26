# Decisions: Leaderboard Entry Points

- Date: 2026-10-26
- Status: Confirmed
- Related plan: `.memory/plans/2026-10-26-cosmos-leaderboard-api.md`

## D01. Main menu entry
- **Chosen**: Add a dedicated leaderboard menu option to the main menu.
- **Rationale**: The player can check the ranking before starting or continuing an expedition.
- **Source**: Confirmed by the user.

## D02. Expedition roadmap entry
- **Chosen**: Show a crown-shaped leaderboard button near the upper-right corner of the expedition roadmap only.
- **Rationale**: The user chose the roadmap-only option for the crown button. The main menu keeps its separate ranking menu option.
- **Source**: Confirmed by the user.

## D03. Ranking content and API behavior
- **Chosen**: Reuse the existing plan for the top-ten leaderboard modal and its Entra/Cosmos data flow.
- **Rationale**: This interview changes where players can open the leaderboard; it does not change the already planned ranking contents or API behavior.
- **Source**: Existing T03 blueprint at `.memory/phases/2026-10-26-cosmos-leaderboard-api/P01-swa-leaderboard/T03-game-leaderboard-ui.md`.
