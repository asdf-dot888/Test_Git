# Azure 설정 및 운영 안내

이 문서는 회사에서 이미 제공하는 Microsoft Entra 테넌트, Azure App Service, Azure Cosmos DB for NoSQL을 이 앱에 연결하는 절차입니다. 이 저장소는 Azure 리소스나 앱 등록을 만들지 않습니다. 실제 배포에는 회사 Tenant ID, 앱 등록 정보, 리소스 endpoint와 권한이 필요합니다. 값을 받을 수 없거나 권한 범위가 불명확하면 회사 Azure 운영자에게 요청하세요.

## 구성 요약

- React SPA와 Express API는 하나의 Node.js 24 LTS App Service 및 동일 origin에서 실행됩니다.
- 브라우저 로그인은 MSAL로 단일 사내 테넌트를 사용합니다. API는 access token의 서명, v2 issuer, audience, tenant를 검증하고 검증된 Entra `oid`를 사용자 키로 사용합니다.
- API는 Cosmos DB에 `DefaultAzureCredential`로 접속합니다. App Service에서는 Managed Identity를, 개발자 로컬에서는 승인된 Azure 개발자 자격 증명을 사용합니다. 키 기반 연결 문자열은 사용하지 않습니다.

## 로컬 Azure 개발 모드

로컬 실행에도 사내 Entra 인증과 Cosmos 연결을 동일하게 요구합니다. 저장소 루트에서 `.env.example`을 `.env`로 복사한 뒤 회사 운영자가 제공한 아래 여섯 값을 설정합니다. `.env`는 Git에 포함하지 않습니다.

```powershell
Copy-Item .env.example .env
notepad .env
```

필수 변수는 `ENTRA_TENANT_ID`, `ENTRA_API_AUDIENCE`, `VITE_ENTRA_TENANT_ID`, `VITE_ENTRA_CLIENT_ID`, `VITE_ENTRA_API_SCOPE`, `COSMOS_ENDPOINT`입니다. `VITE_ENTRA_TENANT_ID`는 `ENTRA_TENANT_ID`와 같은 테넌트를 가리켜야 합니다. `COSMOS_DATABASE`, `COSMOS_CONTAINER`, `PORT`는 기본값을 사용할 수 있으며 필수 인증 설정을 대신하지 않습니다.

SPA 앱 등록에는 `http://localhost:5173` redirect URI가 필요합니다. 모든 필수 값이 설정되면 저장소 루트에서 `npm run dev`를 실행합니다. 값이 하나라도 비어 있으면 launcher가 누락 변수명을 보여주고 종료하며, Vite와 API 프로세스를 시작하지 않습니다. 로컬 개발에 사용하는 Azure 계정에도 아래 Cosmos 데이터 평면 권한이 부여되어 있어야 합니다.

## 1. Entra 앱 등록 값 준비

회사에서 승인한 **single-tenant** 앱 등록을 사용하거나 운영자에게 앱 등록을 요청합니다. API 보호용 등록과 SPA 등록을 분리했다면 각 항목의 값을 올바른 앱에서 가져옵니다.

1. SPA 플랫폼에 로컬 개발 주소(기본 `http://localhost:5173`)와 운영 프런트엔드 origin을 redirect URI로 등록합니다. 코드가 사용하는 redirect URI는 현재 브라우저 origin입니다.
2. API 앱 등록에서 access token 발급을 위한 delegated scope를 노출합니다. 브라우저 설정 `VITE_ENTRA_API_SCOPE`에는 전체 scope 값(보통 `api://<API 앱의 Application ID URI>/<scope 이름>`)을 넣습니다.
3. 다음 세 값을 운영자에게 확인합니다.
   - `ENTRA_TENANT_ID`: 회사 디렉터리의 Tenant ID. `VITE_ENTRA_TENANT_ID`에도 동일한 값을 사용합니다.
   - `VITE_ENTRA_CLIENT_ID`: 브라우저 SPA의 Application (client) ID.
   - `ENTRA_API_AUDIENCE`: API access token의 `aud` claim과 일치하는 API audience. API 앱의 설정과 발급된 v2 access token에 맞는 값을 운영자가 확인해야 합니다. SPA client ID를 임의로 대신 넣지 마세요.
4. `VITE_ENTRA_API_SCOPE`를 브라우저가 요청하는 API delegated scope로 설정합니다. `VITE_` 접두어 변수는 브라우저 번들에 공개되므로 secret을 넣지 않습니다.
5. App Service Authentication을 활성화할 경우 해당 Entra provider의 callback redirect URI도 앱 등록에 추가합니다. 기본 callback 경로는 `https://<운영 호스트>/.auth/login/aad/callback`이며 실제 호스트는 운영자가 적용합니다.

