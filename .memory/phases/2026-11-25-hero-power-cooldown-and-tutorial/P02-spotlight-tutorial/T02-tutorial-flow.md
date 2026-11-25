# Task: T02 Eight-Step Spotlight Tutorial Flow

## Status: pending

## Goal
The first-run tutorial (and its replay from the game guide) runs 8 spotlight steps: turn-order cards (always first), mana, hand and cost, play a minion, end turn, attack, hero power, end turn. The old top text box is replaced by `TutorialSpotlight`. New players learn every core rule by doing it.

## Decision Summary
- D03: the turn-order picker is shown in the tutorial battle; whichever card is picked, the player goes first.
- D05: the 8 steps and their texts; touch devices keep drag wording.
- D01/D02: hero power costs 2 mana and then rests 2 turns; the tutorial lets the player use it once.

## Implementation

### I01. Step model and copy
- Related Files:
  - `apps/web/src/components/FirstRunTutorial.tsx` :: `TutorialStepId`, `TutorialAction`, `STEP_COPY`, `TOUCH_STEP_COPY`, `FirstRunTutorial` — modify (keep the file and export names so imports stay valid)

#### Details
- **Signatures & Types**:
  ```typescript
  export type TutorialStepId = "turn-order" | "mana" | "hand" | "play-card" | "end-first-turn" | "attack" | "hero-power" | "end-second-turn";
  export type TutorialAction = "continue" | "pick-turn-order" | "play-card" | "end-turn" | "attack" | "hero-power";
  export const TUTORIAL_STEPS: readonly TutorialStepId[] = ["turn-order", "mana", "hand", "play-card", "end-first-turn", "attack", "hero-power", "end-second-turn"];

  export interface FirstRunTutorialProps {
    step: TutorialStepId;
    attackUnavailable?: boolean;
    /** True when the hero power cannot be used right now (mana < 2, Demonist without 2 shards, board full). */
    heroPowerUnavailable?: boolean;
    inputMode?: "touch" | "pointer";
    onAction(action: TutorialAction): void;
    onSkip(): void;
  }
  ```
- `FirstRunTutorial` now renders `<TutorialSpotlight>` with `stepLabel = \`${index + 1} / 8\``, the copy below, and the target per step:

  | Step | Target selector (first visible match) | Copy (pointer) | Touch copy differs | Continue button |
  | :--- | :--- | :--- | :--- | :--- |
  | turn-order | `.turn-order-cards` | 선후공 정하기 / "뒷면 카드 한 장을 골라 순서를 정합니다. 매 전투 이렇게 정해지고, 후공은 카드 1장과 동전(이번 턴 마나 +1)을 더 받습니다." | "탭해서 고르세요" | no |
  | mana | `.player-controls .mana-display` | 마나 / "카드를 내려면 마나가 필요합니다. 첫 턴은 1마나이고 매 턴 1씩 늘어 최대 10이 됩니다. 남은 마나는 다음 턴으로 넘어가지 않습니다." | same | 계속 |
  | hand | `.hand-panel` | 손패와 비용 / "카드 왼쪽 위 숫자가 비용입니다. 매 턴 시작에 카드를 1장 뽑고, 손패는 10장까지 들 수 있습니다." | "+ 카드를 탭하면 자세히 볼 수 있습니다." | 계속 |
  | play-card | `.hand-panel` | 하수인 내기 / "밝게 빛나는 카드는 지금 낼 수 있습니다. 하수인 카드를 골라 내 전장에 내세요." | "카드를 위로 끌어 빈 칸에 놓으세요." | no |
  | end-first-turn | `.end-turn-button` | 턴 종료 / "할 일을 마치면 턴 종료를 누르세요. 이제 상대가 움직입니다." | same | no |
  | attack | `.lane-player` | 하수인 공격 / "지난 턴에 낸 하수인은 이제 공격할 수 있습니다. 내 하수인을 고른 뒤 적 하수인이나 적 영웅을 누르세요. 낸 턴에는 공격할 수 없고, 도발 하수인이 있으면 그것부터 공격해야 합니다." | "내 하수인을 끌어 적 위에 놓으세요." | no |
  | hero-power | `.hero-power-control` | 영웅 능력 / "마나 2로 영웅 능력을 씁니다. 한 번 쓰면 내 턴 2번을 쉰 뒤 다시 쓸 수 있으니 아껴 쓰세요." (assassin: "+ 적 하수인이나 적 영웅을 고르세요.") | assassin touch: "버튼을 적 위로 끌어 놓아도 됩니다." | only when `heroPowerUnavailable`: title "영웅 능력은 다음에" + text explaining why (mana 2, Demonist shards) and a 계속 button |
  | end-second-turn | `.end-turn-button` | 마무리 / "턴 종료를 누르면 튜토리얼이 끝납니다. 이후 규칙은 메뉴의 게임 방법에서 다시 볼 수 있습니다." | same | no |

- The end-turn selector must match the compact board too: use `".end-turn-button"` (both the toolbar button and the compact `hero-end-turn-button` carry that class; `findSpotlightTarget` picks the visible one).
- `attackUnavailable` keeps its current special copy ("공격할 하수인이 없어요" ...).
- Remove the old `.first-run-tutorial` box markup from this component (keep its CSS for the notice toast `.first-run-tutorial-notice`, which is separate).

### I02. Flow in App
- Related Files:
  - `apps/web/src/App.tsx` :: tutorial start effect (~line 330-357), `pickTurnOrder` (~line 397), `tutorialAllows`, `advanceTutorial` (~line 443-465), pending-action effect (~line 359-394), `replayTutorial` (~line 430), `onUseHeroPower`/drop gating (~line 630, 798), `<FirstRunTutorial>` props (~line 802) — modify
  - `apps/web/src/components/GameBoard.tsx` :: `canEndTurn`, `fieldActionsDisabled`, `HandPanel disabled`, `HeroPowerControl active` (~lines 98-99, 173, 199) — modify

