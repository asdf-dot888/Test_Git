# Task: T05 메뉴 선택과 오디오 설정

## Status: done

## Goal
전투 메뉴에서 `설정`, `메인 메뉴`, `돌아가기`를 선택하게 한다. 설정에서 배경음악/효과음 볼륨과 전체 음소거를 바꾸고 로컬 브라우저에 저장한다. 메인 메뉴 선택은 현재 진행 포기 확인을 거친 뒤 메인 메뉴 화면으로 이동시킨다.

## Decision Summary
- 설정 키: `board-game:audio-settings`; 값 `{ musicVolume: number, effectsVolume: number, muted: boolean }`, 볼륨 범위 0–1, 기본값 `{ musicVolume: 0.45, effectsVolume: 0.7, muted: false }`.
- 메인 메뉴 선택 후 확인은 `sync.deleteRun("abandoned")`를 수행하고 `clear-run`을 dispatch한다. 취소 시 현재 전투와 메뉴 선택 화면을 그대로 유지한다.
- `useRunSync`와 `useDemoRunSync`의 기존 `deleteRun` 계약을 공통 사용한다.

## Implementation

### I01. 오디오 설정 로컬 저장 로직
- Related Files:
  - `apps/web/src/game/audioSettings.ts` :: `DEFAULT_AUDIO_SETTINGS`, `loadAudioSettings`, `saveAudioSettings` — 신규 저장 모듈
  - `apps/web/src/game/audioSettings.test.ts` :: 저장/읽기 테스트 — 신규
  - `apps/web/src/game/audio.ts` :: `AudioSettings` — T04 정의 타입 사용, 중복 정의 금지

#### Details
- **Signatures & Schema**:
  ```typescript
  export const DEFAULT_AUDIO_SETTINGS: AudioSettings;
  export function loadAudioSettings(storage?: Pick<Storage, "getItem">): AudioSettings;
  export function saveAudioSettings(settings: AudioSettings, storage?: Pick<Storage, "setItem">): void;
  ```
  - Storage key `board-game:audio-settings`.
  - JSON fields `musicVolume` (number 0–1), `effectsVolume` (number 0–1), `muted` (boolean).
- **Execution Flow / Logic**:
  1. 실제 Storage 인자가 생략되면 browser `window.localStorage`를 사용하되 SSR/test에서 `window`가 없는 경우 기본값을 반환한다.
  2. 저장 데이터 JSON parse가 실패하거나 일부 필드의 타입/범위가 잘못되면 잘못된 필드만 기본값으로 보정한다. Storage read/write 예외는 앱 시작/조작을 중단시키지 않는다.
  3. load/save 둘 다 볼륨을 0–1로 clamp한다. `muted`는 boolean 외 값이면 기본값을 사용한다.
  4. React state 갱신 후 `saveAudioSettings`를 호출하고 `AudioController.setSettings`에도 같은 유효 객체를 전달한다.
- **Tests**: 사용자 지정 값 저장 후 재로드, key, 경계값 clamp, JSON 오류, 필드 누락/잘못된 타입, localStorage 접근 예외, 주입 storage 사용 검증.

### I02. 메뉴 팝업과 설정 화면
- Related Files:
  - `apps/web/src/components/GameMenu.tsx` :: `GameMenu` — 신규 선택 목록/설정 뷰
  - `apps/web/src/components/GameMenu.test.tsx` :: 선택·접근성 테스트 — 신규
  - `apps/web/src/styles/board.css` :: `.game-menu-*`, `.audio-settings-*` — 반응형 오버레이·슬라이더 스타일
  - `apps/web/src/components/GameBoard.tsx` :: `GameBoardProps.onMenu`, 메뉴 버튼 — 기존 콜백 유지

#### Details
- **Signatures & Types**:
  ```typescript
  interface GameMenuProps {
    view: "choices" | "settings";
    settings: AudioSettings;
    onSettingsChange(settings: AudioSettings): void;
    onOpenSettings(): void;
    onMainMenu(): void;
    onReturn(): void;
  }
  export function GameMenu(props: GameMenuProps): ReactElement;
  ```
- **Execution Flow / Logic**:
  1. 메뉴 버튼을 누르면 게임 위 `role="dialog"`, `aria-modal="true"` 오버레이를 연다. `choices` 뷰에는 `설정`, `메인 메뉴`, `돌아가기` 세 선택만 표시한다.
  2. `설정`을 누르면 동일한 오버레이가 `settings` 뷰로 바뀐다. 배경음악과 효과음 각각 `input[type="range"]` (min 0, max 1, step 0.01)와 전체 음소거 checkbox/button을 제공한다.
  3. 설정 화면의 뒤로 버튼은 선택 목록으로, 선택 목록의 돌아가기는 현재 전투로 복귀한다.
  4. 메인 메뉴는 별도 callback을 호출한다. 포기 확인은 `AbandonRunDialog`로 표시하고 이 컴포넌트 안에서 서버 요청을 직접 하지 않는다.
  5. 게임 메뉴/설정 닫기와 포커스 가능한 controls는 키보드와 스크린 리더에서 쓸 수 있게 라벨을 제공한다. 카드 공격이 선택된 상태에서 메뉴를 열어도 상태를 변형하지 않는다.

