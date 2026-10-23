# 보드형 카드 로그라이크

React로 만든 어두운 판타지 보드형 1인용 카드 전투 게임입니다. 세 페이즈의 원정을 진행하며, 전투 승리 보상으로 덱을 강화합니다. 플레이하려면 Microsoft Entra 회사 계정으로 로그인해야 합니다. 현재 원정 진행은 계정별로 해당 브라우저의 `localStorage`에 저장됩니다. Cosmos DB와 게임 API는 현재 플레이 경로에 사용하지 않으며, 향후 사내 친목용 진행도 랭킹에 사용할 예정입니다.

## 개발 환경

- Node.js 24 LTS (`package.json`의 지원 범위: `>=24 <25`)
- npm (Node.js에 포함)
- 회사 Entra 테넌트에 등록된 SPA의 Tenant ID와 Client ID

## 로컬 개발 실행

1. 저장소 루트에서 의존성을 설치하고 환경 파일을 만듭니다.

   ```powershell
   npm install
   Copy-Item .env.example .env
   notepad .env
   ```

2. Entra SPA 앱 등록에서 받은 `VITE_ENTRA_TENANT_ID`와 `VITE_ENTRA_CLIENT_ID`를 `.env`에 입력합니다. 이 값은 앱 등록 식별자이며, 로그인하는 직원의 개인 로그인 정보로 자동 조회되는 값이 아닙니다. SPA 앱 등록의 redirect URI에는 현재 브라우저 origin을 등록해야 합니다. 기본 주소는 `http://localhost:5173`입니다. 포트가 사용 중이라 Vite가 다른 포트를 고르면 그 주소도 앱 등록에 추가하세요.

   API scope, client secret, Cosmos 설정은 로컬 플레이에 필요하지 않습니다. `.env`는 Git에서 제외되며 `VITE_` 값은 브라우저 번들에 포함되므로 비밀 값을 입력하지 마세요.

3. 저장소 루트에서 개발 서버를 시작합니다.

   ```bash
   npm run dev
   ```

   터미널에 표시된 `Local` 주소를 브라우저에서 엽니다. 환경 변수가 비어 있어도 웹 앱은 시작되며, 로그인 설정 화면에서 필요한 변수 이름을 보여줍니다. Entra 로그인은 올바른 Tenant ID, Client ID와 등록된 redirect URI가 있어야 완료됩니다. 개발 서버를 종료하려면 실행 중인 터미널에서 `Ctrl+C`를 누릅니다.

진행 상황은 로그인한 Entra 계정별로 현재 브라우저에 저장됩니다. 다른 브라우저나 기기와 동기화되지 않습니다. 브라우저 저장소를 사용할 수 없으면 게임은 현재 세션에서 계속할 수 있지만 새로고침이나 브라우저 종료 시 진행을 잃을 수 있다는 안내가 표시됩니다.

## 검증과 production build

```bash
npm test
npm run lint
npm run build
```

빌드는 공유 게임 엔진, API 호스트, React 앱 순서로 생성합니다. `npm start`는 빌드된 웹 앱을 제공하고 `/api/health` 상태 확인을 지원합니다. 현재는 게임 API나 Cosmos DB를 시작 조건으로 요구하지 않습니다.

## 문제 해결

- 로그인 설정 화면에 변수가 표시되면 `.env`에 Tenant ID와 SPA Client ID가 설정되어 있는지 확인하고 개발 서버를 다시 시작하세요.
- Entra redirect URI 오류가 나면 브라우저 주소의 origin과 SPA 앱 등록의 redirect URI가 정확히 일치하는지 확인하세요. `localhost` 포트도 일치해야 합니다.
- 진행 저장 경고가 나타나면 브라우저의 사이트 저장소 사용이 허용되어 있는지 확인하세요. 이 상태에서는 새로고침 전에 진행을 잃을 수 있습니다.
- 로그인 문제는 [문제 해결 안내](docs/troubleshooting.md)를 참고하세요.

## Azure production 배포

App Service 수동 배포 절차는 [Azure 설정 및 운영 안내](docs/azure-setup.md)를 참고하세요. release ZIP은 `npm run package:release`로 `artifacts/board-card-roguelike-release.zip`에 생성합니다. 현재 배포에는 Node.js App Service와 Entra SPA 앱 등록이 필요합니다. Cosmos 기반 랭킹 저장은 별도의 후속 작업입니다.
