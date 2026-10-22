# Task: T04 전투 승리 확인 흐름

## Status: pending

## Goal

모든 전투 승리 직후 `승리` 화면을 보여주고, 확인을 누른 다음 기존 카드 보상과 다음 전투 확인 화면으로 진행하도록 한다.

## Decision Summary

- 승리 표시를 플레이어 보상보다 먼저 보여주고, 확인 후 현재 보상 선택/건너뛰기 화면을 연다.
- 마지막 보스도 승리 화면과 보상 후 원정 완료 화면을 거친다. 새 승리 상태는 저장해 새로고침 뒤에도 확인 화면을 유지한다.

## Implementation

### I01. 저장 가능한 승리 확인 상태 및 액션

- Related Files:
  - `packages/game-core/src/types.ts` :: `RunState` — `pendingVictoryAcknowledgement` 필드; modify
  - `packages/game-core/src/engine.ts` :: `finishVictory`, `acknowledgeVictory` — 승리 상태 전환; modify
  - `packages/game-core/src/engine.test.ts` :: 승리 확인 및 보상 게이트; modify
  - `apps/api/src/routes/runRoutes.ts` :: `runSchema`, PUT field restoration — optional legacy boolean validation; modify
  - `apps/api/src/routes/runRoutes.test.ts` :: 새 상태 저장/구형 상태 검증; modify

#### Details

- Add `pendingVictoryAcknowledgement?: boolean` to `RunState`; `finishVictory` sets it to `true` alongside the existing pending reward, including the phase-three final boss where `battle` becomes `null`.
- Export `acknowledgeVictory(run: RunState): RunState`. It must require both a pending reward and `pendingVictoryAcknowledgement === true`, otherwise throw `GameRuleError("ENCOUNTER_NOT_READY", ...)`; on success clone the run and set the flag to `false` without changing reward, battle, health, or run status.
- `chooseReward` and `skipReward` retain current behavior once the acknowledgement is cleared. Do not change reward choices or skip support.
- Add optional Zod `pendingVictoryAcknowledgement: z.boolean()` for old saves. On PUT, preserve it when reconstructing typed `RunState`. Old saves without the field are treated as `false`.

### I02. 승리 화면과 화면 순서

- Related Files:
  - `apps/web/src/game/gameActions.ts` :: `GameAction`, `ruleMessage`, `reduceGameAction` — `acknowledge-victory`; modify
  - `apps/web/src/components/VictoryScreen.tsx` :: `VictoryScreen` — theatrical battle-clear panel; new
  - `apps/web/src/components/VictoryScreen.test.tsx` :: title and confirm callback; new
  - `apps/web/src/App.tsx` :: `GameSessionView` outcome precedence — route state before reward/terminal screens; modify
  - `apps/web/src/styles/board.css` :: `.victory-screen`, `.victory-card`, animation — celebratory visual; modify
  - `apps/web/src/App.outcome.test.tsx` :: full normal/boss/final transition; new

#### Details

- `GameAction` includes `{ type: "acknowledge-victory" }`; the reducer calls `acknowledgeVictory` through `sessionForRun` so the cleared flag is saved through existing `useRunSync` behavior.
- Add `VictoryScreenProps = { disabled?: boolean; onConfirm(): void }`. It renders large Korean heading `승리`, a short encounter-clear message, an animated gold accent, and one `확인` primary button. Disable confirm while sync is not ready/saving under existing button policy.
- In `GameSessionView`, render screens in this order after sync error/menu handling: pending victory acknowledgement, pending reward, terminal victory/defeat, battle-won continuation, active board. Pending victory screen must win over both `pendingReward` and final `run.status === "victory"`.
- After `확인`, existing reward screen appears. After the reward is chosen or skipped, existing next encounter confirmation appears. For final boss, after reward choice/skip the existing expedition-complete screen appears.
- Use CSS reduced-motion handling so the heading remains clear with animation disabled. No change to menu pause or reward skip behavior.

## Acceptance Criteria

- [ ] Every normal and boss win displays the same confirmable `승리` screen before reward choices.
- [ ] Confirm opens existing reward UI; reward selection or skip leads to existing next-encounter confirmation.
- [ ] Final boss sequence is victory screen → existing reward UI → expedition completion.
- [ ] Refresh/server restoration while acknowledgement is pending keeps the victory screen first.

## Validation

- `npm.cmd test --workspace @board-game/game-core -- src/engine.test.ts` — acknowledgement preconditions and run-state transitions pass.
- `npm.cmd test --workspace @board-game/api -- src/routes/runRoutes.test.ts` — new and legacy state schema cases pass.
- `npm.cmd test --workspace @board-game/web -- src/components/VictoryScreen.test.tsx src/App.outcome.test.tsx src/components/RewardScreen.test.tsx` — flow and unchanged reward behavior pass.
- `npm.cmd run build` — game core, API, and web compile together.

## Commit Message

```text
feat(ui): add victory confirmation before rewards

Plan: 2026-10-22-enemy-card-ai-victory-flow
Phase: P01-enemy-combat-and-victory-ui
Task: T04-victory-confirmation-flow

- Persist pending battle victory acknowledgement
- Show a victory screen before the current reward choices
- Preserve next-encounter and final-run progression
```

## Progress

- [ ] 구현 완료
- [ ] 검증 통과
- commit: pending