### I03. 메뉴 내비게이션·진행 포기 서버 동기화
- Related Files:
  - `apps/web/src/App.tsx` :: `GameSessionView`, `startNewServerRun`, `beginRun` — 메뉴 뷰/확인 callback, 서버 진행 삭제 후 메인 메뉴로 이동
  - `apps/web/src/game/useRunSync.ts` :: `RunSyncController.deleteRun` — 기존 메서드 사용; 필요하면 성공 후 run이 null 상태인지 보장
  - `apps/web/src/game/useDemoRunSync.ts` :: `deleteRun` — local demo에서 no-op 후 상태 전이 허용
  - `apps/web/src/App.test.tsx` 또는 `apps/web/src/App.menu.test.tsx` :: 메뉴/포기 확인 통합 테스트

#### Details
- **State Schema**:
  - `GameSessionView` local state: `menuView: "closed" | "choices" | "settings"`, `abandonToMenuOpen: boolean`.
  - `session.run`은 기존 `RunState | null`; 새로운 게임 상태 필드를 저장하지 않는다.
- **Execution Flow / Logic**:
  1. `GameBoard.onMenu`는 `setMenuView("choices")`만 수행한다. 더는 즉시 `setScreen("menu")`하지 않는다.
  2. 설정/돌아가기 callback은 각각 `menuView = "settings"`와 `menuView = "closed"`를 적용한다.
  3. 메인 메뉴 callback은 `abandonToMenuOpen = true`를 설정한다. 확인 dialog의 취소는 dialog를 닫고 메뉴 선택 화면을 유지한다.
  4. 확인은 busy 상태로 바꾸고 `await sync.deleteRun("abandoned")` 실행 후 `dispatch({ type: "clear-run" })`, `setAbandonToMenuOpen(false)`, `setMenuView("closed")`, `setScreen("menu")` 순서로 진행한다. 실패 시 run은 지우지 않고 에러 상태를 기존 sync 오류 처리에 맡겨 사용자가 재시도할 수 있게 한다.
  5. 이후 MainMenu의 새 게임 버튼은 `run === null`과 `sync.etag === null`이므로 기존 `createRun` 경로를 호출한다. 전투 메뉴를 여는 동안 run/server state는 보존한다.
  6. 화면이 MainMenu, 전투, 보상, 결과로 바뀔 때 audio controller의 `playMusic`은 현재 적 종류에 맞는 곡을 유지한다. 첫 사용자 입력 handler에서 `unlock()`도 실행한다.
  7. settings state는 로딩 시 `loadAudioSettings`, 설정 변경 때 `saveAudioSettings`와 `audio.setSettings` 양쪽에 적용한다.
- **Tests**:
  - 메뉴 버튼을 누르면 세 선택이 표시된다.
  - 설정에서 두 볼륨 입력과 음소거가 올바른 초기값/aria 라벨로 표시되고 조작 후 콜백에 변경 값이 전달된다.
  - 메인 메뉴 선택은 확인 전 delete API를 부르지 않는다.
  - 취소는 delete API를 부르지 않고 전투/메뉴를 유지한다.
  - 확인은 `deleteRun("abandoned")` 성공 후에만 run을 비우고 메인 메뉴 화면으로 이동한다.
  - delete 실패 시 run과 메뉴를 보존하고 busy가 해제된다.
  - 볼륨 설정은 새 controller mount에서도 localStorage에서 복원되고 게임 화면 전환에도 유지된다.

## Acceptance Criteria
- [x] 전투 메뉴에서 설정·메인 메뉴·돌아가기를 선택할 수 있고, 설정에서 볼륨 2종과 전체 음소거를 쓸 수 있다.
- [x] 볼륨과 음소거가 새로고침/재방문에도 browser localStorage에서 복원된다.
- [x] 진행 포기 확인을 취소하면 현재 전투가 보존되고, 확인해야만 서버 run 삭제 및 메인 메뉴 이동이 이뤄진다.
- [x] 메뉴에서 새 게임을 별도로 시작하고, Local Demo와 Azure 로그인 게임 양쪽에서 동작한다.
- [x] `GameBoard` 안의 기존 `onMenu` 테스트와 키보드/모달 접근성이 유지된다.

## Validation
- `npm run test --workspace @board-game/web -- src/game/audioSettings.test.ts src/components/GameMenu.test.tsx src/App.menu.test.tsx` — 설정 저장·메뉴·진행 삭제 테스트 통과
- `npm run build --workspace @board-game/web` — 타입 검사와 Vite 빌드 통과
- `npm run lint --workspace @board-game/web` — 웹 린트 통과
- 수동 브라우저 확인: Local Demo와 인증 모드 각각에서 메뉴→설정→뒤로, 볼륨/음소거 조작, 메뉴 복귀, 진행 포기 취소/확인, 새 게임 시작을 확인한다.

## Commit Message
```text
feat(ui): add audio settings and in-game menu flow

Plan: 2026-10-22-audio-visual-combat-polish
Phase: P01-combat-presentation-and-settings
Task: T05-menu-and-audio-settings

- Persist separate music and sound effect preferences locally
- Add settings, abandon-to-menu, and return choices during combat
```

## Progress
- [x] 구현 완료
- [x] 자동 검증 통과
- 수동 브라우저 검증: 실행하지 못함 (Edge headless screenshot launch returned without a screenshot).
- commit: feat(ui): add audio settings and in-game menu flow
