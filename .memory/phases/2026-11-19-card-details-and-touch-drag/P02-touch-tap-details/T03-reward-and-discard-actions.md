# Task: T03 Reward and Discard Actions

## Status: done

## Goal
On touch devices a tap on a reward card or a discard candidate opens details, and a large button inside the popup confirms the choice (“이 카드 받기” / “이 카드 버리기”). The added-card line also opens its details on tap. PC click-to-choose is unchanged.

## Decision Summary
- Mobile D03: popup action buttons, honoring existing disabled states. Discard D03: the added-card line is inspectable (hover on PC, tap on touch).

## Implementation
### I01. Reward screen
- `apps/web/src/components/RewardScreen.tsx`: pass to each `CardInspection`: `action={{ label: "이 카드 받기", disabled: disabled || Boolean(selectedCardId), onSelect: () => onChoose(cardId) }}`. The existing button `onClick={() => onChoose(cardId)}` stays for mouse and keyboard. Because a touch tap's click is swallowed by `CardInspection` (P02-T01), `onChoose` runs only through the popup button on touch.
### I02. Discard picker
- `apps/web/src/components/DiscardPicker.tsx`: each option gets `action={{ label: "이 카드 버리기", disabled, onSelect: () => onDiscard(card.instanceId) }}`.
- The added-card line wrapper from P01-T01 uses `tapDetails` (default true) without an action (informational).
### I03. Copy and style
- The popup action keeps the primary button look from P02-T01. Add `aria-label` text with the card name, for example `“<이름> 이 카드 버리기”`, only if the visible label alone is ambiguous in tests.

## Acceptance Criteria
- [ ] Touch tap on a reward card opens details; pressing “이 카드 받기” calls `onChoose(cardId)` once and closes; tapping × or the backdrop chooses nothing.
- [ ] Touch tap on a discard candidate opens details; pressing “이 카드 버리기” calls `onDiscard(instanceId)` once; disabled state disables the button.
- [ ] Mouse click on the cards still chooses/discards directly.
- [ ] Deck-overflow reward flow works end to end in the App tests (reward chosen, discard chosen).
- [ ] Tests, lint, build pass.

## Validation
- `npm run build`
- `npm test -- apps/web/src/components/RewardScreen.test.tsx apps/web/src/components/DiscardPicker.test.tsx`
- `npm test`
- `npm run lint`
- Tests: touch tap does not call `onChoose`/`onDiscard` until the popup action is pressed; disabled and `selectedCardId` states; mouse click path.

## Commit Message
```text
feat(web): confirm rewards and discards from the touch details popup

Plan: 2026-11-19-card-details-and-touch-drag
Phase: P02-touch-tap-details
Task: T03-reward-and-discard-actions
```

## Progress
- [x] implementation complete. `RewardScreen` passes `action` “이 카드 받기” (disabled while `disabled` or `selectedCardId`); `DiscardPicker` passes “이 카드 버리기” (disabled while `disabled`). The added-card line from P01-T01 opens details on tap without an action.
- [x] validation passed: build clean, lint clean, 1027 tests (93 files). Existing App tests for the deck-overflow reward flow (mouse path) stay green; new tests cover the touch tap → popup button path for rewards and discards, closing the popup choosing nothing, and the disabled states.
- commit: see Git history
