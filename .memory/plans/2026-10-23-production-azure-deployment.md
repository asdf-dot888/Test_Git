# Plan: 정식 게임 Azure 배포

## Goal

로그인 없는 로컬 메모리 데모를 제거하고 개발·운영 모두 사내 Entra ID, API, Cosmos DB를 사용하는 정식 흐름으로 통일한다. Windows 개발자가 빌드 산출물 ZIP을 만든 뒤 Azure CLI로 Linux App Service에 수동 배포할 수 있도록 패키지 생성기와 운영 절차를 제공한다. 첫 배포 URL을 실제로 열려면 사내 IT/Azure 관리자가 먼저 리소스와 권한을 준비해야 한다.

기준 결정: [2026-10-23-production-azure-deployment](../decisions/2026-10-23-production-azure-deployment.md)

## Phases

| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `done` | 로컬 인증 우회 데모를 제거하고 Azure 개발 모드만 남긴다. | [P01](../phases/2026-10-23-production-azure-deployment/P01-azure-only-development/phase.md) |
| P02 | `done` | Windows용 배포 ZIP 생성과 Azure CLI 수동 배포 절차를 제공한다. | [P02](../phases/2026-10-23-production-azure-deployment/P02-manual-app-service-release/phase.md) |

## External Prerequisites and Risks

- 이 프로젝트용 Entra 앱 등록, Linux App Service, Cosmos DB는 아직 생성되지 않았다. 사용자는 생성 권한이 없으므로 회사 IT/Azure 관리자의 조치가 필요하다.
- 로컬 Azure 개발 모드는 여섯 설정(`ENTRA_TENANT_ID`, `ENTRA_API_AUDIENCE`, `VITE_ENTRA_TENANT_ID`, `VITE_ENTRA_CLIENT_ID`, `VITE_ENTRA_API_SCOPE`, `COSMOS_ENDPOINT`)과 개발 계정의 Cosmos 데이터 권한이 준비되기 전에는 실행할 수 없다.
- 실제 배포 및 URL 검증은 App Service, Entra redirect URI/API scope, Cosmos DB 및 RBAC가 준비되고 사용자의 Azure CLI 배포 권한이 부여된 뒤에만 수행한다. 이 계획은 Azure 리소스를 자동 생성하거나 관리자에게 연락하지 않는다.
- 수동 ZIP 배포에 App Service 빌드 자동화를 사용할 경우 `SCM_DO_BUILD_DURING_DEPLOYMENT=true`가 필요하다. ZIP은 저장소 루트를 한 단계 더 감싸지 않도록 만들고 `.env`, `.git`, 로컬 `node_modules`를 포함하지 않는다.
