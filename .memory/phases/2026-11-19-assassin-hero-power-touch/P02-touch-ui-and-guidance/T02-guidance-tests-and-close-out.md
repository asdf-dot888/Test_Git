# Task: T02 Guidance, Whole-Screen Tests and Close-out

## Status: todo

## Goal
Tell touch players about both ways, prove the full flow works through the real `App`, add the phone checklist, and close the plan.

## Decision Summary
- D03: the touch guide mentions both ways (tap then tap a target, or drag onto a target).

## Implementation
### I01. Guide text
- `apps/web/src/components/GameGuideModal.tsx` (touch branch of “조작 방법”): replace the final sentence “영웅 능력은 버튼을 눌러 사용합니다.” with “영웅 능력은 버튼을 눌러 사용합니다. 암살자는 버튼을 누른 뒤 적을 탭하거나, 버튼을 적 위로 끌어 놓아 사용합니다.” (the other classes need no target, so the first sentence stays true for them). PC text is unchanged. Update `GameGuideModal.test.tsx` to match.
- `FirstRunTutorial.tsx` does not mention the hero power; no change (verify with a search for `영웅 능력`).
### I02. Whole-screen tests
- `apps/web/src/App.touch.test.tsx` (existing file with whole-screen touch flows and its `elementFromPoint` stub): add for an assassin run
  1. drag the hero power button onto an enemy minion: the minion loses 2 health, mana −2, `heroPowerUsed`, no target banner (“영웅 능력 대상을 선택하세요”) is shown afterwards;
  2. drag it onto the enemy hero while an enemy minion exists: the enemy hero loses 2 health;
  3. drag it and release on empty space or a friendly minion: nothing changes (mana, board, no target banner);
  4. tap the button then tap an enemy minion (already covered; keep it green) and tap the button twice to cancel.
- Verify the three classes: warrior and demonist buttons are not draggable (a drag gesture does not use the power).
### I03. Phone checklist and close-out
- Append a section “Assassin hero power drag (this plan)” to `phases/2026-11-19-card-details-and-touch-drag/P04-guidance-and-verification/T02-audit-and-close-out.md` (the existing phone checklist) with these items for the user to try on a real phone:
  1. Assassin, 2+ mana: press and drag the hero power button; the ghost follows the finger and enemy targets are outlined.
  2. Release on an enemy minion and on the enemy hero: 2 damage, mana −2.
  3. Release on empty ground or a friendly minion: nothing happens and no target mode appears.
  4. Quick tap on the button: target mode opens; tap an enemy to use it; tap the button again to cancel.
  5. The page does not scroll while dragging the button; no image-save or text-selection menu appears on iOS Safari and Android Chrome.
  6. The finger does not cover the button so much that the drag cannot be started (the button is 34–40 px wide).
- Mark the plan `done`, update this phase's and P01's progress, and move `.memory/current.md` to “plan complete, waiting for the phone check” (release is separate: version bump and deploy only when the user asks; this plan is not released).

## Acceptance Criteria
- [ ] The touch guide text mentions both ways; the PC text is unchanged.
- [ ] The whole-screen tests above pass.
- [ ] Build, lint and the full test suite pass.
- [ ] The phone checklist is in the previous plan's close-out file and the plan and phases are marked done.

## Validation
- `npm run build`
- `npm test -- apps/web/src/components/GameGuideModal.test.tsx apps/web/src/App.touch.test.tsx`
- `npm test`
- `npm run lint`

## Commit Message
```text
docs(web): guide and checks for assassin hero power drag

Plan: 2026-11-19-assassin-hero-power-touch
Phase: P02-touch-ui-and-guidance
Task: T02-guidance-tests-and-close-out
```
Commit only the files this task changed (including the `.memory` files above), by explicit path.

## Progress
- [ ] implementation
- [ ] validation
