# Azure 설정 및 운영 안내

이 문서는 기존 Static Web Apps Free 리소스에 React 게임과 Entra 보호 랭킹 API를 함께 배포하는 절차를 설명합니다. 별도 App Service나 Functions 리소스를 만들지 않습니다. 게임 원정 진행은 브라우저별 `localStorage`에 남고, Cosmos DB에는 직원별 최고 완료 전투 수만 기록합니다.

## 현재 구성

- React SPA: Static Web Apps의 정적 파일로 서비스하며 회사 Entra single-tenant 계정을 사용합니다.
- API: Static Web Apps Free의 관리형 Functions API(Node.js 22, Functions v4)를 사용합니다. 경로는 `GET /api/leaderboard`, `POST /api/leaderboard/progress`입니다.
- 랭킹: 전투 승리 확인 뒤 브라우저가 `{ "completedBattles": n }`만 제출합니다. API는 검증된 Entra token에서 직원 ID와 이름을 읽습니다. 클라이언트 점수 조작 방지는 포함하지 않습니다.
- Cosmos DB: API 서버만 연결하며 계정 key를 Static Web Apps의 서버 API 설정으로 전달합니다. 브라우저에는 key가 노출되지 않습니다.
- 배포: 로컬 빌드 후 Azure Static Web Apps CLI로 SPA와 Functions API를 수동 배포합니다. GitHub Actions 자동 배포는 사용하지 않습니다.

## 필요한 Azure 설정

Azure 리소스와 Entra 앱 등록이 준비되어 있어야 합니다. 프로젝트에서 리소스를 자동 생성하지 않습니다.

### Entra 앱 등록

기존 SPA 앱 등록의 Application (client) ID를 사용합니다.

1. **Expose an API**에서 Application ID URI를 `api://<SPA-CLIENT-ID>`로 설정합니다.
2. Delegated scope `leaderboard.access`를 추가하고 사용자/관리자 동의 정책에 맞게 설정합니다.
3. **API permissions > Add a permission > My APIs**에서 같은 앱의 `leaderboard.access` 범위를 SPA 앱에 추가합니다.
4. **Authentication > Single-page application** 아래에 로컬 개발 origin과 배포 주소를 redirect URI로 등록합니다. `npm run dev`용 `http://localhost:5173`과 통합 API 테스트용 `http://localhost:4280`을 모두 추가합니다.
5. 앱 등록의 Tenant ID와 Client ID를 빌드 환경의 `.env`에 `VITE_ENTRA_TENANT_ID`, `VITE_ENTRA_CLIENT_ID`로 지정합니다.

초기 로그인은 `openid profile`만 사용합니다. API scope는 플레이어가 랭킹을 열거나 기록 재시도를 할 때 요청됩니다. API는 해당 테넌트에서 발급된 v1/v2 access token을 각각의 issuer와 서명 키로 검증합니다. Audience는 앱 등록의 Client ID 또는 이 앱의 `api://<SPA-CLIENT-ID>` URI이며, 요청 scope는 `api://<SPA-CLIENT-ID>/leaderboard.access`입니다. Microsoft Graph 권한은 필요하지 않습니다.

### Cosmos DB

1. Cosmos DB for NoSQL 계정 `maze-rescue-ms-b7af62a9`(리소스 그룹 `grill-me-edu`)의 `mango-stone` 데이터베이스에서 `leaderboard-progress` 컨테이너를 사용합니다.
2. 컨테이너의 파티션 키는 `/userId`입니다. 한 직원당 하나의 `best-progress` 기록만 보관합니다.
3. 데이터베이스는 400 RU/s 공유 처리량을 사용하며, `leaderboard-progress` 컨테이너는 전용 처리량을 설정하지 않고 이를 공유합니다. 랭킹 정렬 쿼리를 위해 컨테이너 indexing policy에 복합 인덱스 `(completedBattles DESC, recordedAt ASC)`를 포함합니다.
4. 계정의 기본/읽기-쓰기 key를 API 설정으로 전달할 담당자를 정합니다. Static Web Apps Free 관리형 API는 managed identity를 지원하지 않으므로 서버 전용 Cosmos key를 사용합니다.

Cosmos DB 사용량과 저장 용량은 요금이 발생할 수 있습니다. 무료 Static Web Apps가 Cosmos 비용까지 무료로 만들지는 않습니다.

## Static Web Apps API 설정

Static Web App 리소스의 **Environment variables / Configuration**에서 Functions API 서버 설정으로 다음 값을 지정합니다. 포털 UI 명칭은 변경될 수 있습니다.

| 설정 이름 | 값 | 공개 여부 |
| --- | --- | --- |
| `ENTRA_TENANT_ID` | 회사 Entra Tenant ID | 서버 설정 |
| `ENTRA_API_AUDIENCE` | Entra 앱 등록 Client ID | 서버 설정 |
| `COSMOS_ENDPOINT` | Cosmos DB account endpoint | 서버 설정 |
| `COSMOS_KEY` | Cosmos 계정 key | 비밀값; 서버 설정에만 저장 |
| `COSMOS_DATABASE` | `mango-stone` | 서버 설정 |
| `COSMOS_CONTAINER` | `leaderboard-progress` | 서버 설정 |

