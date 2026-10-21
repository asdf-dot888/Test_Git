# Task: T01 npm workspace 구성

## Status: done

## Goal
애플리케이션이 없는 프로젝트 루트에 웹, API, 공유 게임 엔진을 분리한 실행 가능한 TypeScript workspace를 구성해 후속 Task가 일관된 빌드·테스트 명령을 사용하게 한다.

## Decision Summary
- Node.js 24 LTS, npm workspaces, React + Vite, Express + TypeScript, Vitest를 사용한다. 기존 Azure App Service를 대상으로 하며 런타임 패키지는 `apps/web`, `apps/api`, `packages/game-core`에 둔다.
- 기존 `.agents`, `.memory`, `examples`, 스타터 문서는 수정하거나 삭제하지 않는다. 이 Task는 애플리케이션 skeleton과 설정만 추가한다.

## Implementation

### I01. Root workspace와 공통 TypeScript 설정
- Related Files:
  - `package.json` :: root package manifest — workspace와 공통 스크립트; new
  - `package-lock.json` :: dependency lock — 설치된 버전 고정; generated
  - `tsconfig.base.json` :: 공통 compiler options — 엄격한 TS 기준; new
  - `.gitignore` :: 생성물 제외 — node_modules, dist, env 제외; new
  - `.env.example` :: 로컬 설정 템플릿 — 비밀이 아닌 설정 이름만 선언; new

#### Details
- **Root package fields**: `name="board-card-roguelike"`, `private=true`, `engines.node=">=24 <25"`, `workspaces=["apps/web","apps/api","packages/game-core"]`.
- **Root scripts**: `dev`는 `concurrently`로 API와 web dev server를 병렬 실행, `build`는 game-core → api와 web 순으로 빌드, `test`는 전체 Vitest suite, `lint`는 전체 ESLint, `start`는 `apps/api/dist/index.js` 실행. `eslint.config.js`도 strict TypeScript/React 규칙으로 만든다.
- **Compiler options**: `strict=true`, `noUncheckedIndexedAccess=true`, `exactOptionalPropertyTypes=true`, `forceConsistentCasingInFileNames=true`, `skipLibCheck=true`. 각 workspace가 `tsconfig.json`에서 이 파일을 extends한다.
- **`.gitignore`**: `node_modules/`, `dist/`, `coverage/`, `.env`, `.env.*`; 단 `.env.example`은 추적한다.
- **`.env.example`**에는 `ENTRA_TENANT_ID`, `ENTRA_CLIENT_ID`, `ENTRA_API_AUDIENCE`, `VITE_ENTRA_TENANT_ID`, `VITE_ENTRA_CLIENT_ID`, `VITE_ENTRA_API_SCOPE`, `COSMOS_ENDPOINT`, `COSMOS_DATABASE`, `COSMOS_CONTAINER`, `PORT`를 빈 값 또는 로컬 기본 포트로 둔다. 실제 ID, secret, key를 넣지 않는다.
- **Execution Flow / Logic**:
  1. 패키지 디렉터리 3개와 각 `src/` 폴더를 만든다.
  2. workspace package 이름은 `@board-game/web`, `@board-game/api`, `@board-game/game-core`로 고정한다.
  3. React, Vite, Express, TypeScript, Vitest, ESLint의 stable package를 추가하고 lockfile을 생성한다.
  4. 각 패키지에 최소 entrypoint를 두고 `npm run build`가 세 workspace를 모두 통과하게 한다.

### I02. Web/API/engine package entrypoints
- Related Files:
  - `apps/web/package.json` :: `@board-game/web` — Vite 개발·빌드 스크립트; new
  - `apps/web/index.html` :: `#root` — SPA HTML entry; new
  - `apps/web/src/main.tsx` :: `createRoot` — React mount; new
  - `apps/api/package.json` :: `@board-game/api` — Express dev·build·test; new
  - `apps/api/src/index.ts` :: `createApp()` — Express health endpoint skeleton; new
  - `packages/game-core/package.json` :: `@board-game/game-core` — shared ESM package metadata; new
  - `packages/game-core/src/index.ts` :: public barrel — 후속 게임 규칙 export; new

#### Details
- **Signatures & Types**:
  ```typescript
  // apps/api/src/app.ts (create in this task)
  export function createApp(): import("express").Express;
  // apps/api/src/index.ts
  export function startServer(port?: number): import("node:http").Server;
  ```
- `createApp()`는 JSON parser와 `GET /api/health` (`{ status: "ok" }`)만 설치한다. 인증·게임 라우트는 후속 Task에서 추가한다.
- `apps/web/src/main.tsx`는 `#root`에 `<App />`을 mount하고, `App.tsx`는 임시 heading만 표시한다.
- `packages/game-core`는 ESM, `dist/index.js`와 `dist/index.d.ts` export를 제공한다. API/web은 workspace dependency로 참조한다.
- **Execution Flow / Logic**:
  1. API와 web Vite 설정을 생성한다. Vite dev server는 후속 UI Task에서 `/api` proxy target을 API로 설정할 수 있게 `server.proxy` 위치를 남긴다.
  2. API에는 `GET /api/health`를 구현한다. 응답 상태 200, JSON content-type, body `{status:"ok"}`.
  3. 빌드 순서에서 game-core 패키지를 먼저 컴파일한다.

## Acceptance Criteria
- [x] `npm install`로 workspace lockfile을 만들 수 있다.
- [x] `npm run build`, `npm test`, `npm run lint`가 루트에서 실행된다.
- [x] `/api/health` skeleton과 React root skeleton이 존재한다.
- [x] 실제 Entra/Cosmos credential이나 구현 코드가 커밋되지 않는다.

## Validation
- `npm install` — workspace dependencies와 lockfile 생성.
- `npm run build` — 세 workspace의 TypeScript/Vite 빌드 성공.
- `npm test` — 아직 테스트가 없어도 성공하는 Vitest 설정과 최소 health test 통과.
- `npm run lint` — 초기 skeleton lint 통과.

## Commit Message
```text
chore(scaffold): create React and API workspaces

Plan: 2026-10-21-board-card-roguelike
Phase: P01-game-core
Task: T01-workspace-scaffold

- Add npm workspaces for web, API, and shared game core
- Add TypeScript, Vite, Express, and validation scripts
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: pending
