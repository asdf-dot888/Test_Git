# Azure 설정 및 운영 안내

이 문서는 회사 Microsoft Entra 테넌트와 Azure App Service에 현재 게임을 연결하는 방법을 안내합니다. 저장소는 Azure 리소스나 앱 등록을 만들지 않습니다. 현재 게임 진행은 브라우저별 `localStorage`에 보관하며, 플레이 API나 Cosmos DB를 사용하지 않습니다. Cosmos DB는 후속 작업에서 사내 친목용 진행도 랭킹을 저장하는 용도로 추가할 계획입니다.

## 현재 구성

- React SPA는 MSAL을 사용해 single-tenant Entra 계정으로 로그인합니다.
- 로그인에는 SPA의 Tenant ID와 Client ID가 필요합니다. 사용자 계정으로 로그인한다고 앱 등록의 식별자가 자동으로 발견되는 것은 아닙니다.
- API audience, delegated API scope, client secret, Cosmos 연결은 현재 게임 플레이에 필요하지 않습니다.
- 활성 원정은 Entra `oid`별 브라우저 로컬 저장소에 저장됩니다. 다른 기기와 동기화되지 않습니다.
- Azure Node.js 24 LTS App Service는 빌드된 SPA를 제공하고 `/api/health`를 응답합니다. 게임 데이터 API는 현재 마운트되지 않습니다.

## 로컬 개발

저장소 루트에서 다음 명령을 실행합니다.

```powershell
npm install
Copy-Item .env.example .env
notepad .env
npm run dev
```

현재 `.env.example`의 두 공개 SPA 설정을 회사 앱 등록 정보로 채웁니다.

| 변수 | 값 |
| --- | --- |
| `VITE_ENTRA_TENANT_ID` | 회사 Entra 디렉터리의 Tenant ID |
| `VITE_ENTRA_CLIENT_ID` | 브라우저 SPA 앱 등록의 Application (client) ID |

웹 앱은 두 값이 비어 있어도 시작하며 로그인 설정 화면에서 필요한 항목을 보여줍니다. 로그인을 마치려면 두 값을 설정하고 Vite를 다시 시작해야 합니다. 기본 로컬 origin은 `http://localhost:5173`입니다. 포트 5173이 이미 사용 중이면 Vite가 다른 포트를 선택할 수 있으므로, 터미널에 나온 실제 origin을 Entra 앱 등록에도 추가합니다.

로컬 실행에는 API 서버, Cosmos endpoint, Azure CLI 로그인 또는 Cosmos 데이터 권한이 필요하지 않습니다. `.env`는 Git에서 제외됩니다. `VITE_` 변수는 브라우저 번들에서 공개되므로 tenant/client 식별자만 넣고 client secret, token, Cosmos key는 넣지 마세요.

## Entra SPA 앱 등록

회사에서 승인한 single-tenant 앱 등록을 사용하거나 Azure 운영자에게 SPA 등록을 요청합니다.

1. 앱 등록의 **Authentication > Add a platform > Single-page application**에 개발용 redirect URI를 등록합니다. 기본값은 `http://localhost:5173`이며, 현재 사용하는 다른 localhost 포트도 등록할 수 있습니다.
2. Azure 배포 전 최종 사이트 origin을 redirect URI에 추가합니다. 기본 Azure 주소 예시는 `https://<app-name>.azurewebsites.net`입니다.
3. 앱 등록의 Overview에서 Tenant ID와 Application (client) ID를 확인해 빌드 환경에 `VITE_ENTRA_TENANT_ID`, `VITE_ENTRA_CLIENT_ID`로 설정합니다.
4. 현재 로그인은 OIDC `openid` 및 `profile` 범위만 사용합니다. 별도의 API 앱 등록, delegated API permission 또는 사용자 동의는 현재 플레이 경로에 필요하지 않습니다.

