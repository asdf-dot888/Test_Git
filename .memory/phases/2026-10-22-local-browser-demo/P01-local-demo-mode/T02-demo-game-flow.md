# Task: T02 브라우저 메모리 데모 게임 흐름

## Status: done

## Goal
데모 플래그로 진입하면 MSAL, 로그인, API 요청 없이 기존 게임 엔진과 보드 UI를 사용하게 하고, 원정 진행이 새로고침 후 복구되지 않음을 화면에 알린다.

## Decision Summary
- 데모 진입 조건은 `import.meta.env.DEV === true && import.meta.env.VITE_DEMO_MODE === "true"` 두 조건의 논리곱이다. production build 또는 flag만 있는 경우 기존 인증 흐름을 사용한다.
- 데모 모드 상태는 `useGameSession`의 React 메모리에만 존재한다. 데모 동기화 hook은 서버에서 불러오거나 저장하지 않는다.

## Implementation

### I01. 데모/인증 진입 분기
- Related Files:
  - `apps/web/src/main.tsx` :: `root` bootstrap — auth 설정 검사보다 먼저 개발 데모 분기; modify
  - `apps/web/src/vite-env.d.ts` :: `ImportMetaEnv.VITE_DEMO_MODE` — Vite flag 타입; modify
  - `apps/web/src/DemoApp.tsx` :: `DemoApp` — demo adapter와 공통 게임 화면 연결; new

#### Details
- **Signatures & Types**:
  ```typescript
  export function DemoApp(): ReactElement;
  ```
- `main.tsx`는 `readAuthConfig()` 호출 이전에 `import.meta.env.DEV && import.meta.env.VITE_DEMO_MODE === "true"`를 검사한다.
- 조건이 참일 때 `<StrictMode><GameErrorBoundary><DemoApp /></GameErrorBoundary></StrictMode>`를 root에 렌더한다. 이 분기에서는 MSAL package나 AuthProvider를 import하지 않는다.
- 조건이 거짓이면 기존 auth config error screen, MSAL 초기화, `AuthProvider`, `RequireAuth`, `App` 흐름을 그대로 실행한다.
- `vite-env.d.ts`에서 `VITE_DEMO_MODE?: string`로 선언한다.
- DemoApp은 데모 동기화 hook을 만들고 공통 게임 화면에 전달하며, 전체 화면에서 보이는 데모 안내 배너를 렌더한다.

### I02. 공통 게임 화면과 메모리 sync adapter
- Related Files:
  - `apps/web/src/App.tsx` :: `App`, `GameSessionView` — 실제 auth hook과 공통 게임 화면 분리; modify
  - `apps/web/src/game/useRunSync.ts` :: `RunSyncController` — Cloud sync 반환 API 타입 공개; modify
  - `apps/web/src/game/useDemoRunSync.ts` :: `useDemoRunSync` — 네트워크 없는 메모리 adapter; new
  - `apps/web/src/game/useDemoRunSync.test.ts` :: demo adapter 검증; new

#### Details
- `RunSyncController` 타입은 현재 `useRunSync()`가 반환하는 항목을 모두 포함한다: `RunSyncState` 필드(`status`, `etag`, `expiresAt`, `message`, `run`, `loaded`, `loadVersion`)와 `saveRun`, `createRun`, `replaceRun`, `deleteRun`, `reload`, `retrySave`, `retry` 메서드.
- 공통 화면은 `GameSessionView({sync}: {sync: RunSyncController})`로 분리한다. 실제 `App`은 기존 `useRunSync()`를 호출해 전달하고, `DemoApp`은 `useDemoRunSync()`를 호출해 전달한다. Auth context 없는 컴포넌트에서 `useRunSync()` 또는 `useAuth()`를 호출하지 않는다.
- `useDemoRunSync()`는 `status:"ready"`, `loaded:true`, `etag:null`, `expiresAt:null`, `message:null`, `run:null`, `loadVersion:0` 상태를 제공한다.
- `createRun(seed)`와 `replaceRun(_reason, seed)`는 `packages/game-core`의 `createRun(seed)` 결과를 Promise로 반환한다. 게임 session reducer가 그 결과를 React 상태에 넣는다.
- `saveRun`, `deleteRun`, `reload`, `retrySave`, `retry`는 성공 완료 Promise를 반환하며 `fetch`, `RunClient`, storage API를 사용하지 않는다. Demo sync는 run을 별도 상태에 보관하지 않는다. 따라서 화면 reload는 초기 메뉴에서 시작한다.
- Stable callback을 `useCallback`으로 만들고 sync 상태/메서드 모양은 실제 adapter와 일치시켜 `GameSessionView`가 모드 분기로 반복되지 않게 한다.
- 추가 테스트는 demo adapter의 초기 상태, `createRun`이 게임 초기 상태를 반환함, sync 메서드에서 `fetch`/storage가 호출되지 않음을 확인한다.

### I03. 데모 상태 배너
- Related Files:
  - `apps/web/src/components/LocalDemoNotice.tsx` :: 안내 배너; new
  - `apps/web/src/styles/board.css` :: `.local-demo-notice` — menu/board 레이어 위 안내 표시; modify
  - `apps/web/src/components/LocalDemoNotice.test.tsx` :: 문구와 접근성 역할 확인; new

#### Details
- 문구는 정확히 `로컬 데모 · 저장 안 됨`으로 표시하고 `<aside role="status" aria-label="데모 모드 안내">`를 사용한다.
- DemoApp 바깥 layout 상단에 배치해 메뉴, 전투, 보상, 승리/패배 화면에서 계속 보이게 한다. 실제 인증 App에서는 렌더되지 않는다.
- 작은 화면에서도 게임 조작을 가리지 않도록 배너 높이/여백을 제한하고 기존 반응형 규칙을 따른다.

## Acceptance Criteria
- [ ] 데모 flag와 dev mode일 때 Tenant 설정 화면이나 Entra 로그인 redirect 없이 게임 메뉴가 열린다.
- [ ] 새 원정, 카드 플레이, 턴 종료 등 기존 game-core 기반 화면 동작이 유지된다.
- [ ] 데모 플레이 중 `/api` fetch, local/session storage 쓰기가 발생하지 않는다.
- [ ] 페이지를 새로고침하면 초기 게임 메뉴로 돌아온다.
- [ ] 모든 데모 화면에서 `로컬 데모 · 저장 안 됨` 안내를 확인할 수 있다.
- [ ] 일반 `npm run dev` Azure 설정 경로와 production build는 데모 auth bypass를 사용하지 않는다.

## Validation
- `npm test -- apps/web/src/game/useDemoRunSync.test.ts apps/web/src/components/LocalDemoNotice.test.tsx apps/web/src/App.test.tsx` — 신규 adapter/UI와 기존 app 테스트 통과.
- `npm run build` — game-core/API/web production build 통과하며 데모 branch는 production에서 비활성.
- `npm run lint` — 타입/React lint 오류 없음.
- 수동 확인: T01에서 설정 없는 환경으로 실행, 브라우저 `http://localhost:5173` 열기, 원정 플레이, Network에서 `/api` 요청 없음 확인, 새로고침 뒤 메뉴로 초기화 확인.

## Commit Message
```text
feat(web): add in-memory local demo mode

Plan: 2026-10-22-local-browser-demo
Phase: P01-local-demo-mode
Task: T02-demo-game-flow

- Bypass MSAL only for the dev demo entry
- Use the existing game engine without persistence
- Show an unsaved demo notice on every screen
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: `ebbcc3c`
