# Decisions: 정식 게임 Azure 배포

- Date: 2026-10-23
- Status: Confirmed

## D01. 배포 목표
- **Chosen**: 로컬 데모를 공개하는 것이 아니라 사내에서 사용할 정식 버전을 배포한다.
- **Rationale**: 정식 버전은 기존 게임의 계정별 저장, API, Entra 인증을 사용한다.

## D02. 실행 및 데이터 구성
- **Chosen**: React 프런트엔드와 Node.js API를 Linux Azure App Service에 함께 배포하고, Azure Cosmos DB for NoSQL에 원정 진행 상태를 저장한다.
- **Rationale**: 기존 코드와 Azure 운영 문서가 이 구조를 기준으로 구성돼 있다.
- **Codebase-derived**: App Service는 Node.js 24 LTS를 대상으로 하고, API는 Cosmos DB에 Entra 기반 관리 ID로 연결한다.

## D03. 인증과 접근 범위
- **Chosen**: 사내 단일 Entra 테넌트 계정만 허용한다. 정식 버전은 API를 호출하고 Cosmos 저장 기능을 사용하므로 API delegated scope를 포함한 기존 인증 흐름을 사용한다.
- **Rationale**: 사용자가 요청한 사내 계정 전용 게임이며, 기존 API는 Entra access token을 검증한다.

## D04. 로컬 개발 모드
- **Chosen**: 로그인 없이 실행하는 로컬 메모리 데모를 제거하고 Azure 개발 모드만 사용한다. 로컬에서도 Entra, API, Cosmos 연결을 사용한다. 필수 Azure 설정이 비어 있거나 일부 빠진 경우 개발 서버를 시작하지 않고 누락된 설정을 표시한다.
- **Rationale**: 데모 인증 우회 경로 없이 정식 버전과 같은 인증 및 저장 흐름으로 개발한다.
- **Supersedes**: `.memory/decisions/2026-10-22-local-browser-demo.md`의 데모 진입·인증 우회 결정을 이 개발 흐름에 한해 대체한다.

## D05. Azure 리소스 및 권한 준비
- **Chosen**: 이 프로젝트용 App Service, Cosmos DB, Entra 앱 등록은 아직 없다. 사용자는 직접 생성 권한이 없으므로 사내 IT/Azure 관리자에게 회사 Azure 구독 내 리소스 생성과 필요한 설정·권한 부여를 요청한다.
- **Rationale**: Azure 리소스 생성과 사내 테넌트 앱 등록은 관리자 승인이 필요한 작업이다.
- **Request scope**: Node.js 24 Linux App Service, Cosmos DB for NoSQL 데이터베이스/컨테이너와 관리 ID 데이터 권한, SPA/API 단일 테넌트 앱 등록 및 API scope, App Service 인증·앱 설정, 수동 배포용 제한된 RBAC 권한.

## D06. 배포 주소
- **Chosen**: 우선 Azure가 제공하는 기본 App Service 주소를 사용한다. 회사 사용자용 커스텀 도메인은 이번 범위에 포함하지 않는다.
- **Rationale**: 첫 정식 배포에서 별도 DNS·도메인 작업을 요구하지 않는다.

## D07. 배포 방식
- **Chosen**: GitHub Actions 자동 배포는 사용하지 않는다. 로컬에서 프로덕션 빌드와 배포 ZIP을 만들고, Azure CLI의 `az webapp deploy` 명령으로 App Service에 수동 배포한다.
- **Rationale**: 사용자가 빌드 후 배포를 직접 결정하는 흐름을 원한다. Linux App Service ZIP 배포는 Azure CLI로 수행한다.
- **Requirement**: IT/Azure 관리자는 배포 사용자에게 필요한 범위의 권한을 부여해야 한다.
