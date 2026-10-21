# Task: T01 사내 Entra ID 로그인

## Status: pending

## Goal
사내 단일 Entra ID 테넌트 사용자만 React 게임과 API를 사용할 수 있도록 MSAL 로그인, API bearer token 검증, Azure App Service Authentication 설정 계약을 구현한다.

## Decision Summary
- 브라우저는 `@azure/msal-browser`를 사용하고 API는 `jose`로 access token 서명·issuer·audience·tenant를 검증한다. Azure App Service Authentication도 익명 접근 차단용으로 설정한다.
- Tenant ID, SPA client ID, API audience/scope는 환경 변수에서 읽는다. 코드/`.env.example`에 실값이나 client secret을 넣지 않는다.

## Implementation

### I01. React MSAL 로그인
- Related Files:
  - `apps/web/src/auth/authConfig.ts` :: `msalConfig`, `loginRequest`, `apiRequest` — MSAL config; new
  - `apps/web/src/auth/AuthProvider.tsx` :: `AuthProvider`, `useAuth` — account/token context; new
  - `apps/web/src/auth/RequireAuth.tsx` :: `RequireAuth` — 로그인 전 게임 차단; new
  - `apps/web/src/main.tsx` :: `MsalProvider` wrapping — provider root; modify
  - `apps/web/src/vite-env.d.ts` :: `ImportMetaEnv` — env types; modify
  - `apps/web/src/auth/AuthProvider.test.tsx` :: auth states; new

#### Details
- **Signatures & Types**:
  ```typescript
  export interface AuthConfig { tenantId: string; clientId: string; apiScope: string; redirectUri: string; }
  export interface AuthContextValue {
    isAuthenticated: boolean; isLoading: boolean; displayName: string | null;
    signIn(): Promise<void>; signOut(): Promise<void>; getApiToken(): Promise<string>;
  }
  export function AuthProvider(props: React.PropsWithChildren): JSX.Element;
  export function useAuth(): AuthContextValue;
  export function RequireAuth(props: React.PropsWithChildren): JSX.Element;
  ```
- Read `VITE_ENTRA_TENANT_ID`, `VITE_ENTRA_CLIENT_ID`, `VITE_ENTRA_API_SCOPE`; fail with configuration page in local/development if missing, not a blank crash.
- Use single-tenant authority `https://login.microsoftonline.com/{tenantId}`; acquire API access token for configured scope with silent acquisition first and redirect interaction only when required.
- Redirect unauthenticated visitors to Entra sign-in. Keep account identity in MSAL cache; do not store API refresh/access tokens in app-managed localStorage.
- `getApiToken()` returns a valid token or throws `AuthRequiredError`; every API request uses `Authorization: Bearer <token>`.

### I02. Express Entra token middleware
- Related Files:
  - `apps/api/src/config/env.ts` :: `loadConfig`, `AppConfig` — required env validation; new
  - `apps/api/src/auth/entraAuth.ts` :: `createEntraAuth`, `AuthenticatedRequest` — JWT verification middleware; new
  - `apps/api/src/app.ts` :: auth on `/api/*`, public health only — route protection; modify
  - `apps/api/src/auth/entraAuth.test.ts` :: JWT validation tests; new
- **Data & Schema Fields**:
  - `AppConfig`: `entraTenantId:string`, `entraApiAudience:string`, `cosmosEndpoint:string`, `cosmosDatabase:string`, `cosmosContainer:string`, `port:number`.
  - Authenticated principal: `{ userId:string; tenantId:string; displayName?:string }`; `userId` derives from verified `oid`, never from request body.
- Verify signature against tenant OpenID JWKS, issuer tenant, audience `ENTRA_API_AUDIENCE`, expiry/not-before, and `tid===ENTRA_TENANT_ID`. Reject missing/malformed/invalid token with 401, wrong tenant or audience with 403. Never accept client-provided identity header in local mode.
- `GET /api/health` remains public and contains no user or DB data; all `/api/run*` endpoints require auth.
- Azure Easy Auth provides host-level redirect/block for the deployed app. Express token verification remains mandatory on APIs to bind Cosmos operations to a verified `oid` in both local and production paths.

## Acceptance Criteria
- [ ] No API game route accepts anonymous requests.
- [ ] Valid token from configured tenant yields `req.authUser.userId` from `oid`.
- [ ] Wrong tenant, audience, issuer, expired token, and missing token fail closed.
- [ ] Frontend redirects to company tenant and can get an API access token.

## Validation
- `npm run test --workspace @board-game/api` — valid/invalid token middleware cases pass with mocked remote key set.
- `npm run test --workspace @board-game/web` — signed-in, signed-out, config-missing, and token-required states pass.
- `npm run build` — all workspaces compile with strict TypeScript.

## Commit Message
```text
feat(auth): restrict the game to company Entra accounts

Plan: 2026-10-21-board-card-roguelike
Phase: P03-cloud-auth-save
Task: T01-entra-auth

- Add MSAL sign-in and API token acquisition
- Validate tenant, audience, issuer, and token lifetime in Express
```

## Progress
- [ ] 구현 완료
- [ ] 검증 통과
- commit: pending
