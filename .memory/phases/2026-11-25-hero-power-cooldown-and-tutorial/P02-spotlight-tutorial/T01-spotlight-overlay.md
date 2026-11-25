# Task: T01 Spotlight Overlay Component

## Status: pending

## Goal
A reusable `TutorialSpotlight` component darkens the whole screen except one on-screen element, draws a ring around it, and places a callout (title, text, optional "계속" button, "건너뛰기" button) with an arrow next to it. It follows the element when the layout changes (resize, scroll, hand growing). T02 wires it into the tutorial.

## Decision Summary
- D04: spotlight tutorial — only the explained element stays bright; arrow + short text; the step advances on the real action.
- The overlay never blocks clicks (`pointer-events: none` on the dimming layer). Which actions are allowed stays the job of the existing `tutorialAllows` gate in `App.tsx`; this keeps drag/touch interactions working untouched.

## Implementation

### I01. Component
- Related Files:
  - `apps/web/src/components/TutorialSpotlight.tsx` :: `TutorialSpotlight`, `TutorialSpotlightProps`, `findSpotlightTarget` — new
  - `apps/web/src/styles/board.css` :: new `.tutorial-spotlight*` rules at the end of the tutorial section (~line 767); the dark theme colors come from `theme.css` tokens (`--bone`, `--brass`, `--ember`, `--soul`, `--display`) — modify

#### Details
- **Signatures & Types**:
  ```typescript
  export interface TutorialSpotlightProps {
    /** CSS selector list; the first matching element with a non-zero box is highlighted. null = no hole, callout centred. */
    target: string | null;
    title: string;
    description: string;
    /** "n / total" shown in the callout header. */
    stepLabel: string;
    /** Shows a "계속" button that calls onContinue. */
    continueLabel?: string;
    onContinue?(): void;
    onSkip(): void;
    /** Extra px around the target box. Default 8. */
    padding?: number;
  }
  export function findSpotlightTarget(selector: string): HTMLElement | null; // first match whose getBoundingClientRect() has width > 0 and height > 0
  export function TutorialSpotlight(props: TutorialSpotlightProps): ReactElement;
  ```
- **Execution Flow / Logic**:
  1. Measure: `useLayoutEffect` finds the target and stores its rect `{ top, left, width, height }` (viewport coordinates) in state. Re-measure on `window` `resize` and `scroll` (capture: true), with a `ResizeObserver` on the target and on `document.body`, and on a `requestAnimationFrame` loop throttled to every 250 ms while mounted (cards animate in; cheap enough). Clean up all listeners on unmount or target change. If no element is found, rect = null.
  2. Render (portal to `document.body`):
     - Root `<div className="tutorial-spotlight" role="dialog" aria-modal="false" aria-labelledby=... aria-describedby=...>` fixed, inset 0, z-index 75 (above `.turn-order-picker` 60 and `.first-run-tutorial` 70), `pointer-events: none`.
     - Hole: `<div className="tutorial-spotlight-hole">` absolutely placed at rect ± padding, `border-radius: 10px`, `box-shadow: 0 0 0 9999px rgb(6 5 8 / 72%)` (this paints the dim layer around the hole), plus an inner ring `outline: 2px solid var(--brass-bright, #d6b47a)` and a soft glow. No hole when rect is null: render a plain full-screen dim layer instead.
     - Callout: `<aside className="tutorial-spotlight-callout">` with `pointer-events: auto`, width `min(340px, calc(100vw - 24px))`. Header: step label left, "건너뛰기" button (`menu-secondary`) right. Then `<h2>` title (display font), `<p>` description, optional `menu-primary` continue button.
     - Placement: below the hole if there is >= 180 px below it, else above it, else centred on the viewport; horizontally centred on the hole and clamped to 12 px from the viewport edges. An arrow `<span className="tutorial-spotlight-arrow">` (rotated square) points at the hole from the callout edge.
  3. Motion: the hole moves with `transition: top .25s, left .25s, width .25s, height .25s`; disabled under `prefers-reduced-motion: reduce`.
  4. Focus: when the callout has a continue button, focus it on step change; otherwise do not steal focus (the player must click the board).

### I02. Tests
- Related Files:
  - `apps/web/src/components/TutorialSpotlight.test.tsx` — new (`// @vitest-environment jsdom`)

#### Details
- `findSpotlightTarget` returns the first element with a non-zero box (mock `getBoundingClientRect` on two elements, the first returning zeros) and null when nothing matches.
- With a target: the hole is positioned at the mocked rect plus padding; the callout shows title, description, step label; "건너뛰기" calls `onSkip`; "계속" appears only with `onContinue` and calls it.
- With `target={null}`: no hole element, callout still rendered.
- The root has `pointer-events: none` in CSS is not testable in jsdom; instead assert the root and hole have no click handlers and that a click on an element under the overlay still reaches it (`fireEvent.click` on a button rendered beside the spotlight works).
- Unmount removes the resize listener (spy on `window.removeEventListener`).

## Acceptance Criteria
- [ ] Only the target stays bright; the rest is dimmed; the callout and arrow sit next to the target and stay on screen at 390 px and 1440 px widths.
- [ ] The overlay does not block clicks or drags anywhere.
- [ ] Component tests pass.

## Validation
- `export PATH="$HOME/.local/node-v24.22.3-darwin-arm64/bin:$PATH"; npm test` — all pass.
- `npm run lint`, `npx tsc -p apps/web --noEmit` — clean.

## Commit Message
```text
feat(web): add a spotlight overlay for the tutorial

Plan: 2026-11-25-hero-power-cooldown-and-tutorial
Phase: P02-spotlight-tutorial
Task: T01-spotlight-overlay

- TutorialSpotlight dims everything but one element and points a callout at it.
- Follows layout changes; never blocks clicks or drags.
```

## Progress
- [ ] 구현 완료
- [ ] 검증 통과
- commit: pending
