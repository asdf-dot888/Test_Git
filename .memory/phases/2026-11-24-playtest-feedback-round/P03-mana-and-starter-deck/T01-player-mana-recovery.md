# Task: T01 Player Mana Recovery 2 / 3 / 4

## Status: done

## Goal
At the start of each player turn the player recovers 2 mana on turns 2-3, 3 mana on turns 4-6 and 4 mana from turn 7 (was 1 / 2 / 3). Starting mana 5, maximum 10 and carry-over of unspent mana stay.

## Decision Summary
D06 (option B: faster ramp). The game becomes easier; the balance is recovered in P04.

## Implementation
### I01. Engine (`packages/game-core/src/engine.ts`)
- In `startPlayerTurn` (around line 625) replace `const manaRecovery = battle.turnNumber <= 3 ? 1 : battle.turnNumber <= 6 ? 2 : 3;` by `const manaRecovery = playerManaRecovery(battle.turnNumber);`.
- Add and export `function playerManaRecovery(turnNumber: number): number { return turnNumber <= 3 ? 2 : turnNumber <= 6 ? 3 : 4; }` near the mana constants, with a comment naming the three bands, and add it to the exported `gameConstants` object (`playerManaRecovery`) so the web guide and tests use one source of truth.
- Do not change `gainRegularMana`, `MAX_MANA` (10), `INITIAL_MANA` (5) or the enemy recovery (P04-T01).
### I02. Texts
- `apps/web/src/components/GameGuideModal.tsx` (mana paragraph, line 33): `플레이어 마나는 2~3턴에 2, 4~6턴에 3, 7턴부터 4씩 회복하고 최대 10입니다.` Update `GameGuideModal.test.tsx` if it pins the sentence.
- `apps/web/public/game-architecture.html` (mana card, line 237): `... 턴 종료 시 현재 턴 구간에 따라 2·3·4 마나가 회복됩니다. ...`.
- Search for any other statement of the old numbers: `grep -rnE "1·2·3|2~3턴|회복" apps/web/src apps/web/public README.md docs` and fix what describes the player mana recovery (leave enemy and unrelated text alone).
### I03. Tests and bot
- Update every test that pins the old recovery (search `playerMana` and `max` expectations in `packages/game-core/src/engine.test.ts`, the balance tests under `packages/game-core/src/balance/*.test.ts`, and web tests that build battles with mana). Add a table test for `playerManaRecovery` (turns 2, 3 -> 2; 4, 5, 6 -> 3; 7, 8, 12 -> 4) and an engine test that a real turn change grants the amount and caps at 10 with carry-over.
- Check `packages/game-core/src/balance/bot.ts` for assumptions about mana per turn (none are expected); if it hard-codes recovery, use the exported function.

## Acceptance Criteria
- [ ] `playerManaRecovery` returns 2, 3, 4 for the bands above; a battle played through the engine shows the new mana on each turn and never exceeds 10.
- [ ] The guide and the architecture page state the new numbers; no remaining text claims 1 / 2 / 3.
- [ ] Build, lint and tests pass.

## Validation
- `npm run build`
- `npm test -- packages/game-core/src/engine.test.ts apps/web/src/components/GameGuideModal.test.tsx`
- `npm test`, `npm run lint`

## Commit Message
```text
feat(core): raise player mana recovery to 2/3/4 per turn

Plan: 2026-11-24-playtest-feedback-round
Phase: P03-mana-and-starter-deck
Task: T01-player-mana-recovery
```

## Progress
- [x] implementation complete. `playerManaRecovery(turnNumber)` exported from `engine.ts` (2 / 3 / 4) and in `gameConstants`; `startPlayerTurn` uses it. Texts updated: `GameGuideModal.tsx` (+ its test), `apps/web/public/game-architecture.html` and its copy `docs/game-architecture.html`. The balance bot has no mana-per-turn assumption. Engine tests updated (tier table, carried mana, empty mana, legacy cap, temporary mana expiry) plus a table test for `gameConstants.playerManaRecovery`.
- [x] validation passed: build clean, lint clean, 1168 tests (101 files). Balance numbers will drift (the game is easier now); P04-T04 retunes them.
- commit: see Git history
