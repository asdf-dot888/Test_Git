# Plan: 보드형 카드 로그라이크

## Goal

React로 PC·모바일에서 플레이할 수 있는 어두운 판타지 보드형 1인용 카드 로그라이크를 만든다. 사내 Microsoft Entra ID 로그인을 거친 사용자는 3페이즈(일반전 3회와 보스전 1회씩)의 판을 플레이하고 진행 중인 판을 Cosmos DB에 저장해 다른 기기에서 이어할 수 있다. 영웅·하수인·주문·마나·AI 행동·보상 규칙은 `.memory/decisions/2026-10-21-board-card-roguelike.md`를 기준으로 한다.

## Phases

| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `done` | npm workspace와 공유 카드 전투 엔진을 만든다. | [P01](../phases/2026-10-21-board-card-roguelike/P01-game-core/phase.md) |
| P02 | `done` | 반응형 보드 UI와 플레이 가능한 전투·페이즈 진행 화면을 만든다. | [P02](../phases/2026-10-21-board-card-roguelike/P02-game-ui/phase.md) |
| P03 | `done` | Entra ID 인증, Cosmos DB 진행 저장, 단일 기기 세션 잠금을 연결한다. | [P03](../phases/2026-10-21-board-card-roguelike/P03-cloud-auth-save/phase.md) |
| P04 | `in_progress` | 하나의 Azure App Service에서 프런트엔드와 API를 실행하고 운영 설정을 문서화한다. | [P04](../phases/2026-10-21-board-card-roguelike/P04-app-service-release/phase.md) |

## Architecture

- Node.js 24 LTS와 npm workspaces를 사용한다. 현재 작업 환경에는 Node.js/npm이 없으므로 구현 전 설치가 필요하다.
- `apps/web`: React + TypeScript + Vite SPA.
- `apps/api`: Express + TypeScript REST API. `packages/game-core`의 타입과 게임 규칙을 사용한다.
- `packages/game-core`: 순수 TypeScript 카드 카탈로그, 상태 전이, 적 행동 및 보상 규칙.
- 한 Azure App Service가 API와 빌드된 React 파일을 같은 origin에서 제공한다. Azure App Service Authentication에서 익명 접근을 막고, API에서도 Entra access token의 서명·audience·issuer·tenant를 확인한다.
- Azure Cosmos DB for NoSQL은 `/userId` 파티션 키를 사용하는 `active-runs` 컨테이너에 계정당 활성 판 문서 하나를 저장한다. App Service Managed Identity로 DB에 접근하고, `DefaultAzureCredential`은 로컬 개발 인증에도 사용한다.
- 프런트엔드는 MSAL Browser로 사내 단일 테넌트에 로그인하고, API 호출 시 bearer access token을 전달한다. tenant/client/scope/Cosmos 설정은 환경 변수로 주입하며 비밀 값은 저장소에 넣지 않는다.
- 검증은 Vitest 단위 테스트, API 경로 테스트, 각 workspace 빌드로 수행한다. Azure 배포 전 실제 테넌트와 리소스 값이 필요하다.

## Prerequisites and Risks

- 현재 저장소에는 애플리케이션 코드와 Azure 리소스 설정이 없다. 회사에서 제공하는 Tenant ID, app registration client ID/API scope, App Service 이름과 Cosmos endpoint/database 권한은 배포 전에 받아야 한다.
- 현재 셸에서 `node`, `npm`, `git`을 찾지 못했다. 구현·검증·커밋을 수행할 환경에 Node.js 24 LTS, npm, Git을 설치해야 한다.
- 사내 Azure 환경의 App Service Authentication 및 Managed Identity 권한은 문서의 체크리스트에 따라 운영자가 설정한다. 이 계획은 임의로 회사 Azure 리소스를 생성하거나 배포하지 않는다.
