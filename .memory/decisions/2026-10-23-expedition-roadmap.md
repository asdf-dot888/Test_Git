# Decisions: Expedition Roadmap

- Date: 2026-10-23
- Status: Confirmed

## D01. Roadmap Placement and Encounter Start
- **Chosen**: Show a roadmap after starting a new expedition and between encounters. Clicking the available route node starts the next encounter. Continuing an active expedition also opens the roadmap; clicking its active encounter node resumes the battle.
- **Rationale**: The route gives the player a clear view of progress before each encounter and makes the transition to the next battle deliberate.

## D02. Encounter Route
- **Chosen**: Keep the existing fixed encounter order and show it as one winding, non-branching path. Only the current active encounter or the next pending encounter can be selected; completed and future nodes remain unavailable.
- **Rationale**: The map communicates progression without changing the current combat sequence or introducing route-choice rules.

## D03. Phase Visibility
- **Chosen**: Show only the current phase's four encounters: three normal battles and one boss. Reveal the next phase after defeating the current phase's boss.
- **Rationale**: This preserves the phase structure while keeping the roadmap focused on the next set of encounters.

## D04. Encounter Node Art
- **Chosen**: Use each normal encounter's existing enemy portrait in its node. Use the matching phase boss portrait at a larger size for the boss node.
- **Rationale**: The player can identify the upcoming opponent, and the larger boss portrait gives the phase finale visual weight while reusing established game art.

## D05. Roadmap Visual Style
- **Chosen**: Create a dark rocky map background with black mist and a red route. Render the route and interactive nodes as UI layers above the background illustration.
- **Rationale**: The darker, ominous palette fits the existing game atmosphere while keeping encounter status and interaction legible.

## D06. Background Asset
- **Chosen**: Generate a dedicated dark rock-and-mist background illustration; keep route lines, status styling, and encounter nodes dynamic in the UI.
- **Rationale**: A static illustration provides the atmosphere, while UI-rendered route elements can reflect saved encounter progress accurately.

## D07. Continue with an Unfinished Victory or Reward
- **Chosen**: When a saved run has an unfinished victory acknowledgement or reward, continue at that pending screen first. After it is resolved, show the roadmap before the next encounter.
- **Rationale**: This preserves reward and victory progression while still routing active battles through the roadmap.

## D08. Progress Data and Persistence
- **Chosen**: Reuse `RunState.encounters` and its existing `pending`, `active`, and `complete` statuses. Derive the visible phase and node states from the run; do not add persisted route-selection fields.
- **Rationale**: The route is fixed and the encounter list already contains the required phase, kind, enemy, and completion information.

## D09. Defeated Encounter Portraits
- **Chosen**: Show enemy portraits for completed encounters in grayscale. Keep the current and undefeated encounter portraits in color.
- **Rationale**: The grayscale portraits make completed progress easy to distinguish at a glance.

## D10. Active Encounter Highlight
- **Chosen**: Mark the encounter currently in progress with a green portrait border and a distinct UI highlight.
- **Rationale**: The green treatment separates the active encounter from defeated grayscale nodes and future encounters.

## D11. Roadmap Exit and Progress Saving
- **Chosen**: Keep a “메인 메뉴” button on the roadmap. Returning to the main menu preserves the expedition progress so the player can continue later.
- **Rationale**: Players can leave the route view without abandoning the run.
