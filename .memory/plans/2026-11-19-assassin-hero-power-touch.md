# Plan: Assassin Hero Power on Touch (tap-then-tap and drag)

- Date: 2026-11-19
- Decisions: [2026-11-19-assassin-hero-power-touch](../decisions/2026-11-19-assassin-hero-power-touch.md) (replaces D08 of [mobile tap details and touch drag](../decisions/2026-11-19-mobile-card-tap-details-and-touch-drag.md))
- Status: in progress (P01 done; next P02-T01)

## Goal
On touch devices the assassin hero power (“그림자 습격”, 2 mana, 2 damage to an enemy minion or the enemy hero) can be used in two ways:
1. Tap the button, then tap a target (already works; keep it).
2. Press the button and drag it onto a target, release to use it.
Releasing on anything that is not a valid target cancels completely (no target mode, no mana spent). Warrior and demonist hero powers, and all PC behavior, stay as they are.

## Current state (verified in code)
- `apps/web/src/components/HeroPowerControl.tsx`: a `button.hero-power-button` with `onClick={handleActivate}` → `onActivate` (`App.activateHeroPower`: assassin dispatches `select-hero-power` → `targetMode: "hero-power"`; pressing it again dispatches `cancel-selection`; other classes dispatch `use-hero-power`). `disabled` unless ready (mana >= 2, not used, player's turn, not resolving; demonist also needs shards and board space) or in target mode.
- Tap-then-tap: while `targetMode === "hero-power"`, `GameBoard` passes `tapDetails={false}` to both lanes and makes the enemy hero targetable; `App.selectTarget` dispatches `use-hero-power` with `targetId` (`"enemy-hero"` for the hero).
- Engine rule (`packages/game-core/src/engine.ts` `useHeroPower`): the assassin target is `"enemy-hero"` or the id of a living enemy minion. **The enemy hero is a valid target even while enemy minions remain** (unlike a minion attack).
- Drag stack: `DragPayload = { kind: "card" | "minion"; instanceId }` in `components/dragInteractions.ts`; `game/dropRules.ts` (`resolveDrop`, `getValidDropTargets`, `DropAction`); `components/touchDrag.ts` (`classifyGesture`, `DragOrigin = "hand" | "board"`, `data-drop-target` parsing); `components/useTouchDrag.tsx` (hook returns `handlers`, `ghostPortal`, `dragging`; only `pointerType === "touch"` drags); `GameBoard` holds `dragState` for highlights and calls `onDropInteraction` → `App.handleDropInteraction(payload, target)`.
- Drop targets already exist: enemy lane minions (`minion:enemy:<id>`), enemy hero panel (`hero:enemy`).
- `GameGuideModal.tsx` touch text ends with “영웅 능력은 버튼을 눌러 사용합니다.” `FirstRunTutorial.tsx` does not mention the hero power. The hero power is blocked during the tutorial (`HeroPowerControl active={tutorialStep === undefined && ...}`, and `onUseHeroPower` is ignored while `tutorialMode !== "inactive"`).

## Design
- **Payload**: add `{ kind: "hero-power"; instanceId: "hero-power" }` to `DragPayload` (a fixed id keeps the type shape). Only the touch drag creates it; `readDragPayload` (HTML5 drag) stays limited to `card` and `minion`, so PC is unaffected.
- **Rules** (`dropRules.ts`): `resolveDrop` for `hero-power` returns `{ type: "use-hero-power"; targetId }` when: `run.playerClass === "assassin"`, `canAct(battle)`, `!battle.heroPowerUsed`, `battle.playerMana.current >= 2`, and the target is an enemy minion on `battle.enemyBoard` (`targetId` = its `instanceId`) or the enemy hero (`targetId = "enemy-hero"`). Everything else → `null`. `getValidDropTargets` works unchanged (it filters candidates through `resolveDrop`).
- **Gesture**: `DragOrigin` gains `"hero-power"`; `classifyGesture` treats it like `"board"` (any move past the threshold is a drag; there is nothing to scroll).
- **Control**: `HeroPowerControl` uses `useTouchDrag` for the assassin only, enabled when the power is ready and target mode is off. Handlers go on the button. A press that stays under the threshold is a tap and still runs `handleActivate` (tap-then-tap). After a drag the follow-up click is swallowed by `onClickCapture` (existing hook behavior), so a drop never also enters target mode. Dropping on an invalid place only ends the drag (cancel completely).
- **Ghost and highlight**: the ghost is the round hero power illustration; valid targets get the existing `is-drop-valid` / `is-drop-hover` styling because `GameBoard` already turns `dragState` into highlights.
- **Tutorial**: `handleDropInteraction` ignores `hero-power` payloads while the tutorial is active (the control is already inactive then).
- **Wording**: the touch guide says both ways.

## Phases
| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `done` | Drag payload, drop rules, gesture origin, App drop handling for the hero power | [P01](../phases/2026-11-19-assassin-hero-power-touch/P01-drag-rules/phase.md) |
| P02 | `todo` | Hero power button drag wiring, board highlights, styling, guide text, whole-screen tests, close-out | [P02](../phases/2026-11-19-assassin-hero-power-touch/P02-touch-ui-and-guidance/phase.md) |

## Risks
- Touch behavior cannot be verified on a real phone in this environment (the user could not check either). Mitigation: pure rule and gesture tests, jsdom pointer-event tests like `GameBoard.touch.test.tsx`, and a short manual checklist in P02-T02 added to the existing phone checklist of the previous plan.
- A drag followed by a click could also enter target mode. Mitigation: the existing `onClickCapture` window swallows it; a test pins “drop on a target does not leave `targetMode: "hero-power"`”.
- The button is small (40 px, 34 px on narrow screens) so a finger covers it; the ghost must be offset/visible. Mitigation: reuse the existing ghost positioning; the ghost is larger than the button.
- A page scroll could start from the button. Mitigation: `touch-action: none` on the assassin button, and the existing `body.touch-dragging` rule.
- The new payload kind widens `DragPayload`; places that read `payload.kind` must stay exhaustive. Mitigation: TypeScript build plus tests in T01.
- Unrelated modified or untracked files exist in the working tree (see the handoff doc): commit by explicit file path only.