회사 테넌트, client ID, audience, scope, 운영 주소는 저장소에 기록하지 않습니다. 개발자는 전달받은 로컬 값만 `.env`에 입력합니다.

## 2. App Service Authentication 설정

이 애플리케이션은 브라우저의 MSAL이 로그인하고 API가 Entra access token을 직접 검증합니다. 따라서 App Service의 Authentication/Easy Auth는 기본적으로 켜지 않습니다. Easy Auth에서 전체 사이트 인증을 강제하면 React 앱이 MSAL 로그인을 시작하기 전에 리디렉션될 수 있습니다. `/api/health`는 공개 상태 확인용이고, 게임 데이터 API는 애플리케이션의 bearer token 검증으로 보호합니다.
## 3. App Service 설정 값

App Service의 Configuration > Application settings에 배포 환경에 맞는 값을 추가합니다.

| 설정 | 값 |
| --- | --- |
| `ENTRA_TENANT_ID` | 회사 Tenant ID |
| `ENTRA_API_AUDIENCE` | API에서 검증할 access token audience (`aud`) |
| `VITE_ENTRA_TENANT_ID` | 회사 Tenant ID |
| `VITE_ENTRA_CLIENT_ID` | SPA 앱 등록 client ID |
| `VITE_ENTRA_API_SCOPE` | API delegated scope 전체 값 |
| `COSMOS_ENDPOINT` | 기존 Cosmos DB 계정의 HTTPS endpoint |
| `COSMOS_DATABASE` | `card-roguelike` |
| `COSMOS_CONTAINER` | `active-runs` |
| `PORT` | App Service 플랫폼이 앱 프로세스에 제공하는 포트 값 사용. 하드코딩하지 않음 |

`VITE_` 값은 프런트엔드 빌드 때 번들에 들어갑니다. 따라서 운영용 값을 빌드 환경의 환경변수(또는 승인된 CI 변수)로 제공한 뒤 `npm run build`를 실행해야 합니다. App Service Application settings는 이미 만들어진 프런트엔드 번들에 자동으로 삽입되지 않으므로, 빌드 환경과 App Service 설정을 일치시키고 해당 빌드 산출물을 배포합니다. client secret, Cosmos key 또는 access token은 이 설정이나 저장소에 넣지 않습니다. 회사 정책상 비밀 값이 필요한 다른 통합을 추가한다면 App Service 설정/Key Vault 연동 정책을 따르세요. 현재 앱의 Cosmos 인증은 secret을 요구하지 않습니다.

## 4. Managed Identity와 Cosmos 데이터 권한

1. App Service의 System assigned managed identity를 활성화하고 principal/object ID를 확인합니다.
2. 기존 Cosmos DB 계정에서 앱이 사용할 database와 container를 운영자가 준비합니다.
3. App Service identity에 Cosmos **데이터 평면** 읽기/쓰기 권한을 부여합니다. 컨테이너 범위의 최소 역할(예: Cosmos DB Built-in Data Contributor)을 우선 검토하고 회사 RBAC 정책에 맞춰 범위를 제한합니다. 구독 관리 권한 등 제어 평면의 광범위한 권한은 앱 실행에 필요하지 않습니다.
4. 개발자 로컬 실행에도 별도 승인된 개발자 identity의 Cosmos 데이터 권한이 필요합니다. 로컬에서 권한이 없으면 관리자에게 요청하며 계정 key로 우회하지 않습니다.

## 5. 컨테이너 스키마 확인

기존 `card-roguelike` database 안에 `active-runs` container를 사용합니다.

- Partition key path: `/userId`
- 저장 문서 ID: `active-run`
- `userId`: 검증된 Entra access token의 `oid` 값
- 문서에는 `schemaVersion`, 현재 run, 기기 lease, 생성/수정 시간이 저장됩니다.

동일 계정은 활성 원정 문서 하나를 사용합니다. 게임 종료/포기 시 문서가 삭제됩니다. 이 경로와 ID는 코드 상수와 맞아야 하므로 변경 전 데이터 마이그레이션을 설계하세요.

## 6. 빌드 및 App Service 배포

저장소 루트에서 Node.js 24 환경으로 실행합니다.

```bash
npm ci
npm run build
```