Tenant ID와 Client ID는 앱 설정 값입니다. 직원의 로그인 절차로 이 값들을 조회하지 않습니다. 실제 회사 테넌트에서 앱 등록을 조회할 권한이 없으면 Azure 운영자에게 해당 두 식별자와 redirect URI 등록을 요청하세요.

## App Service

배포된 사이트에서 MSAL이 로그인을 시작하므로 App Service Authentication/Easy Auth의 전체 사이트 인증은 비활성 상태로 둡니다. Easy Auth가 먼저 리디렉션하면 React 앱의 MSAL 흐름이 시작되지 않을 수 있습니다.

서버는 App Service가 제공하는 `PORT` 환경 변수를 사용합니다. 현재 정적 사이트 호스팅 및 health 응답은 Entra API 설정이나 Cosmos 설정을 요구하지 않습니다. 다음 endpoint는 프로세스 상태 확인용입니다.

```text
GET https://<app-name>.azurewebsites.net/api/health
200 { "status": "ok" }
```

## 빌드와 수동 ZIP 배포

`VITE_` 값은 Vite 빌드 시 브라우저 번들에 포함됩니다. App Service Application settings에서 값을 바꿔도 이미 만들어진 SPA 번들은 변경되지 않습니다. 운영용 Tenant ID와 SPA Client ID를 빌드 환경에 설정하고 ZIP을 생성하세요.

```powershell
npm ci
npm test
npm run lint
$env:VITE_ENTRA_TENANT_ID = "<tenant-id>"
$env:VITE_ENTRA_CLIENT_ID = "<spa-client-id>"
npm run package:release

az login
az account set --subscription "<subscription-id>"
az webapp config set --resource-group "<resource-group>" --name "<app-name>" --linux-fx-version "NODE|24-lts"
az webapp config appsettings set --resource-group "<resource-group>" --name "<app-name>" --settings SCM_DO_BUILD_DURING_DEPLOYMENT=true
az webapp deploy --resource-group "<resource-group>" --name "<app-name>" --src-path "artifacts/board-card-roguelike-release.zip" --type zip
```

Linux Node.js 24 LTS App Service의 startup command는 `npm start`로 설정합니다. ZIP은 저장소 루트 구조를 유지하며 `.env`, `.git`, `node_modules`, `.memory`를 포함하지 않습니다. 배포 명령은 앱을 재시작합니다. 리소스 그룹, App Service, 앱 등록은 회사 Azure 운영자가 준비해야 합니다.

### 배포 후 확인

1. `/api/health`가 HTTP 200과 `{ "status": "ok" }`를 반환하는지 확인합니다.
2. Azure 기본 URL에서 회사 계정 로그인을 마치고 게임 화면으로 돌아오는지 확인합니다.
3. 새 원정을 시작하고 새로고침해 같은 브라우저에서 진행이 복구되는지 확인합니다. 다른 브라우저/기기에는 진행이 공유되지 않습니다.
4. 브라우저 저장소 차단 시 표시되는 경고를 확인하고, 콘솔 및 App Service 로그에 token이나 게임 진행 전체를 남기지 않습니다.

## 후속 기능: Cosmos 진행도 랭킹

Cosmos DB는 현재 앱의 로그인, 플레이, active run 저장에 사용하지 않습니다. 후속 랭킹 기능에서는 전투 승리 뒤 브라우저가 제출한 최고 완료 진행도를 별도 Entra 보호 API로 보내고, Cosmos에 직원별 최고 점수만 저장할 예정입니다. 이 랭킹은 사내 친목용이며 클라이언트 점수 조작 방지는 범위에 포함하지 않습니다. 랭킹 API, Cosmos container와 필요한 API permission은 해당 기능의 구현 및 Azure 자원 준비 때 별도로 안내합니다.

공식 명령 참고: [Azure CLI `az webapp`](https://learn.microsoft.com/en-us/cli/azure/webapp), [App Service ZIP 배포](https://learn.microsoft.com/en-us/azure/app-service/deploy-zip), [Linux Node.js 설정](https://learn.microsoft.com/en-us/azure/app-service/configure-language-nodejs).
