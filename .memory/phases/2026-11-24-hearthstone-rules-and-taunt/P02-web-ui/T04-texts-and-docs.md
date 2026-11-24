# Task: T04 Texts and Docs Match the New Rules

## Status: done

## Goal
Every player-facing text and doc describes the new rules: 1 draw per turn, fatigue, taunt, no all-attack button, the turn-order pick and the Coin.

## Decision Summary
D09. No release or version bump; the changelog entry is written only when the user asks for a release.

## Implementation
- `apps/web/src/components/GameGuideModal.tsx` (+ test): update the mana/draw paragraph (1 card per turn, no reshuffle, fatigue 1, 2, 3...), add a taunt paragraph (what it does, spells ignore it), the turn-order pick and the Coin, remove the all-attack button text and the "hero only attackable with an empty board" sentences, keep the boss-area cadence sentence.
- `apps/web/src/components/FirstRunTutorial.tsx` (+ test, `tutorialProgress.ts`): the attack step says `공격 가능한 아군 하수인을 선택한 뒤 적 하수인 또는 적 영웅을 공격하세요. 도발 하수인이 있으면 도발부터 공격해야 합니다.` (touch wording analog). The tutorial starts as first player (T03 I05).
- `EnemyIntentPreview.tsx`: the all-attack and attack texts stay correct (no "board empty" reasoning in strings).
- `README.md` ("카드 조작", rules summary, difficulty paragraph): new rules, taunt card list, turn-order pick, Coin, no all-attack button, fatigue; keep the targets table. `apps/web/public/game-architecture.html` and `docs/game-architecture.html`: one short paragraph each for draw/fatigue, taunt, turn order and the Coin, AI attack planning with taunt (both files identical in content).
- Search for stale statements: `grep -rnE "5장|다섯 장|전체 공격|영웅을 공격할 수|하수인을 모두 처치|다시 섞" apps/web/src apps/web/public README.md docs --include="*.tsx" --include="*.ts" --include="*.html" --include="*.md"` and fix every wrong hit (balance reports under `docs/balance/` are historical records and stay as they are).
- Update tests that pin changed texts.

## Acceptance Criteria
- [ ] No text states the old rules (5 draws, all-attack button, empty-board hero rule, reshuffle); the grep above shows only intended hits.
- [ ] `npm run build`, `npm test`, `npm run lint` pass.

## Validation
- `npm run build`
- `npm test -- apps/web/src/components/GameGuideModal.test.tsx apps/web/src/components/FirstRunTutorial.test.tsx`
- `npm test`, `npm run lint`

## Commit Message
```text
docs: describe the Hearthstone-style rules, taunt, turn order and the Coin

Plan: 2026-11-24-hearthstone-rules-and-taunt
Phase: P02-web-ui
Task: T04-texts-and-docs
```

## Progress
- [x] done. Updated GameGuideModal (1 draw, fatigue, turn order, Coin, taunt, no all-attack, drag at hero), FirstRunTutorial attack step (taunt hint), README (카드 조작 notes, new '전투 규칙 (하스스톤 방식)' section, difficulty paragraph) and both game-architecture pages (turn order and Coin card, draw/fatigue, taunt and AI notes); tests pin the new wording. Grep for the old statements (5 draws, all-attack button, empty-board hero rule, reshuffle) finds nothing outside balance reports. 1261 tests (104 files), lint and build pass.
- commit: see Git history
