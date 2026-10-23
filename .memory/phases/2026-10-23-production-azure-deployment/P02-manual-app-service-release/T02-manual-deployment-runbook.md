# Task: T02 App Service 수동 배포 runbook

## Status: done

## Goal

사내 IT/Azure 관리자가 필요한 리소스와 권한을 준비한 뒤, 개발자가 생성한 release ZIP을 Azure CLI로 Linux App Service에 수동 배포하고 정식 URL의 로그인·API·Cosmos 저장을 확인할 수 있도록 README와 Azure 운영 문서를 갱신한다.

## Decision Summary

- 배포 대상은 Node.js 24 Linux App Service이며 React SPA와 API는 같은 origin에서 제공한다.
- Azure 기본 `azurewebsites.net` 주소를 사용하고, GitHub Actions/자동 배포와 커스텀 도메인은 범위에서 제외한다.
- 앱은 실행 시 `npm start`; ZIP 업로드 전 App Service에는 Oryx build automation과 확정된 App settings가 있어야 한다.

## Implementation

### I01. 관리자 준비 목록 및 사용자 배포 절차

- Related Files:
  - `docs/azure-setup.md` :: administrator provisioning, app settings, managed identity, manual release, smoke checks; modify
  - `README.md` :: short release link and Azure-only run instructions; modify
  - `.env.example` :: variable names; read-only unless variable list differs from `AppConfig`

#### Details

- 사내 관리자 준비 목록: single-tenant SPA 및 API app registrations/API delegated scope, `http://localhost:5173` 및 Azure 기본 HTTPS origin redirect URI, Linux Node.js 24 App Service, Cosmos DB for NoSQL `card-roguelike/active-runs`, `/userId` partition key, App Service system-assigned managed identity의 최소 Cosmos data-plane 권한.
- App Service app settings 목록을 정확히 문서화한다: `ENTRA_TENANT_ID`, `ENTRA_API_AUDIENCE`, `VITE_ENTRA_TENANT_ID`, `VITE_ENTRA_CLIENT_ID`, `VITE_ENTRA_API_SCOPE`, `COSMOS_ENDPOINT`, `COSMOS_DATABASE=card-roguelike`, `COSMOS_CONTAINER=active-runs`, `SCM_DO_BUILD_DURING_DEPLOYMENT=true`; `PORT`는 플랫폼 할당값을 사용한다.
- 개발자에게 로컬 `.env`용 동일 여섯 연결값과 Azure CLI 로그인 권한, App Service 배포에 필요한 제한된 RBAC 역할을 관리자가 안전하게 전달하도록 안내한다. client secret, Cosmos key, access token은 요청하거나 ZIP에 넣지 않는다.
- PowerShell release 흐름을 문서화한다: `npm ci`, `npm test`, `npm run lint`, `npm run package:release`, `az login`, `az account set --subscription <subscription-id>`, `az webapp deploy --resource-group <resource-group> --name <app-name> --src-path artifacts/board-card-roguelike-release.zip --type zip`.
- ZIP이 저장소 루트 구조로 패키징되고 `.env`가 제외된다는 점, `VITE_ENTRA_*` 앱 식별 값은 Vite build 산출물에 포함될 수 있으므로 secret이 아니어야 한다는 점, 앱 설정이나 redirect URI가 바뀌면 다시 패키징/배포해야 한다는 점을 설명한다.
- Smoke check: `https://<app-name>.azurewebsites.net/api/health`에서 `{ "status": "ok" }`, 사내 Entra 로그인 성공, 새 원정 생성/진행, 새로고침 뒤 Cosmos에서 원정 복원, 보호 API의 인증 거부 동작을 확인한다. access token이나 run 사용자 데이터를 로그에 기록하지 않는다.
- `README.md`는 로컬 Azure 개발과 production build/package/deploy 전체 절차를 `docs/azure-setup.md`로 연결한다. CI/OIDC 지침과 인증 없는 demo 절차를 추가하지 않는다.

## Acceptance Criteria

- [x] IT 관리자와 개발자의 준비 항목 및 책임이 분리돼 있다.
- [x] 동일 origin, Node 24, Oryx build setting, Azure CLI 명령, 앱 설정 목록이 코드와 일치한다.
- [x] 배포 절차에 로그인·API·Cosmos 복원 smoke check가 있고 비밀값 노출 지침이 없다.
- [x] 리소스가 준비되기 전에는 실제 URL/배포가 완료됐다고 기술하지 않는다.

## Validation

- 문서 변수 목록을 `.env.example`, `apps/api/src/config/env.ts`, `apps/web/src/auth/authConfig.ts`와 대조한다.
- `npm run package:release` — 문서에 나온 ZIP 경로와 일치.
- `npm run build` — 문서 수정으로 build가 깨지지 않음.
- 수동 검토 — 실제 secret/tenant 값/endpoint/user data가 문서에 없음.

## Commit Message

```text
docs(azure): document manual production release

Plan: 2026-10-23-production-azure-deployment
Phase: P02-manual-app-service-release
Task: T02-manual-deployment-runbook

- Document administrator prerequisites and scoped deployment access
- Add the manual Azure CLI release and production smoke-check flow
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: recorded in git history
