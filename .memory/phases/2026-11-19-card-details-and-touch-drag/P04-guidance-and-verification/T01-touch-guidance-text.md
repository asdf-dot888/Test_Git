# Task: T01 Touch Guidance Text

## Status: done

## Goal
Touch devices see drag-based instructions in the tutorial and the game guide; PC keeps the current wording.

## Decision Summary
- Mobile D07: on touch, “카드를 끌어 놓아 사용하세요”, “하수인을 끌어 적을 공격하세요”, “카드를 탭하면 자세히 볼 수 있습니다”; add an input explanation to the game guide; tutorial completion works through the touch drag.

## Implementation
### I01. Tutorial copy
- `apps/web/src/components/FirstRunTutorial.tsx`
  - Add `STEP_COPY_TOUCH: Record<TutorialStepId, { title; description }>` overriding `play-card` (“카드를 손패에서 위로 끌어 놓아 사용하세요. 하수인은 빈 칸에, 주문은 대상 위에 놓습니다. 카드를 탭하면 자세히 볼 수 있습니다.”) and `attack` (“공격 가능한 아군 하수인을 끌어 적 하수인 또는 적 영웅 위에 놓으세요.”). `inspect-hand` description gains “카드를 탭하면 자세히 볼 수 있습니다.” on touch. The two turn-end steps are identical.
  - Choose with `useTouchGuidance()` from `apps/web/src/game/inputMode.ts` (P02-T01). Optional prop `inputMode?: "touch" | "pointer"` for tests (default from the hook).
### I02. Game guide
- `apps/web/src/components/GameGuideModal.tsx`: add a “조작 방법” section with two short paragraphs, chosen by `useTouchGuidance()`: PC (“카드를 클릭해 선택하거나 끌어 놓습니다. 마우스를 올리면 카드 정보가 보입니다.”) and touch (“카드나 하수인을 탭하면 자세히 보고, 끌어 놓아 사용하거나 공격합니다. 영웅 능력은 버튼을 누릅니다.”). Update `GameGuideModal.test.tsx` expectations (the existing reward sentence stays).
### I03. Tests
- `FirstRunTutorial.test.tsx`: touch copy vs PC copy for `play-card` and `attack`; `GameGuideModal.test.tsx`: both variants with a mocked `matchMedia`.

## Acceptance Criteria
- [ ] Touch devices never read “선택하세요” instructions for card play or attack.
- [ ] PC wording is unchanged.
- [ ] Tests, lint, build pass.

## Validation
- `npm run build`
- `npm test -- apps/web/src/components/FirstRunTutorial.test.tsx apps/web/src/components/GameGuideModal.test.tsx`
- `npm test`
- `npm run lint`

## Commit Message
```text
feat(web): show drag instructions in the tutorial and guide on touch devices

Plan: 2026-11-19-card-details-and-touch-drag
Phase: P04-guidance-and-verification
Task: T01-touch-guidance-text
```

## Progress
- [x] implementation complete. `FirstRunTutorial` (`TOUCH_STEP_COPY` for inspect-hand, play-card, attack) and `GameGuideModal` (new “조작 방법” section) choose touch or mouse wording from an optional `inputMode` prop, defaulting to `useTouchGuidance()` ((hover: none) and (pointer: coarse)). PC wording is unchanged; the tutorial's step logic needed no change because touch drops already go through `handleDropInteraction`.
- [x] validation passed: build clean, lint clean, 1095 tests (97 files). Added tests for both wordings in both components and for following the device media query. The two test files had no `afterEach(cleanup)`, which hid duplicate renders; it was added.
- commit: see Git history
