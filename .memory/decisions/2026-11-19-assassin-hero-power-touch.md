# Decisions: Assassin Hero Power on Touch Devices

- Date: 2026-11-19
- Status: Confirmed
- Related: [2026-11-19-mobile-card-tap-details-and-touch-drag.md](./2026-11-19-mobile-card-tap-details-and-touch-drag.md). This decision **replaces D08** of that file (D08 was a planning default that the user had not confirmed).

## D01. Two ways to use the assassin hero power on touch
- **Chosen**: Both are supported.
  1. **Tap, then tap a target** (current behavior): tapping the hero power button enters target mode (`targetMode: "hero-power"`); tapping a valid enemy target uses it; tapping the button again cancels. While this mode is active the details tap is suspended.
  2. **Drag the button onto a target**: pressing the hero power button and moving the finger past the drag threshold picks it up; releasing it on a valid target uses the hero power.
- **Rationale**: The user asked for both. Drag matches the "tap to read, drag to act" rule used for cards; tap-then-tap keeps the PC-equivalent flow and works for players who do not drag.

## D02. Dropping on an invalid place cancels completely
- **Chosen**: If the button is released anywhere that is not a valid target (empty ground, a friendly minion, outside the board), nothing happens: no target mode is switched on, no mana is spent, and the button returns to its previous state.
- **Rationale**: Same behavior as dropping a card on an invalid place, so it is predictable. The user chose this over switching into target mode after the drop.

## D03. Defaults (not asked, inferred from existing code and rules)
- Valid targets are the same as for the tap flow (enemy minions and the enemy hero); drop validation reuses the existing hero power target rule, not a copy of it.
- Only the assassin hero power can be dragged. The warrior and demonist hero powers need no target and stay single-tap, unchanged.
- The button can only be picked up when it can be used today (enough mana, not used this turn, player's turn, not resolving). Otherwise it stays disabled as now.
- A tap that does not move past the drag threshold still behaves as the tap flow in D01.1, so the two ways do not conflict.
- During the first-run tutorial the hero power stays blocked as now (`tutorialMode !== "inactive"`).
- The tutorial and game guide mention of the assassin hero power on touch should say both ways (tap then tap a target, or drag onto a target).

## Codebase Findings
- Drag payloads today are only `card` and `minion` (`DragPayload` in `components/dragInteractions.ts`); a hero power payload must be added and resolved by `resolveDrop` / `handleDropInteraction` (`App.tsx`), which already feeds the shared drop rules (`game/dropRules.ts`).
- `activateHeroPower` in `App.tsx` dispatches `select-hero-power` for the assassin and `use-hero-power` otherwise; the target path dispatches `use-hero-power` with `targetId` (`enemy-hero` for the enemy hero).
- `HeroPowerControl.tsx` owns the button and its `onActivate` click; touch drag is in `components/useTouchDrag.tsx` and `touchDrag.ts` (`DragOrigin` is `hand | board`).
