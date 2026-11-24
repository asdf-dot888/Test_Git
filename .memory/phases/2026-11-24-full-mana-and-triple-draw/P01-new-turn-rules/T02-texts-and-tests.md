# Task: T02 Texts and Tests

## Status: done

## Implementation
- Update every test that pins the old mana/draw numbers (engine, balance, web).
- `GameGuideModal.tsx` mana paragraph and its test; both `game-architecture.html` copies; README difficulty paragraph; the first-run tutorial wording if it assumes limited mana (`FirstRunTutorial.tsx`, `tutorialHealth`/progress tests).
- Grep for "마나 5/10", "회복", "카드 1장" style statements.

## Validation
- `npm run build`, `npm test`, `npm run lint`.

## Commit Message
```text
docs: describe full mana and triple draw in the guide and tests

Plan: 2026-11-24-full-mana-and-triple-draw
Phase: P01-new-turn-rules
Task: T02-texts-and-tests
```

## Progress
- [x] Guide, both architecture pages and README updated; 1198 tests pass after rewriting the pinned engine, web and API tests (a test helper gives scenario runs 10 mana; enemy scenarios start on turn 10; the 11 golden hashes were re-captured).
