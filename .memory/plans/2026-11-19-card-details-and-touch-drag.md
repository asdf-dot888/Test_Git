# Plan: Card Details (PC Hover Preview) and Touch Tap-Details / Touch Drag

- Date: 2026-11-19
- Decisions:
  - [2026-11-19-discard-card-hover-preview](../decisions/2026-11-19-discard-card-hover-preview.md)
  - [2026-11-19-mobile-card-tap-details-and-touch-drag](../decisions/2026-11-19-mobile-card-tap-details-and-touch-drag.md)
- Status: done (2026-11-19). All 10 tasks implemented and covered by automated checks; the touch behavior still needs the user's check on a real phone (checklist in P04-T02). Released in v1.0.6 (2026-11-19, release commit 84d27af).

## Goal
1. PC: hovering a card in the discard picker (and the “추가할 카드” line of the reward-overflow case) shows a fixed-size (about 220×320) card preview with art, cost, name, kind, stats and effect text.
2. Touch devices: a single tap on any card (hand, both boards, rewards, discard picker) opens the details popup, which closes by backdrop or ×. Cards are played and minions attack only by dragging. Rewards and discards are confirmed with a button inside the popup. The browser's image menu no longer appears. Tutorial and guide text match.
PC click-to-select, hover preview and HTML5 drag stay as they are.

## Current state (verified in code)
- `apps/web/src/components/CardInspection.tsx`: wrapper `div.card-inspection-target` with optional desktop hover preview (`desktopHover`, 1.5× the hovered element's rectangle, portal to `document.body`, class `game-card-hover-preview`, `position: fixed; z-index: 80; pointer-events: none`) and a 500 ms touch long-press that opens `CardDetailsPopup`. Used by `CardView` (hand, `desktopHover`), `RewardScreen` and `DiscardPicker` (neither passes `desktopHover`).
- `CardDetailsPopup.tsx`: portal dialog, closes by backdrop, ×, or Escape. No action button.
- Hand cards and player minions use HTML5 `draggable` + `writeDragPayload`; drop targets are `.lane-slot` (`MinionLane.tsx`) and the enemy `HeroPanel.tsx` via `onDragOver/onDrop` + `readDragPayload`. HTML5 drag does not work reliably on touch, so touch users select (tap) then tap a target.
- `App.tsx` `handleDropInteraction(payload, target)` holds the drop rules (minion → empty slot; spell → minion or enemy hero; attacking minion → enemy minion, or enemy hero when no enemy minions; minion → friendly minion = `fuse-minions`) and the tutorial advancement. `selectCard` / `selectTarget` hold the tap-select flow and the assassin hero power target mode (`session.targetMode === "hero-power"`).
- Board minions (`MinionCard.tsx`) have no `CardInspection` yet.
- `.hand-cards` uses `touch-action: pan-x`; disabled card buttons use `pointer-events: none` (events then reach the wrapper).
- `FirstRunTutorial.tsx` (`STEP_COPY`: `play-card`, `attack`) and `GameGuideModal.tsx` mention “select”.

## Design
- **Input detection**: per event, `pointerType === "touch"` (not a global flag), so hybrid devices (touch laptops) keep mouse behavior for mouse and tap behavior for fingers. Guidance text uses `matchMedia("(hover: none) and (pointer: coarse)")`.
- **CardInspection** gains `hoverSize: "scaled" | "fixed"` (default `"scaled"`, hand unchanged), `tapDetails` (default `true`; a touch tap opens details and swallows the follow-up click), keyboard focus preview, and `action` (popup button). The 500 ms long-press is removed. Tap = pointer down/up on the wrapper within 10 px, so disabled children (`pointer-events: none`) still open details.
- **Touch drag** (new `touchDrag.ts` hook): pointer-event based; threshold 10 px; a floating card ghost portal follows the finger; hit-testing with `document.elementFromPoint` + `data-drop-target` attributes (`slot:<index>`, `minion:<side>:<id>`, `hero:enemy`); calls the same `handleDropInteraction`. Hand scroll vs drag by direction is delegated to the browser: `.hand-cards` keeps `touch-action: pan-x` on cards, so a horizontal move scrolls (the browser sends `pointercancel`) and a vertical or diagonal-upward move reaches our pointer handlers; board minions use `touch-action: none`.
- **Shared drop rules**: extract the rule table from `handleDropInteraction` into a pure module `apps/web/src/game/dropRules.ts` (`resolveDrop`, `getValidDropTargets`) used by the PC drop handlers, the touch drag, and the highlight styling, so there is one rule set.
- **Popup action**: `CardDetailsPopup` accepts `action?: { label; disabled?; onSelect() }`. RewardScreen (“이 카드 받기”) and DiscardPicker (“이 카드 버리기”) pass it; pressing it runs the choice and closes the popup.
- **Assassin hero power** (decision D08): touch users tap the hero power button, then tap a target; `tapDetails` is false for targetable cards only while `targetMode === "hero-power"`.

## Phases
| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `done` | PC fixed-size hover preview for the discard picker and the added-card line | [P01](../phases/2026-11-19-card-details-and-touch-drag/P01-pc-hover-preview/phase.md) |
| P02 | `done` | Touch tap opens details everywhere; popup action buttons; image menu suppression | [P02](../phases/2026-11-19-card-details-and-touch-drag/P02-touch-tap-details/phase.md) |
| P03 | `done` | Shared drop rules, touch drag engine, wiring, highlights, assassin hero power on touch | [P03](../phases/2026-11-19-card-details-and-touch-drag/P03-touch-drag/phase.md) |
| P04 | `done` | Touch guidance text, verification, close-out | [P04](../phases/2026-11-19-card-details-and-touch-drag/P04-guidance-and-verification/phase.md) |

## Risks
- Touch behavior cannot be verified on a real phone in this environment. Mitigation: pure functions (gesture classification, preview rectangle, drop rules) get unit tests, components get jsdom tests with synthetic pointer events, and P04-T02 writes a manual phone checklist for the user.
- `pointerType` and `PointerEvent` support in jsdom may be partial. Mitigation: P02-T01 first verifies how `fireEvent.pointerDown(el, { pointerType: "touch" })` behaves and keeps native touch-event fallbacks guarded by a once-per-gesture ref.
- Touch drag could break the tutorial or the existing PC drag. Mitigation: all drops go through the same `handleDropInteraction`; PC HTML5 handlers keep working and are covered by existing tests; HTML5 `dragstart` is cancelled only when the gesture started with a touch pointer.
- Hand scroll vs drag depends on browser `touch-action` behavior. Mitigation: keep `pan-x` on hand cards and test the gesture classifier; verify on a phone via the checklist.
- Removing tap-select on touch changes existing component tests (long-press tests, tap-select tests). They are rewritten in the task that changes the behavior, not left failing.
- The popup is rendered inside the wrapper in the React tree; pointer events from the portal bubble to the wrapper. Mitigation: ignore events whose target is outside the wrapper's DOM subtree.
