# 보드형 카드 로그라이크

회사 Microsoft Entra 계정으로 로그인해 플레이하는 React 기반 1인용 카드 전투 게임입니다. 진행 중인 원정은 Azure Cosmos DB에 저장되며, 같은 계정의 다른 기기에서 이어할 수 있습니다. Azure 구성은 [설정 및 배포 안내](docs/azure-setup.md)를 참고하세요.

## 개발 환경

- Node.js 24 LTS (`package.json`의 지원 범위: `>=24 <25`)
- npm (Node.js에 포함)
- 로컬 Entra 로그인과 Cosmos DB 저장을 사용하려면 회사 관리자가 제공한 테넌트·앱 등록 값과 Cosmos 접근 권한

## 로컬 실행

저장소 루트에서 의존성을 설치하고 환경 파일을 준비합니다.

```bash
npm install
cp .env.example .env
```

Windows PowerShell에서는 환경 파일 복사에 다음 명령을 사용할 수 있습니다.

```powershell
Copy-Item .env.example .env
```

`.env`의 값을 회사 관리자에게 받은 정보로 채웁니다. 브라우저에서 사용하는 `VITE_` 값은 빌드 시 프런트엔드에 포함되므로 비밀 값이 아닌 테넌트·앱 ID·scope만 입력하세요. client secret이나 access token을 저장소에 넣지 마세요. 필요한 변수와 Cosmos 권한은 [Azure 설정 문서](docs/azure-setup.md#1-entra-앱-등록-값-준비)에 설명되어 있습니다.

개발 서버를 실행합니다.

```bash
npm run dev
```

브라우저에서 Vite가 출력한 주소(기본 `http://localhost:5173`)를 엽니다. API는 로컬 `3001` 포트에서 실행되고, 프런트엔드의 `/api` 요청은 개발 서버가 API로 전달합니다. 로컬 API가 Cosmos DB에 저장할 때는 Azure Identity의 기본 자격 증명 체인을 사용하므로, 회사에서 허용한 로컬 Azure 로그인과 Cosmos 데이터 권한이 필요합니다.

## 검증 및 프로덕션 빌드

```bash
npm test
npm run build
```

빌드는 공유 게임 엔진, API, React 앱 순서로 생성합니다. 프로덕션 실행은 `npm start`이며 API가 빌드된 웹 앱도 함께 제공합니다. Azure 배포 절차와 smoke check는 [Azure 설정 및 운영 안내](docs/azure-setup.md)를 따르세요.

## 문제 해결

로그인, 저장, 세션 잠금 오류는 [문제 해결 안내](docs/troubleshooting.md)를 확인하세요.