변경 뒤 API를 재시작하거나 새 deployment를 적용하세요. `COSMOS_KEY`를 Vite `VITE_*` 환경 변수, `.env`, 명령행 인자, 브라우저 저장소, Git 파일에 넣지 마세요.

## 로컬 API 미리보기 (선택)

일반 브라우저 게임 개발에는 API 설정이 필요하지 않습니다. Functions API 통합 확인이 필요할 때만 다음을 준비합니다.

1. Azure Functions Core Tools v4를 설치합니다. Azurite는 프로젝트 개발 의존성으로 포함되어 있으므로 별도로 설치하지 않아도 됩니다.
2. `apps/leaderboard-api/local.settings.example.json`을 `apps/leaderboard-api/local.settings.json`으로 복사하고 로컬용 Entra 및 Cosmos 값을 입력합니다. 파일은 `.gitignore` 대상입니다.
3. 루트에서 통합 로컬 실행 명령을 사용합니다. 이 명령은 빌드한 뒤 Azurite와 SWA 로컬 emulator를 함께 시작합니다. Functions의 `AzureWebJobsStorage`에는 `UseDevelopmentStorage=true`를 사용하고, 랭킹 데이터는 Azurite가 아니라 실제 Cosmos 계정에 저장됩니다.

   ```powershell
   npm.cmd run dev:swa
   ```

4. 브라우저에서 `http://localhost:4280`을 엽니다. Entra 앱 등록의 SPA redirect URI에도 이 origin이 있어야 합니다. PowerShell에서 `npm.ps1` 실행이 막혀 있으면 `npm` 대신 `npm.cmd`를 사용합니다. `npm.cmd run dev`의 `http://localhost:5173`은 프런트엔드만 실행하며 `/api`를 연결하지 않습니다.

## 수동 빌드 및 배포

1. `.env`에 공개 SPA 식별자 두 개를 입력하고 저장소 루트에서 dry run으로 빌드 결과를 확인합니다.

   ```powershell
   npm run deploy:swa -- -DryRun
   ```

2. Static Web Apps 리소스의 Overview에서 deployment token을 복사해 현재 PowerShell 세션에만 설정하거나, `npx swa login`으로 Azure에 인증합니다. 토큰을 명령행에 직접 넣거나 채팅·Git에 기록하지 마세요.

   ```powershell
   $env:SWA_CLI_DEPLOYMENT_TOKEN = Read-Host "Static Web Apps deployment token"
   npm run deploy:swa
   Remove-Item Env:SWA_CLI_DEPLOYMENT_TOKEN
   ```

   앱 등록 식별자는 `.env`에서 읽고 배포 토큰은 CLI 환경변수에서 읽습니다. 스크립트는 설정값을 화면에 출력하지 않습니다.

3. 스크립트는 컴파일된 API를 `.swa/leaderboard-api`에 staging하고 production dependencies를 설치한 뒤, 그 독립 패키지와 `apps/web/dist`를 production 환경으로 전송합니다. 로컬 `local.settings.json`은 staging하지 않으며 Vite frontend에 Cosmos key를 포함하지 않습니다.
4. 배포가 끝나면 Static Web Apps의 API Configuration에 서버 설정 6개가 들어 있는지 확인합니다.

SWA CLI는 Azure 로그인 세션이나 `SWA_CLI_DEPLOYMENT_TOKEN`으로 배포할 수 있습니다. 리소스에 접근할 권한이 없다면 Azure 관리자에게 Static Web Apps 배포 권한 또는 배포 token을 요청하세요.

## 배포 후 확인

1. 배포된 사이트 주소에서 Entra 로그인 및 게임 시작을 확인합니다.
2. 메인 메뉴의 랭킹과 원정 경로의 왕관 버튼에서 상위 10명 모달이 열리는지 확인합니다.
3. 로그인하지 않은 요청은 `GET /api/leaderboard`에서 401, 잘못된 완료 수는 POST에서 400, 서버 설정 누락은 503을 반환해야 합니다. 브라우저 개발자 도구에서 access token을 복사하거나 공유하지 마세요.
4. 테스트 전용 원정에서 승리한 뒤에만 진행도 POST가 발생하고, Cosmos에 verified employee별 최고 기록이 저장되는지 확인합니다. 실제 랭킹에 불필요한 테스트 점수는 남기지 마세요.

## 보안 및 운영

- 랭킹 API 요청 본문에는 완료한 전투 수만 포함합니다. 사용자 ID/이름은 API가 검증한 Entra token claims에서 가져옵니다.
- Cosmos key와 배포 token은 공개 frontend 설정과 구분된 서버/세션 비밀값입니다.
- 랭킹은 친목용이며 브라우저가 보고한 진행 수를 서버가 게임 시뮬레이션으로 증명하지 않습니다.
- 사용자 원정 전체 상태는 Cosmos에 저장하지 않습니다.

공식 안내: [Static Web Apps 구성 및 Node API runtime](https://learn.microsoft.com/azure/static-web-apps/configuration), [SWA CLI 배포](https://learn.microsoft.com/azure/static-web-apps/static-web-apps-cli-deploy), [Static Web Apps API 앱 설정](https://learn.microsoft.com/azure/static-web-apps/application-settings).
