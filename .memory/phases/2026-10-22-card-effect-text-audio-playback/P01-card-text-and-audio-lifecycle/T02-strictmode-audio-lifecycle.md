# Task: T02 StrictMode 오디오 재생

## Status: done

## Goal
로컬 데모와 Entra 인증 앱의 개발 모드에서 React `StrictMode`가 effect를 다시 설정해도 음악과 효과음이 폐기된 컨트롤러에 묶이지 않고 재생되도록 한다.

## Decision Summary
- 앱의 `<StrictMode>`와 브라우저 첫 입력 오디오 활성화는 유지한다.
- 현재 `GameSessionView`는 render 중 state initializer로 오디오 컨트롤러를 만들고 effect cleanup에서 영구 폐기한다. 개발 `StrictMode`의 setup→cleanup→setup 재실행과 충돌한다.
- 컨트롤러 생성/정리를 effect 수명 주기에 맞춘다. effect를 다시 설정할 때 매번 새 컨트롤러 인스턴스를 만들고, 각 인스턴스 cleanup은 자신이 만든 컨트롤러만 폐기한다.

## Implementation

### I01. React effect와 오디오 컨트롤러 수명 주기 정렬
- Related Files:
  - `apps/web/src/App.tsx` :: `GameSessionView` — `AudioController` import, nullable state, 컨트롤러 생성, 음악·효과음 호출, 설정 적용, unlock 리스너; modify
  - `apps/web/src/game/audio.ts` :: `AudioController`, `createAudioController` — 오디오 동작 계약과 `dispose`; read-only unless lifecycle helper is required
  - `apps/web/src/main.tsx` :: 개발/인증 루트의 `StrictMode`; read-only, 유지

#### Details
- **Signatures & Types**:
  ```typescript
  const [audioController, setAudioController] = useState<AudioController | null>(null);
  ```
- **Data & Schema Fields**:
  - 새 저장 상태나 서버 필드는 없다. 컨트롤러는 UI 로컬 객체이며 `AudioController`의 기존 메서드 계약을 쓴다.
- **Execution Flow / Logic**:
  1. render 중 `createAudioController()`를 호출하는 기존 `useState` initializer를 제거하고, `AudioController | null` state를 `null`로 시작한다.
  2. effect setup에서 `const controller = createAudioController()`를 만들고 `setAudioController(controller)`를 호출한다. cleanup은 같은 `controller.dispose()`만 호출한다.
  3. 오디오 설정 적용, `playMusic`, 전투 효과음 처리, 입력 unlock effect는 `audioController === null`이면 아무 작업도 하지 않고, 컨트롤러가 생기면 해당 인스턴스에 연결한다. 모든 effect dependency에 `audioController`를 포함한다.
  4. `pointerdown`과 `keydown` unlock listener를 활성 컨트롤러에 등록한다. effect cleanup에서 listener 둘 다 제거한다. 브라우저 gesture 안에서 기존 `unlock()`이 호출되도록 한다.
  5. `StrictMode` 재실행의 첫 인스턴스는 cleanup에서 정지/폐기되고 두 번째 setup이 생성한 인스턴스가 이후 render의 state가 된다. `dispose()`를 취소하거나 StrictMode를 제거하는 우회책은 쓰지 않는다.
  6. `AudioController`의 볼륨, 음소거, 음악 전환, 효과음 중첩 동작과 오디오 파일 URL은 변경하지 않는다.

### I02. StrictMode 통합 회귀 테스트
- Related Files:
  - `apps/web/src/App.audio.test.tsx` :: StrictMode 오디오 시작 검증 — 신규
  - `apps/web/src/App.tsx` :: `GameSessionView` — 렌더/입력 동작; read-only after I01

#### Details
- jsdom에서 `vi.stubGlobal("Audio", FakeAudio)`를 사용하고 fake player 인스턴스 목록, `play` 횟수, `paused`를 기록한다.
- `<StrictMode><GameSessionView sync={fakeReadySync} /></StrictMode>`로 렌더한다.
- 실제 사용자 입력에 해당하는 `pointerdown`을 dispatch한 뒤 최신 음악 player가 play를 시작했고 폐기된 이전 player가 재사용되지 않는지 확인한다.
- 활성 run의 전투 효과 이벤트가 발생하는 테스트 경로가 마련돼 있으면 `playEffect` 호출도 확인한다. 테스트 대상 selector는 기존 `GameBoard` API와 `combatEffects` dispatch 계약을 따른다.
- 테스트 종료 시 controller cleanup이 player를 멈추는지 확인해 StrictMode 수정이 실제 unmount cleanup을 제거하지 않았음을 검증한다.

## Acceptance Criteria
- [x] 개발 모드 StrictMode 아래 첫 사용자 입력 이후 배경 음악이 재생된다.
- [x] StrictMode 아래 전투 효과음 호출이 살아 있는 컨트롤러로 전달된다.
- [x] 일반/보스 음악 전환, 음량/음소거 설정, 실제 unmount cleanup이 유지된다.
- [x] `apps/web/src/main.tsx`의 StrictMode는 제거되지 않는다.

## Validation
- `npm.cmd run test --workspace @board-game/web -- src/App.audio.test.tsx src/game/audio.test.ts` — StrictMode 수명 주기 및 AudioController 기존 동작 통과
- `npm.cmd run build --workspace @board-game/web` — React state 타입과 웹 번들 통과
- `npm.cmd run lint --workspace @board-game/web` — 웹 린트 통과
- 수동 브라우저 확인: `VITE_DEMO_MODE=true`인 Local Demo에서 최초 클릭 후 BGM, 하수인 공격/주문 사용 후 SFX 확인. 인증 모드는 Entra 설정이 준비된 경우 같은 `GameSessionView` 경로를 확인한다.

## Commit Message
```text
fix(audio): keep playback active under React StrictMode

Plan: 2026-10-22-card-effect-text-audio-playback
Phase: P01-card-text-and-audio-lifecycle
Task: T02-strictmode-audio-lifecycle

- Create audio controllers in effect setup and dispose each instance safely
- Verify music unlock and sound effects with StrictMode integration coverage
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: pending
