# Task: T02 Audit and Close-Out

## Status: todo

## Goal
Verify the whole feature, record what could not be verified, and hand the user a phone checklist. No new behavior.

## Decision Summary
- Both decision files are implemented as written, including D08 (assassin hero power) of the mobile decision.

## Implementation
### I01. Audit
- Re-read both decision files and confirm each Dxx is implemented; list any deviation in this task's progress log.
- Search for leftovers: the 500 ms long-press (`500` timers in `CardInspection`), `armLongPress`, tests asserting long press, and docs/strings that still say “길게 누르면” (`grep -rn "길게\|long press\|long-press" apps docs README.md`).
- Confirm PC behavior is unchanged: click-to-select, hand hover preview (scaled), HTML5 drag between hand/lanes/hero.
### I02. Documentation
- `docs/` (the file that describes controls or UI, if any; search for “드래그” and “손패”) and `README.md` controls section: add touch controls and the PC discard preview.
- `.memory/current.md`: mark the plan complete and list manual checks as pending with the user.
### I03. Manual phone checklist (for the user; save in the task progress log)
1. Hand: tap a card → details; tap ×/empty area → closes; no “이미지 저장” menu on long press.
2. Drag a minion card up to an empty slot → plays; drag to an invalid place → returns.
3. Drag a spell onto an enemy minion / enemy hero → casts; targetless spell on the enemy hero.
4. Swipe the hand left/right → scrolls without picking up a card.
5. Drag a ready minion onto an enemy minion and onto the hero (when no enemy minions); fuse two friendly minions with a recipe.
6. Tap minions on both sides → details with current stats.
7. Reward screen: tap card → details → “이 카드 받기”; discard screen: tap → “이 카드 버리기”.
8. Assassin: tap the hero power button → tap a target; warrior and demonist: button works directly.
9. Tutorial text and game guide show drag instructions.
10. PC: hover discard cards and the added-card line → 220×320 preview.

## Acceptance Criteria
- [ ] Full `npm run build`, `npm test`, `npm run lint` pass.
- [ ] No leftover long-press code or text.
- [ ] Checklist recorded; unverified items stated plainly (no phone available to Claude).

## Validation
- `npm run build`
- `npm test`
- `npm run lint`

## Commit Message
```text
docs: close out card details and touch drag

Plan: 2026-11-19-card-details-and-touch-drag
Phase: P04-guidance-and-verification
Task: T02-audit-and-close-out
```

## Progress
- [ ] implementation complete
- [ ] validation passed
- commit: pending
