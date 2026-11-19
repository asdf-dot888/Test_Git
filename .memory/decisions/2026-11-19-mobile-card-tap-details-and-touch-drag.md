# Decisions: Mobile Card Tap Details and Touch Drag

- Date: 2026-11-19
- Status: Confirmed
- Related: [2026-11-19-discard-card-hover-preview.md](./2026-11-19-discard-card-hover-preview.md) (PC hover preview). This decision replaces the mobile long-press details mentioned there.

## D01. Touch devices: tap shows details, drag acts
- **Chosen**: On touch devices (coarse pointer), a single tap on any card opens the card details popup. This covers hand cards, player and enemy minions on the board, reward cards, and the discard picker cards. Playing a card and attacking are done only by dragging (card → target, minion → enemy minion/hero). The old “tap to select, then tap a target” flow is removed on touch devices. The 500 ms long-press details are removed.
- **Rationale**: The user wants one clear gesture for each purpose: tap to read, drag to act. Long press currently also triggers the browser's image-save menu.
- **PC behavior is unchanged**: click-to-select, hover preview, and HTML5 drag stay as they are.

## D02. Closing the details popup
- **Chosen**: The popup closes by tapping the empty backdrop or the × button (existing `CardDetailsPopup` behavior). Details open even when it is not the player's turn or the card cannot be played.
- **Rationale**: Matches the requested interaction and the existing popup.

## D03. Choosing a card from the reward and discard screens on touch devices
- **Chosen**: The details popup shows a large action button in these screens: “이 카드 받기” for rewards and “이 카드 버리기” for the discard picker (including the deck-overflow case). Tapping the button confirms the choice and closes the popup. The existing disabled states (saving, already chosen) also disable the button.
- **Rationale**: The player reads the card first and then decides, which reduces accidental picks. PC keeps click-to-choose.

## D04. Touch drag drop rules
- **Chosen**: Reuse the PC drop rules exactly through `handleDropInteraction` (minion card → empty slot; targeted spell → minion or enemy hero as the PC rules define; attacking minion → enemy minion, or enemy hero when no enemy minions remain). While dragging, highlight valid drop targets (empty slots, minions, enemy hero). A drop on an invalid place cancels the action and the card returns to its origin. A floating copy of the card follows the finger.
- **Rationale**: One rule set for both input methods avoids behavior differences and tutorial regressions.

## D05. Separating hand scroll from card drag
- **Chosen**: Decide by finger direction. A mostly horizontal movement scrolls the hand; a vertical or diagonal-upward movement starts dragging the card. Board minions have no scrolling conflict and start dragging immediately after a small movement threshold (about 10 px, the same threshold `CardInspection` uses).
- **Rationale**: No waiting time and no long-press feel; keeps the hand scrollable.

## D06. Stop the browser image menu
- **Chosen**: Prevent the native image menu and text selection on card elements: `-webkit-touch-callout: none`, `user-select: none`, `draggable={false}` on card images, and block `contextmenu` on cards.
- **Rationale**: The long-press image-download menu appears because cards contain `<img>` elements.

## D07. Tutorial and game guide text
- **Chosen**: On touch devices, replace the instructions with drag wording: “카드를 끌어 놓아 사용하세요”, “하수인을 끌어 적을 공격하세요”, “카드를 탭하면 자세히 볼 수 있습니다”. PC keeps the current wording. Add an input explanation to the game guide. Tutorial step completion must work through the new touch drag (it already advances when `handleDropInteraction` dispatches).
- **Rationale**: Touch users should not be told to “select” a card when selection no longer exists on their device.

## D08. Assassin hero power target (added while planning; default, not asked)
- **Chosen**: The assassin hero power still needs a target and has no card to drag. It stays two-step on touch: tap the hero power button to enter target mode, then a tap on a valid enemy target selects it (the details tap is suspended only while target mode `hero-power` is active). Tapping the hero power button again cancels, as today. The warrior and demonist hero powers need no target and are unchanged.
- **Rationale**: Without this the assassin hero power could not be used on touch devices once taps open details. The user may overrule this default (for example by dragging the hero power button onto a target).

## Codebase Findings
- Hand cards ([CardView.tsx](../../apps/web/src/components/CardView.tsx)) and player minions ([MinionCard.tsx](../../apps/web/src/components/MinionCard.tsx)) use HTML5 `draggable`, which does not work reliably with touch, so mobile currently relies on tap-select then tap-target.
- `.hand-cards` has `touch-action: pan-x` (horizontal scroll), which must be handled when a card drag starts (see D05).
- `CardInspection.tsx` currently provides a 500 ms long-press details popup on touch and optional desktop hover; board minions have no `CardInspection` yet.
- `CardDetailsPopup.tsx` already closes via backdrop and ×.
- `RewardScreen.tsx` and `DiscardPicker.tsx` choose a card on tap/click today; they need the in-popup action button on touch.
- `handleDropInteraction` in `App.tsx` holds the shared drop rules and tutorial advancement; the touch drag layer should call it rather than duplicate rules.
- `FirstRunTutorial.tsx` (steps `play-card` and `attack`) and `GameGuideModal.tsx` contain the “select” wording to adapt.