빌드 후 루트에서 `npm start`가 실행될 수 있도록 App Service Node.js 런타임을 24 LTS로 맞추고 startup command를 `npm start`로 설정합니다. 배포 산출물은 저장소 루트 구조를 유지해야 하며, 최소한 루트 `package.json`/`package-lock.json`, 설치된 런타임 의존성(`node_modules`), `apps/api/dist`, `apps/web/dist`, `packages/game-core`의 package metadata와 `dist`가 포함되어야 합니다. `node_modules`는 대상 플랫폼의 Node 환경에서 설치합니다. App Service zip 배포를 사용한다면 빌드 및 의존성 설치 결과를 포함한 루트 패키지를 준비하고, 회사 표준 CI/CD가 있으면 동일한 빌드 산출물 경로와 `npm start` 설정을 사용하세요.

배포 전에 1~3절의 Application settings가 저장되어 있어야 합니다. 설정 변경 뒤에는 프런트엔드 번들에 반영되도록 다시 빌드하고 재배포합니다. 배포 후 로그에서 환경변수 값, token, 사용자 저장 문서 내용을 출력하지 마세요.

## 7. 배포 후 smoke check

운영 또는 승인된 테스트 계정으로 다음 순서대로 확인합니다.

1. `GET https://<운영 호스트>/api/health`가 `200`과 `{ "status": "ok" }`를 반환하는지 확인합니다. 이 endpoint는 공개 상태 확인용이며 DB 준비 상태를 검사하지 않습니다.
2. 앱에 접속해 회사 계정 로그인 redirect와 앱 복귀가 성공하는지 확인합니다.
3. 인증 토큰이 없는 보호 API 요청은 `401`, 다른 테넌트 또는 잘못된 audience의 토큰은 `403`으로 거부되는지 확인합니다. 토큰 문자열은 출력하거나 로그에 남기지 않습니다.
4. 테스트 계정에서 새 원정을 만들고 전투 상태를 저장한 뒤 새로고침해 같은 진행이 복원되는지 확인합니다.
5. 같은 계정으로 두 번째 브라우저/기기에서 접속해 기존 원정이 잠겨 `423` 상태가 되는지 확인합니다.
6. 첫 세션에서 입력 활동을 멈추고 15분이 지난 뒤 두 번째 세션이 lease를 인수하고 원정을 이어가는지 확인합니다. 이 테스트는 15분 이상 걸립니다.
7. 확인이 끝난 테스트 원정은 게임 내 종료/포기 동작으로 정리합니다.

운영 배포는 실제 회사 테넌트, 앱 등록, App Service 및 Cosmos 접근 권한을 부여받은 운영자가 수행해야 합니다. 이 문서만으로 회사 리소스 생성이나 배포 권한이 생기지 않습니다.

## 8. 수동 production 배포 (Linux App Service)

이 저장소는 React SPA와 API를 같은 Node.js App Service origin에서 제공합니다. 아래 작업은 회사 Azure 관리자와 개발자가 나눠 진행합니다. 앱 등록, App Service, Cosmos DB가 준비되기 전에는 실제 게임 URL이 아직 없습니다.

### 관리자 준비 항목

- 기존 회사 tenant에서 single-tenant SPA 앱 등록과 API 앱 등록을 준비합니다. API에 delegated scope를 노출하고 SPA에 허용하며, SPA의 redirect URI에 최종 `https://<app-name>.azurewebsites.net` origin을 등록합니다.
- Linux Node.js 24 LTS App Service를 준비하고, 앱 이름과 리소스 그룹을 개발자에게 전달합니다. 앱의 startup command는 `npm start`입니다.
- Cosmos DB for NoSQL에 `card-roguelike` database와 `/userId` partition key를 사용하는 `active-runs` container를 준비합니다. App Service system-assigned managed identity를 켜고, 해당 identity에 필요한 Cosmos data-plane 권한만 부여합니다.
- 배포 담당자에게 해당 리소스 그룹 내 필요한 범위의 권한과 tenant/subscription/resource group/app 이름, Cosmos endpoint, Entra의 tenant/client/audience/scope 값을 안전한 사내 채널로 전달합니다. 비밀 값은 이 저장소, ZIP, 채팅에 넣지 않습니다.

### App Service 설정

Azure Portal의 App Service > Configuration > Application settings에서 다음 값을 설정합니다. `VITE_` 값은 브라우저에 전달되는 공개 설정이며, Vite가 빌드할 때 번들에 포함되므로 secret을 넣지 않습니다.

