# Plan: 로컬 브라우저 데모 모드

## Goal
Azure Entra ID나 Cosmos DB 자격 증명 없이 개발자가 `npm run dev`를 실행해 카드 게임을 로컬 브라우저에서 시험하게 한다. 인증·저장 설정이 모두 비어 있으면 프런트엔드 전용 데모를 실행하고, 일부만 설정된 경우에는 구성 오류를 보여준다. 데모 진행은 새로고침 시 사라지며 화면에 저장되지 않는 모드임을 표시한다. 운영 `npm start`와 Azure 배포에는 인증 우회 경로를 넣지 않는다.

## Phases
| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `done` | 개발 모드를 판별하고 브라우저 전용 데모 흐름과 실행 안내를 추가한다. | [P01](../phases/2026-10-22-local-browser-demo/P01-local-demo-mode/phase.md) |

## Architecture

- 루트 `npm run dev`는 Node.js launcher를 통해 `.env.local`과 `.env`를 읽고 아래 6개 통합 설정을 판별한다: `ENTRA_TENANT_ID`, `ENTRA_API_AUDIENCE`, `VITE_ENTRA_TENANT_ID`, `VITE_ENTRA_CLIENT_ID`, `VITE_ENTRA_API_SCOPE`, `COSMOS_ENDPOINT`.
- 6개 모두 비어 있으면 API 프로세스를 시작하지 않고 `VITE_DEMO_MODE=true`로 Vite만 실행한다. 일부만 채워져 있으면 누락된 key를 출력하고 종료한다. 모두 채워진 경우 현재의 API+웹 개발 프로세스를 실행한다.
- 웹 진입점은 `import.meta.env.DEV && import.meta.env.VITE_DEMO_MODE === "true"`일 때만 MSAL을 건너뛰고 데모 앱을 연다. 게임 규칙은 기존 `packages/game-core`를 사용한다.
- 데모 동기화 어댑터는 네트워크 요청 없이 React 메모리 상태에서 새 원정만 생성한다. `sessionStorage`, `localStorage`, API, Cosmos DB에 진행 상태를 기록하지 않으므로 새로고침하면 초기화된다.
- `npm start`는 현재 API 서버 시작 경로를 유지하고 데모 모드를 선택하지 않는다. Vite production build에서는 `import.meta.env.DEV`가 false이므로 데모 분기를 사용할 수 없다.

## Phases

- P01: 실행 환경 분기, 데모 게임 세션, README 안내를 함께 완성한다.
