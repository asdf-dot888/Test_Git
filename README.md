# 보드형 카드 로그라이크

React로 만든 어두운 판타지 보드형 1인용 카드 전투 게임입니다. 세 페이즈의 원정을 진행하며, 전투 승리 보상으로 덱을 강화합니다. 플레이하려면 Microsoft Entra 회사 계정으로 로그인해야 합니다. 현재 원정 진행은 계정별로 해당 브라우저의 `localStorage`에 저장됩니다. 사내 진행도 랭킹은 승리한 전투 수만 Entra 보호 API에 제출하고, API가 직원별 최고 기록을 Cosmos DB에 저장합니다.

## 개발 환경

- Node.js 24 LTS (`package.json`의 지원 범위: `>=24 <25`)
- npm (Node.js에 포함)
- 회사 Entra 테넌트의 SPA 앱 등록 Tenant ID와 Client ID

## 로컬 게임 실행

1. 저장소 루트에서 의존성을 설치하고 환경 파일을 만듭니다.

   ```powershell
   npm install
   Copy-Item .env.example .env
   notepad .env
   ```

2. Entra SPA 앱 등록의 공개 식별자 `VITE_ENTRA_TENANT_ID`와 `VITE_ENTRA_CLIENT_ID`를 `.env`에 입력합니다. SPA 앱 등록의 redirect URI에는 브라우저 origin을 등록해야 합니다. 기본 주소는 `http://localhost:5173`입니다.
3. 서버를 시작하고 터미널에 표시된 `Local` 주소를 브라우저에서 엽니다.

   ```bash
   npm run dev
   ```

일반 `npm run dev`는 게임과 로컬 저장 테스트에 Cosmos/API가 필요하지 않습니다. 랭킹 기능을 로컬에서 검증하려면 Azure Functions Core Tools와 Cosmos 연결값이 추가로 필요합니다. 전체 API 로컬 미리보기 방법은 [Azure 설정 및 운영 안내](docs/azure-setup.md)를 참고하세요. `.env`는 Git에서 제외됩니다. `VITE_` 값은 브라우저에 공개되므로 식별자만 넣고 비밀값은 입력하지 마세요.

## 검증과 프로덕션 빌드

```bash
npm test
npm run lint
npm run build
```

빌드는 게임 엔진, 기존 API 호스트, 랭킹 Functions API, React 앱을 생성합니다. Azure 자격 증명이 없어도 빌드할 수 있습니다.

## Azure Static Web Apps 수동 배포

기존 Static Web App에 SPA와 관리형 Functions API를 함께 배포하려면 [Azure 설정 및 운영 안내](docs/azure-setup.md)를 따릅니다. 배포 전 `.env`에 Entra 공개 식별자와 `SWA_CLI_DEPLOYMENT_TOKEN` 또는 SWA CLI 로그인을 준비한 뒤 아래 명령을 사용합니다.

```powershell
npm run deploy:swa
```

업로드 없이 빌드와 배포 파일만 점검하려면 다음을 실행합니다.

```powershell
npm run deploy:swa -- -DryRun
```

### 배포 버전 관리

현재 기준 버전은 1.0.0이며, 이 기준 버전에 대한 과거 배포 기록은 만들지 않았습니다. 다음 프로덕션 배포가 성공하면 게임 메인 메뉴에 v1.0.1이 표시됩니다. 이후 성공한 프로덕션 배포마다 패치 버전이 1씩 올라갑니다.

실제 배포 명령은 현재 Git 작업 트리가 깨끗하고 현재 브랜치에 upstream이 설정되어 있어야 합니다. 업로드가 성공한 뒤에만 루트 package.json과 package-lock.json의 버전, deployments.json의 기록을 갱신하고 chore(release) 커밋을 만든 다음 upstream으로 push합니다. 기록에는 버전, UTC 배포 시각, 배포한 소스의 전체 커밋 SHA가 포함됩니다.

Azure 업로드는 성공했지만 push가 실패했다는 경고가 나오면 새 버전은 이미 서비스 중입니다. 다시 배포하지 말고 안내된 git push 명령으로 로컬 release 커밋만 push하세요.

미리보기 배포는 현재 버전을 그대로 사용하며 프로덕션 기록과 Git release 변경을 만들지 않습니다. 아래 명령은 업로드 없이 빌드와 배포 패키지만 확인합니다. DryRun, 로컬 빌드, 또는 빌드·업로드 실패는 프로덕션 버전을 올리거나 배포 기록을 추가하지 않습니다.

미리보기 배포 명령:

    npm run deploy:swa -- -Environment preview

이 배포에는 별도 App Service가 필요하지 않습니다. Cosmos DB 사용량과 저장 용량에는 비용이 발생할 수 있습니다. Cosmos key는 Static Web Apps의 서버 API 설정에만 저장하며 프런트엔드 번들이나 Git에 넣지 않습니다.

## 문제 해결

- 로그인 설정 화면에 변수가 표시되면 `.env`에 Tenant ID와 SPA Client ID를 설정하고 Vite 서버를 다시 시작하세요.
- Entra redirect URI 오류가 나면 브라우저 origin과 앱 등록의 SPA redirect URI가 일치하는지 확인하세요.
- 진행 저장 경고가 표시되면 브라우저의 사이트 저장소 사용을 허용하세요. 현재 진행은 기기 간 동기화되지 않습니다.
- 랭킹 API 설정 문제는 [문제 해결 안내](docs/troubleshooting.md)를 참고하세요.
