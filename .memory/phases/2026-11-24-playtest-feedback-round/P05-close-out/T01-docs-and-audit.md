# Task: T01 Docs, Checklist and Audit

## Status: todo

## Goal
Make sure every player-facing text and doc matches the new rules, give the user one checklist for the things Claude cannot verify (layout on a phone, sound, feel), run the full audit and close the plan.

## Decision Summary
All of D01-D09. No release is part of this plan; a release (version bump, patch notes entry in `apps/web/public/changelog.html`, deploy) happens only when the user asks.

## Implementation
### I01. Texts
- `GameGuideModal.tsx`: mana line (done in P03-T01), the touch guide mentions of the buttons if they name positions, and a sentence that the boss area attack comes every 3rd turn on normal and every 2nd turn on hard. Update `GameGuideModal.test.tsx`.
- `FirstRunTutorial.tsx` and its tests: check that no step text names the old positions of the all-attack or end-turn buttons or the 20-second timer.
- `README.md`: "카드 조작" (touch: end turn is in the hero panel on phones), the difficulty paragraph from P04-T04, and any mention of the timer. `apps/web/public/game-architecture.html`: turn time, mana recovery, enemy mana, enemy bonuses, AI attack planning (one short paragraph each, matching the final constants). `docs/` pages that mention the timer or mana, if any (`grep -rnE "20초|마나|턴 종료" docs README.md apps/web/public/*.html`).
### I02. Checklist for the user (append to `.memory/phases/2026-11-19-card-details-and-touch-drag/P04-guidance-and-verification/T02-audit-and-close-out.md` as an addendum, and mirror it in `.memory/current.md`)
PC:
1. The all-attack button is left of the end-turn button in the bottom toolbar; pressing it attacks and then ends the turn as before.
2. The badge says `내 턴` / `상대 턴`, the board border changes colour, and a banner shows for about a second at each turn change; the banner never blocks a click.
3. Every hit shows a red `-N`, heals show a green `+N`, boss area attacks show one number per target, armor shows a shield mark.
4. Hovering a card makes a soft rustle, clearly different from the timer warning (decide: keep, softer, shorter, lower).
5. The turn lasts 30 seconds; the boss panel names the right turns on hard (2·4·6).
Phone (width <= 760px):
6. The end-turn button sits above the hero portrait (gold, small), all-attack takes the old end-turn spot in the toolbar, nothing overlaps the hero power button, and both are easy to hit.
7. The badge and the banner are visible; the numbers are readable and do not cover the minion stats.
Game feel:
8. The enemy plays cards regularly; the same cards have the same health on both sides; normal and hard feel at their target difficulty.
### I03. Audit
- Run the whole validation: `npm run build`, `npm test` (note the file and test counts), `npm run lint`; `git status` shows only intended changes; no leftover `console.log`, debug code or scratch files; `docs/balance/2026-11-24-feedback-round-*.md` are committed.
- Check that the flaky-test note in `current.md` is still accurate (mention if a flaky failure occurred during this plan).
### I04. Close-out
- Mark every task `done` in the task files and phase files, mark the plan `done` with a one-line summary, and rewrite `.memory/current.md` (no active task, what was released or not, the pending items: the user's phone/PC checks, token rotation, the untracked files question).

## Acceptance Criteria
- [ ] No text in the app, README or docs states the old numbers (mana 1/2/3, 20 seconds, enemy minion health bonus, fixed boss turns).
- [ ] The checklist is saved in both places.
- [ ] Full validation passes and the numbers are recorded.
- [ ] The plan, phases and tasks are marked done and `current.md` is updated.

## Validation
- `npm run build`, `npm test`, `npm run lint`
- `grep -rnE "20초|1·2·3|3·6·9" apps/web/src apps/web/public README.md docs` returns only intended hits (the normal-difficulty boss turns).

## Commit Message
```text
docs: close out the playtest feedback round

Plan: 2026-11-24-playtest-feedback-round
Phase: P05-close-out
Task: T01-docs-and-audit
```

## Progress
- [ ] implementation complete
- [ ] validation passed (record counts)
- commit: pending
