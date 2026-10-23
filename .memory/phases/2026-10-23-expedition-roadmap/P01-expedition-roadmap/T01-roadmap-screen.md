# Task: T01 Roadmap Screen

## Status: done

## Goal

Create a responsive, dark expedition-roadmap screen that shows the active phase’s three normal encounters and one boss, using actual enemy portraits and clear completed/current/available states, so the player can understand and select the current route node.

## Decision Summary

- Keep encounter order fixed and render one winding path over generated dark rock and black mist art. The interface draws the red route and clickable node UI.
- Use saved `RunState.encounters` as the source of truth. Completed portraits are grayscale; the active portrait has a green border/highlight; only the active or next pending encounter is selectable.

## Implementation

### I01. Generate the map background asset

- Related Files:
  - `apps/web/public/art/expedition-route-background.png` :: dark environmental backdrop for roadmap; new.

#### Details

- Create a landscape game-map illustration with jagged dark rock, deep black mist, subtle ember-red ambient light and strong shadows, matching the game’s existing dark fantasy board style.
- Leave a visually quiet central corridor and enough contrast for UI route lines, portraits, labels, and status markers to sit on top. Do not draw any route, nodes, text, icons, characters, or UI into the asset; those must remain dynamic and reflect saved progress.
- Keep the image suitable for `background-size: cover` at desktop and mobile aspect ratios. Preserve legibility by using dark low-detail areas under the node labels.

### I02. Implement the roadmap component and state derivation

- Related Files:
  - `apps/web/src/components/ExpeditionRoadmap.tsx` :: `ExpeditionRoadmap` — render route and interactive encounter nodes; new.
  - `apps/web/src/styles/board.css` :: expedition roadmap selectors — visual layout, route, statuses, and responsive behavior; modify.
  - `apps/web/src/components/ExpeditionRoadmap.test.tsx` :: roadmap rendering and selection behavior; new.

#### Details

- **Signatures & Types**:
  ```ts
  import type { RunState } from "@board-game/game-core";

  export interface ExpeditionRoadmapProps {
    run: RunState;
    disabled?: boolean;
    onSelectEncounter: (encounterIndex: number) => void;
    onMainMenu: () => void;
  }

  export function ExpeditionRoadmap(props: ExpeditionRoadmapProps): JSX.Element;
  ```
  Use the project’s existing React JSX return convention if the installed React type configuration does not expose the `JSX` namespace.
- **Data & Schema Fields**:
  - Reuse `RunState.encounters: EncounterState[]` where `EncounterState` contains `phase: 1 | 2 | 3`, `kind: "normal" | "boss"`, `enemyId: string`, and `status: "pending" | "active" | "complete"`.
  - Resolve each portrait and display name from `ENEMY_BY_ID.get(encounter.enemyId)`, using its `name`, `kind`, and `artKey`. Image source is `/art/enemies/${enemy.artKey}.png`.
  - Do not persist map-specific state or change game-core models.
- **Execution Flow / Logic**:
  1. Determine the target encounter index as the first `active` encounter; if none exists, use the first `pending` encounter. If no target exists, render a completed-run state with the main-menu button and no selectable encounter.
  2. Derive the visible phase from the target encounter’s `phase`, falling back to `run.phase` only when no target exists. Render only encounters with that phase, preserving their array order (three normal nodes followed by the boss node).
  3. Give each of the four nodes a stable accessible name containing encounter number, enemy name, and normal/boss kind. Use `<button>` for selectable nodes and disabled buttons or non-interactive elements for unavailable nodes.
  4. Enable selection only for the active target or the first pending target. Respect `disabled` on all route and main-menu buttons.
  5. Render the enemy portrait sharply and in color by default. Apply a grayscale class/filter only to `status === "complete"`. Apply a green border, green glow, and current/in-progress status label only to `status === "active"`. Give the available pending target a distinct selectable treatment without describing it as already in progress.
  6. Render the normal encounter portrait at a consistent smaller size and the boss portrait larger. Include enemy name, encounter index within the phase, and a visible boss label.
  7. Draw a single winding red route as an SVG or CSS overlay behind the nodes. Route geometry is UI-owned and must remain visible at desktop and mobile sizes.
  8. Provide the “메인 메뉴” button and call `onMainMenu` without mutating `run`.
  9. Use `aria-label`, visible text/status labels, keyboard-accessible native buttons, and meaningful portrait alt text. Do not make selecting unavailable nodes possible through pointer or keyboard.
- **Test Scenarios**:
  - Given a run with current phase 1 and all four encounters in that phase, render exactly four nodes and no phase 2/3 nodes.
  - Completed encounter portrait has grayscale styling; active encounter has green current styling and is selectable.
  - Only the active encounter (or, when there is no active encounter, first pending encounter) invokes `onSelectEncounter` when clicked; later pending encounters are disabled.
  - Boss node renders a boss label and larger-node class; all portrait paths use the catalog `artKey`.
  - Main-menu button invokes `onMainMenu` without changing input run state.
  - `disabled` disables all node selection and menu navigation.
  - At narrow viewport widths, all four nodes remain visible, readable, and reachable without horizontal overflow.

### I03. Responsive and reduced-motion styling

- Related Files:
  - `apps/web/src/styles/board.css` :: `.expedition-roadmap*`, `.expedition-roadmap__*`, and relevant media queries — new/modify.

#### Details

- Use the generated image at `/art/expedition-route-background.png` as the roadmap’s background with a dark overlay for text contrast.
- Keep route lines behind portrait controls (`pointer-events: none`) and node content above the route with clear focus-visible outlines.
- Define a four-node desktop winding layout and a compact mobile layout using existing `board.css` breakpoints; preserve node order and boss emphasis. Avoid fixed-width content that causes horizontal scroll.
- Add subtle active-node glow and route entrance motion only as decoration. Under `prefers-reduced-motion: reduce`, remove animation while retaining static state cues.

## Acceptance Criteria

- [ ] Roadmap displays exactly the current phase’s four encounters and uses the matching normal/boss portrait art.
- [ ] Completed portraits are grayscale; active encounter is clearly highlighted with a green portrait border.
- [ ] Only the active or next pending node is selectable; the boss node is visibly larger.
- [ ] Main-menu button is present, and component leaves run data untouched.
- [ ] Layout is usable on narrow screens and respects reduced-motion preference.

## Validation

- `npm.cmd test --workspace @board-game/web -- src/components/ExpeditionRoadmap.test.tsx` — roadmap component tests pass.
- `npm.cmd run build --workspace @board-game/web` — web TypeScript/Vite build passes.
- `npm.cmd run lint --workspace @board-game/web` — web lint passes.

## Commit Message
```text
feat(web): add expedition roadmap screen

Plan: 2026-10-23-expedition-roadmap
Phase: P01-expedition-roadmap
Task: T01-roadmap-screen

- Render current-phase encounters with saved status styling
- Add dark mist backdrop and responsive winding route
```

## Progress
- [x] Implementation complete
- [x] Validation passed
- commit: created
