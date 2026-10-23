# 보드형 카드 로그라이크

React로 만든 어두운 판타지 보드형 1인용 카드 전투 게임입니다. 세 페이즈의 원정을 진행하며, 전투 승리 보상으로 덱을 강화합니다. 사내 계정으로 로그인하고 원정 데이터를 저장하려면 Microsoft Entra와 Azure Cosmos DB 연결이 필요합니다.

## 개발 환경

- Node.js 24 LTS (`package.json`의 지원 범위: `>=24 <25`)
- npm (Node.js에 포함)

## 로컬 개발 실행

모든 로컬 개발은 사내 Entra 로그인과 Cosmos DB 연결을 사용하는 Azure 개발 모드로 실행합니다.

1. 저장소 루트에서 의존성을 설치하고 환경 파일을 만듭니다.

   ```powershell
   npm install
   Copy-Item .env.example .env
   notepad .env
   ```

2. 회사 Azure 운영자에게 받은 아래 6개 값을 `.env`에 입력합니다.

   - `ENTRA_TENANT_ID`
   - `ENTRA_API_AUDIENCE`
   - `VITE_ENTRA_TENANT_ID`
   - `VITE_ENTRA_CLIENT_ID`
   - `VITE_ENTRA_API_SCOPE`
   - `COSMOS_ENDPOINT`

   로컬 주소 `http://localhost:5173`가 SPA 앱 등록의 redirect URI에 포함되어야 합니다. 로컬에서 사용하는 Azure 계정에도 Cosmos DB 데이터 권한이 필요합니다. 자세한 내용은 [Azure 설정 및 운영 안내](docs/azure-setup.md)를 참고하세요.

3. 저장소 루트에서 개발 서버를 시작합니다.

   ```bash
   npm run dev
   ```

   브라우저에서 [http://localhost:5173](http://localhost:5173)을 엽니다. 개발 서버를 종료하려면 실행 중인 터미널에서 `Ctrl+C`를 누릅니다.

여섯 값 중 하나라도 비어 있으면 `npm run dev`는 누락된 환경 변수 이름을 표시하고 종료합니다. 설정을 채우지 않은 상태에서는 웹 서버나 API 서버가 시작되지 않습니다. `PORT`, `COSMOS_DATABASE`, `COSMOS_CONTAINER`는 기본값이 있어 Azure 인증 설정을 대체하지 않습니다.

`.env`는 Git에서 제외됩니다. `VITE_`로 시작하는 값은 브라우저 번들에서 공개되므로 client secret, access token, Cosmos key를 입력하지 마세요. Cosmos 연결은 승인된 Azure 자격 증명을 사용합니다.

## 검증과 production build

```bash
npm test
npm run lint
npm run build
```

빌드는 공유 게임 엔진, API, React 앱 순서로 생성합니다. `npm start`는 빌드된 API와 웹 앱을 production 방식으로 실행합니다. 실제 Azure 배포 절차와 smoke check는 [Azure 설정 및 운영 안내](docs/azure-setup.md)를 따르세요.

## 문제 해결

- `Azure development configuration is incomplete`가 나타나면 출력된 누락 변수에 회사 운영자가 제공한 값을 입력하세요.
- Entra redirect URI 오류가 나면 앱 등록에 `http://localhost:5173`가 등록되어 있는지 확인하세요.
- Cosmos 접근 오류가 나면 로컬 Azure 계정에 해당 데이터베이스의 데이터 권한이 있는지 운영자에게 확인하세요. 계정 key로 우회하지 마세요.
- 로그인, Cosmos 저장, 세션 잠금 문제는 [문제 해결 안내](docs/troubleshooting.md)를 참고하세요.
