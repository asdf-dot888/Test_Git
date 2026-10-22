# Task: T02 Azure 설정과 운영 문서

## Status: done

## Goal
사내 Azure 운영자가 기존 App Service와 Cosmos DB를 설정하고, 개발자가 Entra 로컬 로그인·로컬 실행·배포 후 smoke check를 재현할 수 있는 문서를 제공한다.

## Decision Summary
- 문서만 추가하며 실제 회사 리소스, app registration, secret, DNS, 배포를 생성/변경하지 않는다.
- App Service Authentication에서 사내 단일 테넌트를 허용하고 익명 요청을 거부한다. API는 별도로 access token을 검증하며 Cosmos는 Managed Identity로 접근한다.

## Implementation

### I01. 개발 및 Azure 운영 안내
- Related Files:
  - `README.md` :: project overview/run instructions — starter README 교체; modify
  - `docs/azure-setup.md` :: app registration, App Service, Cosmos setup — new
  - `.env.example` :: documented variable names — modify if needed
  - `docs/troubleshooting.md` :: auth/Cosmos/save error guide — new

#### Details
- `README.md`에는 Node.js 24 LTS/npm prerequisite, `npm install`, `.env` 복사, `npm run dev`, `npm test`, `npm run build` 명령을 기록한다. Tenant/client/resource 값은 사용자가 회사 관리자에게 받아 채운다.
- `docs/azure-setup.md`에 다음 항목을 순서대로 적는다:
  1. Single-tenant Entra application registration: SPA redirect URI, exposed API scope, allowed tenant ID, client ID/audience.
  2. Azure App Service Authentication: Entra provider, single-tenant issuer, unauthenticated requests require authentication, redirect URI 확인.
  3. App Service app settings: `ENTRA_TENANT_ID`, `ENTRA_API_AUDIENCE`, `VITE_ENTRA_TENANT_ID`, `VITE_ENTRA_CLIENT_ID`, `VITE_ENTRA_API_SCOPE`, `COSMOS_ENDPOINT`, `COSMOS_DATABASE=card-roguelike`, `COSMOS_CONTAINER=active-runs`, `PORT`는 플랫폼 할당값을 사용.
  4. App Service Managed Identity 활성화 및 `active-runs` container에 최소 Cosmos data-plane contributor 권한 부여.
  5. Container partition key `/userId` 확인. 문서 ID는 `active-run`.
  6. `npm ci`, `npm run build`, App Service deploy package upload 절차. 회사 표준 pipeline이 있으면 같은 산출물 경로를 사용.
  7. `/api/health`, 로그인 redirect, API 401/403, 첫 런 저장/새로고침 이어하기, 두 번째 세션 423, 15분 유휴 후 takeover를 검증하는 smoke checklist.
- No credential is committed. `.env.example` contains names and dummy examples only; docs state to use App Service settings/Key Vault for secrets if company policy requires them.
- Troubleshooting maps MSAL `interaction_required`, token audience/tenant mismatch, Easy Auth 401, Cosmos 403/429, ETag conflict 409, active lease 423, and schema version mismatch to the exact settings/logs to inspect. Do not advise logging access tokens.

## Acceptance Criteria
- [ ] A new developer can find prerequisites, configure local auth settings and run the application.
- [ ] Azure operator can configure existing resources without undocumented secret values.
- [ ] Setup explains that actual deployment needs company Tenant ID, app registration and resource permissions.
- [ ] No live keys, tokens, client secrets, internal endpoint values, or user data are added.

## Validation
- Manual review of every command and variable name against `package.json`, `.env.example`, and `AppConfig`.
- `npm run build` — docs-only change leaves production build successful.
- `npm test` — complete planned workspace suite passes.

## Commit Message
```text
docs(azure): document Entra, Cosmos, and App Service setup

Plan: 2026-10-21-board-card-roguelike
Phase: P04-app-service-release
Task: T02-azure-operations-docs

- Document local development and tenant configuration
- Add App Service, managed identity, and smoke-check runbook
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: pending
