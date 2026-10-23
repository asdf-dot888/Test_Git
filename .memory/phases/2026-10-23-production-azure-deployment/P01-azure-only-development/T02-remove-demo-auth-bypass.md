# Task: T02 웹 앱 데모 인증 우회 제거

## Status: done

## Goal

Vite 개발 데모 플래그를 웹 bootstrap에서 제거해 개발·운영 모두 같은 MSAL `RequireAuth`와 서버 저장 `App` 경로를 사용하게 한다. 메모리 전용 데모 어댑터와 데모 안내 UI는 삭제한다.

## Decision Summary

- 단일 Entra 테넌트와 API delegated scope를 사용하는 기존 `readAuthConfig`/MSAL 인증을 유지한다.
- 인증 전용 `DemoApp` 분기 및 데모용 `RunSyncController` 구현을 더 이상 제공하지 않는다.

## Implementation

### I01. Bootstrap 인증 단일화 및 데모 전용 코드 정리

- Related Files:
  - `apps/web/src/main.tsx` :: root bootstrap, `readAuthConfig`, MSAL initialization; modify
  - `apps/web/src/vite-env.d.ts` :: `ImportMetaEnv`; modify
  - `apps/web/src/DemoApp.tsx` :: `DemoApp`; delete
  - `apps/web/src/game/useDemoRunSync.ts` :: `useDemoRunSync`; delete
  - `apps/web/src/game/useDemoRunSync.test.ts` :: demo sync adapter tests; delete
  - `apps/web/src/components/LocalDemoNotice.tsx` :: `LocalDemoNotice`; delete
  - `apps/web/src/components/LocalDemoNotice.test.tsx` :: demo notice tests; delete
  - `apps/web/src/styles/board.css` :: `.local-demo-root`, `.local-demo-notice`; modify

#### Details

- `main.tsx`는 개발 여부와 무관하게 `readAuthConfig()`를 실행한다. 설정 누락이면 기존 `AuthConfigurationPage`, 완전한 설정이면 MSAL 초기화 후 `AuthProvider` → `RequireAuth` → `App`을 렌더링한다.
- `DemoApp`, `useDemoRunSync`, `LocalDemoNotice` 및 그 전용 테스트 파일을 제거한다. `GameSessionView`는 `App`의 내부 구현으로 유지하고 새 인증 우회/메모리 저장 경로를 만들지 않는다.
- `vite-env.d.ts`에서 `VITE_DEMO_MODE` 타입을 제거한다. 다른 `VITE_ENTRA_*` 변수 타입은 유지한다.
- `board.css`에서 `.local-demo-root` 및 `.local-demo-notice` 규칙만 삭제한다. 일반 메뉴/보드 스타일에는 변경을 가하지 않는다.
- 저장소 코드에서 `VITE_DEMO_MODE`, `DemoApp`, `useDemoRunSync`, `LocalDemoNotice`, `local-demo-root`, `local-demo-notice`가 참조되지 않아야 한다.

## Acceptance Criteria

- [x] 개발 환경에서도 구성값 누락 화면 또는 Entra 로그인 화면 뒤에만 게임 `App`이 표시된다.
- [x] 데모용 메모리 sync adapter, 배너, 진입 플래그가 제거된다.
- [x] API/Cosmos 동기화는 기존 `useRunSync` 흐름을 유지한다.

## Validation

- `npm test --workspace @board-game/web` — 웹 앱 전체 테스트 통과.
- `npm run build` — game-core, API, web production build 통과.
- `rg -n "VITE_DEMO_MODE|DemoApp|useDemoRunSync|LocalDemoNotice|local-demo-root|local-demo-notice" apps scripts` — 결과 없음.

## Commit Message

```text
fix(web): remove unauthenticated demo entry

Plan: 2026-10-23-production-azure-deployment
Phase: P01-azure-only-development
Task: T02-remove-demo-auth-bypass

- Always initialize the Entra authentication flow
- Remove the in-memory demo adapter and notice
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: recorded in Git history