#### Details
1. Start: the start effect no longer auto-picks. It sets `setTutorialStep("turn-order")` and `setTutorialMode("first-run")`. If the battle already has `firstSide !== null` (a reload mid-tutorial), start at `"mana"`.
2. `pickTurnOrder(index)`: when `tutorialMode !== "inactive"`, compute `firstIndex = currentBattle.turnOrderCards.indexOf("first")`, call `setTurnOrderPick({ battleId, index, role: "first" })` (the clicked card flips to 선공) and dispatch `{ type: "choose-turn-order", cardIndex: firstIndex }`. Outside the tutorial the function is unchanged.
3. Step advance:
   - `turn-order` → `mana` when `run.battle.firstSide` becomes non-null (handle in the pending-action effect or a small effect on `session.run`).
   - `mana` → `hand` and `hand` → `play-card` on `continue`.
   - `play-card` → `end-first-turn` and `end-first-turn` → (next player turn) `attack`: unchanged logic.
   - `attack` → `hero-power` (was `end-second-turn`) after the attacker has attacked.
   - `hero-power` → `end-second-turn`: pending action `"hero-power"` resolves when `battle.heroPowerUsed` becomes true; or on `continue` when `heroPowerUnavailable`.
   - `end-second-turn` → finish: unchanged (`second-turn-end`).
   - The `attack-retry` and `play-card-recovery` paths keep working; `attack-retry` (no attacker available, the player ended the turn) still returns to `attack` on the next player turn.
4. `tutorialAllows`: add `(tutorialStep === "turn-order" && action === "pick-turn-order")`, `(tutorialStep === "mana" || tutorialStep === "hand") && action === "continue"`, `(tutorialStep === "hero-power" && (action === "hero-power" || (heroPowerUnavailable && action === "continue")))`. Remove the `inspect-hand` branch.
5. Hero power gating: `onUseHeroPower` and the hero-power drop (line ~631) are allowed when `tutorialMode === "inactive" || tutorialStep === "hero-power"`; on use in the tutorial call `advanceTutorial("hero-power")` before dispatching. For the assassin, target mode starts on the button press; the step only advances when `heroPowerUsed` becomes true (cancelled target mode does not advance).
6. `heroPowerUnavailable` (App): `battle.playerMana.current < 2 || battle.heroPowerCooldown > 0 || (run.playerClass === "demonist" && (battle.soulShards < gameConstants.soulShardHeroPowerCost || battle.playerBoard.length >= gameConstants.maxBoard))`.
7. GameBoard: `HeroPowerControl active` becomes `(tutorialStep === undefined || tutorialStep === "hero-power") && battle.activeSide === "player" && battle.status === "active"`. `canEndTurn` unchanged (end-first-turn/end-second-turn) — the hero-power step must not allow ending the turn. Card play stays blocked outside `play-card` (and the `attack` recovery case) as today.
8. Replay (`replayTutorial`): create the sandbox with `createGameRun(20261030, playerClass, "normal", { pickTurnOrder: true })` (`createGameRun` is `createRun` from `@board-game/game-core`, imported in `App.tsx` line 35; signature `createRun(seed, playerClass, difficulty, { pickTurnOrder })`) and start at `"turn-order"`.
9. Keep: health restore on finish (`restoreTutorialPlayerHealth`), completion record, skip at any step, replay snapshot restore.

### I03. Tests
- Related Files:
  - `apps/web/src/App.tutorial.test.tsx` — modify (existing lifecycle tests use the old step ids and texts)
  - `apps/web/src/components/FirstRunTutorial.test.tsx` — modify

#### Details
- Lifecycle: an account without completion sees the turn-order picker and the "선후공 정하기" spotlight; clicking either card → reveal says 선공, battle `firstSide === "player"`, step "마나". Continue → "손패와 비용" → continue → "하수인 내기"; play a minion → "턴 종료"; end turn → after the enemy turn "하수인 공격"; attack → "영웅 능력"; use the warrior power → "마무리"; end turn → tutorial finished and completion saved.
- Demonist without shards at the hero-power step shows the "영웅 능력은 다음에" copy with 계속, which advances.
- Hero power is refused (no dispatch) during steps other than `hero-power`.
- Replay from the guide shows the picker too.
- FirstRunTutorial: each step renders its title and the touch copy where it differs; step label "n / 8".
- Update existing tests that referenced `inspect-hand` or "전투 안내 · 1 / 5".

## Acceptance Criteria
- [ ] New accounts see the picker in the first battle; the tutorial always ends up first.
- [ ] Each of the 8 steps highlights the right element on PC and phone and advances on the described action.
- [ ] The hero power can be used in its step and only there; unusable cases explain why and continue.
- [ ] Skip, replay, completion record and health restore still work.

## Validation
- `export PATH="$HOME/.local/node-v24.22.3-darwin-arm64/bin:$PATH"; npm test` — all pass.
- `npm run lint`, `npx tsc -p apps/web --noEmit` — clean.

## Commit Message
```text
feat(web): turn the first-run tutorial into an 8-step spotlight guide

Plan: 2026-11-25-hero-power-cooldown-and-tutorial
Phase: P02-spotlight-tutorial
Task: T02-tutorial-flow

- Spotlight steps: turn-order cards, mana, hand and cost, play a minion, end turn, attack, hero power, end turn.
- The tutorial battle shows the turn-order picker and always makes the player first.
- The hero power is usable in its own step; unusable cases explain why.
```

## Progress
- [ ] 구현 완료
- [ ] 검증 통과
- commit: pending