| 설정 | 값 |
| --- | --- |
| `ENTRA_TENANT_ID` | 회사 tenant ID |
| `ENTRA_API_AUDIENCE` | API access token의 `aud`와 일치하는 API audience |
| `VITE_ENTRA_TENANT_ID` | 회사 tenant ID |
| `VITE_ENTRA_CLIENT_ID` | SPA 앱 등록의 client ID |
| `VITE_ENTRA_API_SCOPE` | SPA가 요청할 API delegated scope 전체 값 |
| `COSMOS_ENDPOINT` | Cosmos 계정의 HTTPS endpoint |
| `COSMOS_DATABASE` | `card-roguelike` |
| `COSMOS_CONTAINER` | `active-runs` |
| `SCM_DO_BUILD_DURING_DEPLOYMENT` | `true` |

App Service의 runtime stack은 Linux Node.js 24 LTS, startup command는 `npm start`로 설정합니다. 플랫폼이 제공하는 `PORT`를 사용하므로 직접 지정하지 않습니다. 앱은 MSAL 로그인과 자체 API token 검증을 사용하므로 App Service Authentication/Easy Auth의 전체 사이트 인증은 끈 상태로 둡니다.

### 빌드 및 ZIP 업로드 (PowerShell)

저장소 루트에서 Node.js 24와 Azure CLI를 사용합니다. `.env`에 production SPA의 공개 Entra 설정을 넣어야 빌드 결과가 올바른 redirect origin과 scope를 사용합니다. API 설정과 Cosmos endpoint는 App Service 설정으로 전달하며, Cosmos key나 client secret은 사용하지 않습니다.

```powershell
npm ci
npm test
npm run lint
npm run build
npm run package:release

az login
az account set --subscription "<subscription-id>"
az webapp config set --resource-group "<resource-group>" --name "<app-name>" --linux-fx-version "NODE|24-lts"
az webapp config appsettings set --resource-group "<resource-group>" --name "<app-name>" --settings SCM_DO_BUILD_DURING_DEPLOYMENT=true
az webapp deploy --resource-group "<resource-group>" --name "<app-name>" --src-path "artifacts/board-card-roguelike-release.zip" --type zip
```

CLI 명령은 이미 준비된 App Service를 대상으로 합니다. 리소스가 준비되기 전에는 만들거나 배포할 수 없습니다. ZIP 내부는 저장소 루트 구조이며 `.env`, `.git`, `node_modules`, `.memory`는 포함되지 않습니다. ZIP 배포에서 App Service build automation을 사용하려면 `SCM_DO_BUILD_DURING_DEPLOYMENT=true`가 필요합니다. 배포 명령은 앱을 재시작합니다.

production Entra 값이 바뀌면 `.env`를 갱신하고 `npm run package:release`를 다시 실행한 ZIP을 배포해야 합니다. `VITE_` 값은 빌드 시 번들에 고정됩니다. 앱 설정 화면의 `VITE_` 값을 바꾸는 것만으로 이미 만들어진 웹 번들이 바뀌지 않습니다.

### 배포 후 smoke check

1. `https://<app-name>.azurewebsites.net/api/health`에서 HTTP 200과 `{ "status": "ok" }`를 확인합니다. 이 확인은 API 프로세스 상태만 검사하며 Cosmos 연결까지 증명하지는 않습니다.
2. 사이트에 접속해 회사 Entra 계정으로 로그인하고 게임 화면이 열리는지 확인합니다.
3. 로그인 없이 보호된 게임 API를 호출했을 때 401, 잘못된 tenant/audience의 token으로 호출했을 때 403 응답을 확인합니다. token 문자열은 명령 기록이나 로그에 남기지 않습니다.
4. 테스트 계정으로 새 원정을 시작해 상태를 저장하고, 새로고침 뒤 이어하기가 되는지 확인합니다. 다른 브라우저 세션에서는 사용자 데이터가 섞이지 않는지도 확인합니다.
5. Azure Monitor/App Service 로그에서 앱 시작과 오류를 확인하되 access token이나 사용자 저장 데이터를 로그에 남기지 않습니다. 테스트 원정 데이터는 확인 뒤 게임 내 종료/초기화 동작으로 정리합니다.

공식 명령 참고: [Azure CLI `az webapp`](https://learn.microsoft.com/en-us/cli/azure/webapp), [App Service ZIP 배포](https://learn.microsoft.com/en-us/azure/app-service/deploy-zip), [Linux Node.js 설정](https://learn.microsoft.com/en-us/azure/app-service/configure-language-nodejs).