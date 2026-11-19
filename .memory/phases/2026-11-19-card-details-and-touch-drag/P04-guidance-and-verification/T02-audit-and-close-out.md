# Task: T02 Audit and Close-Out

## Status: done

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
8. Assassin: tap the hero power button → tap a target, or drag the button onto a target (see the addendum below); warrior and demonist: button works directly.
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
- [x] implementation complete. Audit against both decision files:
  - Discard D01–D04: hover preview shown from `DiscardPicker` chips and the added-card line, fixed 220×320 (shrinks on small viewports), keyboard focus supported, discard rules unchanged. Done.
  - Mobile D01 (tap = details for hand, both boards, rewards, discard picker; long press removed; PC unchanged), D02 (backdrop or × closes; details open for disabled cards), D03 (“이 카드 받기” / “이 카드 버리기” buttons in the popup), D04 (same drop rules, valid targets outlined, invalid drop returns the card, ghost follows the finger), D05 (hand pan vs vertical drag by direction), D06 (image menu blocked), D07 (touch wording in tutorial and guide), D08 (assassin hero power: button, then tap target). Done.
  - Deviations from the blueprints, all recorded in the task logs: tap detection is click-based (P02-T01); spells use strict target rules for touch, while PC still sends a wrong spell target to the game so it shows its error (P03-T01); no new hero power banner was needed (P03-T04).
  - Leftover search: no long-press code remains in the card components; the only “long press” strings are tests asserting it does nothing, a comment, and the unrelated opening-hand redraw tooltip.
  - Docs: README gained a “카드 조작” table; `docs/game-architecture.html` mentions the discard preview and the touch discard flow.
- [x] validation passed: build clean, lint clean, 1095 tests (97 files).
- Not verified by Claude (no phone or browser available): how the preview, popup, drag ghost and outlines look; `touch-action` behavior (hand swipe vs vertical drag, board drag, no page scroll while dragging); the native image menu really stays away on iOS Safari and Android Chrome; pointer capture and click-after-drag behavior on real devices.
- Manual phone checklist for the user (run `npm run dev` and open the LAN address on a phone, or use the deployed site after release): 1) hand: tap a card, details open; tap × or the empty area, they close; long press shows no “이미지 저장” menu. 2) drag a minion card up onto an empty slot, it plays; drag it onto an invalid place, it returns. 3) drag a spell onto an enemy minion or the enemy hero (targetless spells go on the enemy hero). 4) swipe the hand left and right, it scrolls without picking up a card. 5) drag a ready minion onto an enemy minion, and onto the hero when no enemy minions remain; fuse two friendly minions that have a recipe. 6) tap minions on both sides, details show current stats. 7) reward screen: tap a card, then “이 카드 받기”; discard screen: tap, then “이 카드 버리기”. 8) assassin: tap the hero power button, then a target; warrior and demonist: the button works directly. 9) tutorial and game guide show drag instructions. 10) PC: hover discard cards and the added-card line, a 220×320 preview appears.
- commit: see Git history

### Addendum (2026-11-19, plan `2026-11-19-assassin-hero-power-touch`): phone checklist for the Assassin hero power drag
Not verified by Claude (no phone or browser available). Please try on a real phone:
1. Assassin with 2 or more mana: press and drag the hero power button; the round ghost follows the finger and the enemy minions and the enemy hero are outlined.
2. Release on an enemy minion and on the enemy hero (also while enemy minions remain): 2 damage, mana −2, the button becomes unavailable for the rest of the turn.
3. Release on empty ground, an empty slot, a friendly minion or your own hero: nothing happens, no target mode appears, no mana is spent.
4. Quick tap on the button: target mode opens; tap an enemy to use it; tap the button again to cancel (this is the old flow and must still work).
5. The page does not scroll or zoom while dragging the button, and no image-save or text-selection menu appears on iOS Safari and Android Chrome.
6. The button is small (34–40 px): check that a finger can start the drag easily and that the ghost is not hidden under the finger.
7. Warrior and demonist: the button still works with a single tap and cannot be dragged.
