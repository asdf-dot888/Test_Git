# Task: T01 단일 App Service production 실행

## Status: done

## Goal
웹 build와 API를 하나의 Node.js 24 LTS Azure App Service 프로세스로 패키징해 동일 origin의 React 화면과 인증된 `/api`를 제공한다.

## Decision Summary
- Azure App Service Linux의 Node 24 LTS를 사용한다. API가 Vite 산출물 `apps/web/dist`를 정적으로 제공하고 `/api/*` 라우트는 SPA fallback보다 우선한다.
- 기존 사내 Azure 리소스를 사용하며 이 Task에서 Azure 리소스를 생성하거나 배포하지 않는다.

## Implementation

### I01. Production web hosting과 health
- Related Files:
  - `apps/api/src/app.ts` :: static middleware/SPA fallback — web serving; modify
  - `apps/api/src/index.ts` :: `startServer` — `PORT` listener; modify
  - `package.json` :: `build`, `start` scripts — workspace build order; modify
  - `apps/api/src/app.test.ts` :: static/API route precedence — new
- **Execution Flow / Logic**:
  1. Root `npm run build` compiles game-core, API and Vite web assets.
  2. Express serves `apps/web/dist` with immutable caching for hashed assets and no-cache for `index.html`.
  3. `/api/*` requests never fall through to `index.html`; unknown API route returns JSON 404.
  4. non-API browser route falls back to `index.html` for SPA routing.
  5. `GET /api/health` remains public and returns only `{status:"ok"}`; it does not query Cosmos or expose settings.
  6. `startServer(port=Number(process.env.PORT ?? 8080))` listens on `0.0.0.0`.
- **Signatures & Types**:
  ```typescript
  export function createApp(options?: { webDistPath?: string }): import("express").Express;
  export function startServer(port?: number): import("node:http").Server;
  ```
- Graceful shutdown handles SIGTERM/SIGINT, closes HTTP server and Cosmos client; startup fails clearly if required production env configuration is absent.

## Acceptance Criteria
- [ ] `npm run build` generates both web and API artifacts.
- [ ] Production Express serves React at `/` and preserves `/api` JSON behavior.
- [ ] App listens on Azure-provided `PORT` and binds all interfaces.
- [ ] Health endpoint leaks no environment secrets or user data.

## Validation
- `npm run test --workspace @board-game/api` — static path, SPA fallback, health and API 404 tests pass.
- `npm run build` — production artifacts exist at documented paths.
- `npm start` with dummy nonsecret local settings — server binds configured port and `/api/health` returns 200.

## Commit Message
```text
feat(hosting): serve the React game from the API process

Plan: 2026-10-21-board-card-roguelike
Phase: P04-app-service-release
Task: T01-app-service-build

- Serve Vite assets and API from one Express origin
- Add App Service port, SPA fallback, and health behavior
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: pending
