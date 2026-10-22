# 보드형 카드 로그라이크

React로 만든 어두운 판타지 보드형 1인용 카드 전투 게임입니다. 기본 덱과 3페이즈 전투를 브라우저에서 플레이할 수 있습니다. 실제 사내 개발 모드에서는 Microsoft Entra 계정으로 로그인하고, 진행 중인 원정을 Azure Cosmos DB에 저장합니다.

## 개발 환경

- Node.js 24 LTS (`package.json`의 지원 범위: `>=24 <25`)
- npm (Node.js에 포함)

## 빠른 로컬 데모

Azure 계정이나 `.env` 설정 없이 저장소 루트에서 실행합니다.

```bash
npm install
npm run dev
```

Azure 연동 설정 6개가 모두 비어 있으면 launcher가 API 서버를 시작하지 않고 Vite 프런트엔드만 데모 모드로 엽니다. `.env`가 없거나 `.env.example`을 복사한 뒤 값을 비워둔 상태여도 됩니다. 브라우저에서 다음 주소를 엽니다.

```text
http://localhost:5173
```

화면의 `로컬 데모 · 저장 안 됨` 안내처럼 데모 진행은 서버나 브라우저 저장소에 기록되지 않습니다. 새로고침하면 초기 메뉴부터 시작합니다. 이 주소는 같은 PC에서만 접속할 수 있습니다. 개발 서버를 종료하려면 실행 중인 터미널에서 `Ctrl+C`를 누릅니다.

Azure 설정 중 일부만 입력하면 데모로 자동 전환하지 않습니다. launcher가 `Azure development configuration is incomplete. Missing: ...`와 누락 변수 목록을 표시하고 멈춥니다. 모든 연동 설정이 들어 있을 때만 `npm run dev`가 API와 프런트엔드를 함께 시작합니다.

## 사내 Entra 및 Cosmos 개발 모드

회사 관리자에게 아래 값을 받은 뒤 저장소 루트에 `.env`를 만들고 입력합니다.

```powershell
Copy-Item .env.example .env
notepad .env
```

연동에 필요한 값은 다음 6개입니다.

- `ENTRA_TENANT_ID`
- `ENTRA_API_AUDIENCE`
- `VITE_ENTRA_TENANT_ID`
- `VITE_ENTRA_CLIENT_ID`
- `VITE_ENTRA_API_SCOPE`
- `COSMOS_ENDPOINT`

추가로 SPA redirect URI에 `http://localhost:5173`이 등록되어야 하며, 로컬 사용자 계정에 Cosmos 데이터 권한이 있어야 합니다. 필요한 값과 Azure 리소스 설정은 [Azure 설정 문서](docs/azure-setup.md)를 확인하세요. 여섯 값이 모두 설정된 상태에서 `npm run dev`를 실행하면 Entra 인증과 Cosmos 저장을 사용하는 개발 모드가 시작됩니다.

`VITE_` 값은 빌드된 브라우저 코드에서 공개되므로 tenant ID, client ID, API scope만 사용하고 client secret, access token, Cosmos key는 입력하지 마세요. `.env`는 Git에서 제외됩니다.

## 검증과 production build

```bash
npm test
npm run lint
npm run build
```

빌드는 공유 게임 엔진, API, React 앱 순서로 생성합니다. `npm start`는 빌드된 API와 웹 앱을 production 방식으로 실행하며 로컬 데모 fallback을 하지 않습니다. 실제 Azure 배포 절차와 smoke check는 [Azure 설정 및 운영 안내](docs/azure-setup.md)를 따르세요.

## 문제 해결

- `Azure development configuration is incomplete`가 나타나면 출력된 변수 목록 중 값을 입력하지 않은 항목을 확인하세요. 사내 계정으로 실제 저장 개발을 하려면 6개 변수를 모두 받아야 합니다.
- 데모 화면에서 새로고침 후 진행이 초기화되는 것은 의도된 동작입니다.
- 로그인, Cosmos 저장, 세션 잠금 문제는 [문제 해결 안내](docs/troubleshooting.md)를 참고하세요.
