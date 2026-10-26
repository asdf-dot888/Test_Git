# 문제 해결

## Entra 로그인 및 랭킹 동의

| 증상 | 확인할 항목 | 조치 |
| --- | --- | --- |
| 로그인 설정 화면이 표시됨 | `VITE_ENTRA_TENANT_ID`, `VITE_ENTRA_CLIENT_ID` | `.env`에 SPA 앱 등록 식별자를 입력하고 Vite 서버를 다시 시작합니다. |
| `redirect_uri_mismatch` | 브라우저 origin과 SPA redirect URI | 현재 프로토콜·호스트·포트가 모두 일치하도록 앱 등록을 갱신합니다. |
| 랭킹을 열 때 동의/로그인 오류가 남 | 동일 앱의 delegated `leaderboard.access` scope와 동의 | Entra 앱의 Expose an API, SPA API permissions, 조직의 consent 정책을 확인한 뒤 랭킹에서 다시 시도합니다. API scope는 초기 로그인 때 요청하지 않습니다. |
| 랭킹 API가 401을 반환함 | Bearer token의 발급 issuer·테넌트·audience·scope | API는 같은 테넌트에서 발급된 v1/v2 토큰을 지원합니다. `ENTRA_TENANT_ID`, `ENTRA_API_AUDIENCE`가 앱 등록과 맞는지, 클라이언트가 `api://<client-id>/leaderboard.access`를 요청하는지 확인합니다. 토큰 문자열을 로그나 채팅에 남기지 마세요. |

## 진행 상황 저장

| 증상 | 확인할 항목 | 조치 |
| --- | --- | --- |
| 새로고침 뒤 원정이 사라짐 | 로그인 계정과 브라우저 `localStorage` | 동일한 Entra 계정과 브라우저를 사용하고 사이트 데이터가 삭제되지 않았는지 확인합니다. 현재 원정은 기기 간 동기화되지 않습니다. |
| 다른 기기에서 같은 진행이 보이지 않음 | 저장 위치 | Cosmos에는 랭킹 최고점만 저장하며 전체 원정을 복원하지 않습니다. |

## 랭킹 API와 Cosmos DB

| 증상 | 확인할 항목 | 조치 |
| --- | --- | --- |
| API가 503 `API_NOT_CONFIGURED` 반환 | Static Web Apps Functions API app settings | `ENTRA_TENANT_ID`, `ENTRA_API_AUDIENCE`, `COSMOS_ENDPOINT`, `COSMOS_KEY`, `COSMOS_DATABASE`, `COSMOS_CONTAINER`를 서버 API 설정에 지정합니다. |
| API가 503 `LEADERBOARD_UNAVAILABLE` 반환 | Cosmos endpoint/key, DB/container 이름, 네트워크 및 인덱스 | Cosmos endpoint와 key 권한을 확인하고 `mango-stone/leaderboard-progress`, `/userId` 파티션, 정렬용 composite index를 확인합니다. key를 브라우저에 전달하지 마세요. |
| 진행 POST가 400 반환 | 요청 본문과 완료 전투 수 | 본문이 `{ "completedBattles": 1 }`부터 12까지의 정수 하나만 포함하는지 확인합니다. ID, 이름, 전체 RunState를 보내지 않습니다. |
| 상위 랭킹 정렬이 실패함 | Cosmos composite index | `completedBattles DESC`, `recordedAt ASC` 복합 인덱스가 컨테이너 정책에 있는지 확인합니다. |
| `swa deploy`가 인증 실패 | Static Web Apps deployment token 또는 SWA CLI 로그인 | 현재 PowerShell에서 `SWA_CLI_DEPLOYMENT_TOKEN`을 지정하거나 `npx swa login`을 실행하고, 배포 권한이 있는 계정을 사용합니다. 토큰을 명령행에 직접 쓰지 마세요. |
| API 함수가 배포됐지만 실행되지 않음 | `apps/leaderboard-api/dist/index.js`, `host.json`, API package dependencies | `npm run build`, `npm run deploy:swa -- -DryRun`으로 배포 산출물을 확인하고 Functions v4 및 `node:22` runtime 설정을 확인합니다. |
| Static Web Apps CLI local preview에서 API가 시작되지 않음 | Functions Core Tools v4, Azurite, Node 버전 | PowerShell에서는 `npm.cmd run dev:swa`를 실행합니다. Azurite는 프로젝트 의존성으로 자동 시작됩니다. SWA CLI 2.1.0은 Node 24에서 Functions emulator를 시작하지 못하므로 명령이 빌드 뒤 로컬 Node 22 실행 파일을 사용합니다. Core Tools가 없다면 `winget install --id Microsoft.Azure.FunctionsCoreTools --exact`으로 설치하고 새 터미널을 엽니다. |
| 로컬 랭킹 API가 잘못된 Cosmos DB를 조회함 | 루트 `.env`의 `COSMOS_DATABASE` / `COSMOS_CONTAINER` | 게임 API용 루트 `.env` 값이 랭킹 API의 `local.settings.json`보다 먼저 적용될 수 있습니다. `npm.cmd run dev:swa`는 랭킹 DB `mango-stone/leaderboard-progress`를 별도로 지정합니다. |
| `npm.ps1` 실행 정책 오류 | PowerShell의 npm shim | `npm run ...` 대신 `npm.cmd run ...`을 사용합니다. |
| `localhost:4280`의 로그인에서 redirect 오류 | Entra SPA redirect URI | Entra 앱 등록의 **Authentication > Single-page application**에 `http://localhost:4280`을 등록합니다. 기존 Vite 주소 `http://localhost:5173`도 별도로 유지합니다. |

로그나 브라우저 네트워크 패널을 공유할 때는 요청 경로, 시각, HTTP 상태와 오류 코드 등 필요한 최소 정보만 남기세요. `Authorization` 헤더, access/ID token, Cosmos key, 배포 token은 복사·저장·공유하지 마세요.
