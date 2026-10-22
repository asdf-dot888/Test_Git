# Task: T03 다음 전투 확인

## Status: done

## Goal
전투 보상을 선택하거나 건너뛴 뒤 다음 전투 여부를 묻는다. 첫 전투는 기존처럼 새 판 시작 즉시 열고, 사용자가 다음 전투를 거절하면 현재 진행을 보존한 채 메인 메뉴로 돌아가 이어할 수 있게 한다.

## Decision Summary
- 확인은 모든 전투 보상 처리 뒤 실행하며 마지막 보스 승리 뒤에는 표시하지 않는다.
- 확인 상태는 이미 저장되는 `RunState`의 `battle.status === "playerWon"`에서 유도한다. 확인 화면에서 메뉴로 이동하는 것은 run을 수정하지 않는다.
- 메뉴의 이어하기 동작은 저장된 같은 승리/확인 상태로 돌아간다. 새 게임 진행은 기존 AbandonRunDialog 절차를 그대로 따른다.

## Implementation

### I01. 승리 후 전투 확인 화면

- Related Files:
  - `apps/web/src/App.tsx` :: `GameSessionView`, `battle.status === "playerWon"` 분기; modify
  - `apps/web/src/components/EncounterContinueScreen.tsx` :: `EncounterContinueScreen`; new
  - `apps/web/src/components/RewardScreen.tsx` :: `RewardScreen`; read-only
  - `packages/game-core/src/types.ts` :: `RunState`, `EncounterState`; read-only

#### Details
- **Signatures & Types**:
  ```typescript
  interface EncounterContinueScreenProps {
    phase: 1 | 2 | 3;
    completedBattles: number;
    nextEncounter: EncounterState;
    disabled?: boolean;
    onContinue(): void;
    onReturnToMenu(): void;
  }
  ```
- **Execution Flow / Logic**:
  1. 기존 렌더 순서를 유지한다: `pendingReward`가 있으면 RewardScreen, run `victory/defeat`면 종료 화면, `battle.status === "playerWon"`면 새 확인 화면을 렌더한다.
  2. 이 순서상 첫 전투 시작 직후에는 승리 상태가 아니므로 확인 화면이 보이지 않는다. 보상 선택/건너뛰기 후에는 다음 전투 확인 화면이 보인다.
  3. `nextEncounter`는 `run.encounters`에서 `status === "pending"`인 첫 항목이다. 제목/설명에 다음 Phase 번호와 전투 종류(normal/boss)를 표시한다. 마지막 보스 후에는 core가 `run.status === "victory"`, `battle === null`로 설정하므로 기존 승리 종료 화면만 표시한다.
  4. “다음 전투” 버튼은 기존 `dispatch({ type: "continue-run" })` 경로를 실행한다. 기존 next seed 생성과 `advanceRun`은 변경하지 않는다.
  5. “메인 메뉴” 버튼은 `setScreen("menu")`만 실행하고 `dispatch`, `deleteRun`, `advanceRun`을 호출하지 않는다. 승리한 run 상태와 선택한 보상은 그대로 보존된다.
  6. MainMenu의 기존 `canContinue={run?.status === "active"}`와 `onContinue={() => setScreen("game")}`를 유지한다. 메뉴에서 이어하기 하면 run의 `battle.status === "playerWon"`가 재확인되어 동일한 확인 화면으로 돌아간다.
- **Edge Cases**:
  - `nextEncounter`가 없는 상태에서 run이 active/playerWon으로 잘못 전달되면 다음 버튼을 비활성화하고 기존 terminal 처리 경로를 유지한다. 정상 게임 core 상태에서는 이 조합이 생성되지 않는다.
  - 저장 요청 중에는 버튼을 비활성화한다(`sync.status !== "ready"`와 기존 화면에서 사용하던 ready gating 기준 사용). 로컬 데모의 ready 상태는 기존 동작대로 계속 사용 가능하다.

### I02. 확인 화면의 진행 문구와 스타일

- Related Files:
  - `apps/web/src/components/EncounterContinueScreen.tsx` :: content and buttons; new
  - `apps/web/src/styles/board.css` :: `.run-screen`, `.run-card`, `.outcome-stats`, button styles; modify

#### Details
- 화면에 “다음 전투에 진입할까요?”라는 질문, 다음 적의 종류(일반 전투/보스전), Phase 및 완료 전투 수를 한국어로 표시한다.
- 주요 버튼은 “다음 전투”, 보조 버튼은 “메인 메뉴”로 표시한다.
- 기존 어두운 판타지 화면의 `.run-screen`/`.run-card` 스타일과 버튼 색을 재사용해 일관성을 유지한다. 모바일에서 두 버튼은 세로로 쌓고 탭 영역 최소 44px을 확보한다.
- `role="dialog"` 또는 `main` 중 하나의 적절한 landmark를 사용하고, 버튼 이름은 화면 읽기 프로그램에서 구별 가능해야 한다.

### I03. 저장/이어하기 동작 검토

- Related Files:
  - `apps/web/src/App.tsx` :: run sync effect, menu branch, `GameSessionView`; read-only except I01
  - `apps/web/src/game/useDemoRunSync.ts` :: demo save behavior; read-only
  - `apps/web/src/game/useRunSync.ts` :: run persistence; read-only

#### Details
- 확인 화면 자체에서 run 객체를 변경하지 않아 자동 저장 데이터 구조를 바꾸지 않는다.
- 메뉴 복귀 뒤 이어하기는 현재 React 세션에서 동일 run을 유지한다. Azure 모드에서는 battle victory/run state가 이미 `saveRun`에 전달되는 기존 저장 흐름을 확인한다.
- 로컬 데모 새로고침 복원은 지원 범위가 아니며 localStorage/sessionStorage를 새로 추가하지 않는다.

## Acceptance Criteria
- [ ] 첫 전투는 판 시작 시 바로 열리고, 전투 보상 선택/건너뛰기 뒤 다음 전투 확인이 보인다.
- [ ] 다음 전투 선택은 기존 전투 시작과 보상/덱 진행을 유지한다.
- [ ] 메인 메뉴 선택은 run을 삭제하거나 변경하지 않고, 메뉴에서 이어하기를 누르면 같은 다음 전투 확인 화면으로 돌아온다.
- [ ] 확인 화면은 다음 일반/보스 종류와 phase를 표시하고, 3페이즈 보스 승리 후에는 표시되지 않는다.

## Validation
- `npm run build` — TypeScript 및 전체 프로덕션 빌드가 통과해야 한다.
- 브라우저 수동 확인: 첫 전투 즉시 진입, 일반전 승리 후 보상 선택/건너뛰기 양쪽, 메뉴 복귀 후 이어하기, 보스 뒤 일반전 전환, 마지막 보스 승리 화면을 확인한다.

## Commit Message
```text
feat(web): confirm before each next encounter

Plan: 2026-10-22-combat-effects-and-encounter-confirmation
Phase: P01-combat-flow
Task: T03-encounter-confirmation

- Ask before starting the next normal or boss encounter
- Preserve the active run when returning to the main menu
```

## Progress
- [x] Implementation complete
- [x] Validation passed (`npm.cmd run build`; local app and component HTTP responses returned 200)
- commit: pending
