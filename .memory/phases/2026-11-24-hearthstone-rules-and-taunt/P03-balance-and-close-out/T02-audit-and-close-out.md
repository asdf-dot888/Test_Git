# Task: T02 Audit, User Checklist, Close-out

## Status: todo

## Goal
Run the full validation, give the user one checklist for what only they can verify (feel, look, sound, phone), and close the plan.

## Implementation
### I01. Audit
- `npm run build`, `npm test` (record file and test counts), `npm run lint`; `git status` shows only intended changes; no leftover `console.log`, scratch files or temporary experiment code; `grep -rn "attackAllReadyMinions\|AllAttackButton\|refillDrawPile" apps packages --include="*.ts" --include="*.tsx"` is empty; `docs/balance/2026-11-24-hs-rules-*.md` are committed; the unrelated untracked files were not touched.
- Mention any flaky-test failure that occurred during the plan.
### I02. Checklist for the user (append to `.memory/phases/2026-11-19-card-details-and-touch-drag/P04-guidance-and-verification/T02-audit-and-close-out.md` as an addendum and mirror it in `.memory/current.md`)
PC:
1. A new battle shows two face-down cards; picking one reveals 선공/후공; first = 4 cards on turn 1, second = enemy plays first, you get 4 cards and the Coin.
2. Taunt minions have a shield border and the card text starts with `도발.`; attacking something else shows the message; the dimmed targets match the real rules; the sounds for playing a taunt and a blocked attack are acceptable (adjust in `game/audio.ts` / `soundRecipes.ts`).
3. You can hit the enemy hero while it has minions without taunt; there is no all-attack button; the end-turn button is where it was.
4. One card per turn; when the deck runs out, fatigue 1, 2, 3 hits the hero (check on a long battle).
5. The enemy attacks with everything it can and respects taunt; as the second player it uses the Coin sensibly.
Phone (width <= 760px):
6. The picker fits, cards are easy to tap; the board with 6 minions is readable with the taunt border; the end-turn button is in the hero panel as before.
Game feel:
7. Normal and hard feel at the target difficulty; games end instead of stalling.
### I03. Close-out
- Mark every task and phase `done`, mark the plan `done` with a one-line summary, mark the previous plan `2026-11-24-full-mana-and-triple-draw` T03 as superseded, and rewrite `.memory/current.md` (no active task; released or not; pending items: the user's checks, the class-gap decision, Azure token rotation, the untracked files question, deleting the old private ChatGPT Sites copy).

## Acceptance Criteria
- [ ] Full validation passes and the counts are recorded.
- [ ] The checklist is saved in both places; the plan, phases and tasks are marked done; `current.md` is updated.

## Validation
- `npm run build`, `npm test`, `npm run lint`

## Commit Message
```text
docs: close out the Hearthstone rules and taunt plan

Plan: 2026-11-24-hearthstone-rules-and-taunt
Phase: P03-balance-and-close-out
Task: T02-audit-and-close-out
```

## Progress
- [ ] done
