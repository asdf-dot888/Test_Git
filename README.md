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

## 밸런스 시뮬레이션

카드·직업·적 수치를 바꾼 뒤에는 시뮬레이션 봇으로 직업별 승률을 측정할 수 있습니다. 봇은 게임 엔진의 공개 함수만 사용해 원정 전체를 자동으로 플레이하며, 개발 전용이라 웹 번들에는 포함되지 않습니다. 봇은 사람보다 약하므로 절대 승률이 아니라 직업·난이도 간 상대 차이를 비교하는 용도입니다.

```bash
npm run balance:sim -- --runs 500 --label my-change --out docs/balance/my-change.md
```

| 옵션 | 설명 |
| :--- | :--- |
| `--runs <n>` | 직업·난이도 조합마다 시뮬레이션할 원정 수 (기본 500, 런당 약 0.15초) |
| `--seed <n>` | 기본 시드 (기본 20261117). 모든 직업이 같은 시드를 사용합니다 |
| `--class <warrior\|assassin\|demonist\|all>` | 측정할 직업 (기본 all) |
| `--difficulty <normal\|hard\|all>` | 측정할 난이도 (기본 all) |
| `--out <경로>` | Markdown 리포트를 파일로 저장 (생략하면 화면에 출력) |
| `--label <이름>` | 리포트 제목에 표시할 이름 |

리포트에는 완주율, 전투 승률, 인카운터별 승률과 직업 간 격차 판정이 들어갑니다. 완주율이 0%나 100%에 가까워 직업을 비교할 수 없을 때는 전투 승률로 대체해 판정합니다. 변경 기록과 측정 결과는 `docs/balance/`에 있습니다. 샘플 수가 300런이면 오차가 약 ±5%p이므로 작은 차이를 판단할 때는 500런 이상을 사용하세요.

### 난이도 목표

수치를 바꾼 뒤에는 세 직업 평균 완주율이 목표 범위 안인지 확인합니다. 리포트의 "난이도 목표 판정" 섹션이 이를 보여 줍니다.

| 난이도 | 평균 완주율 목표 | 직업 간 격차 |
| :--- | :--- | :--- |
| 일반 | 55~65% | 5%p 이내 |
| 하드 | 6~10% | 5%p 이내 |

적 강화는 두 번째 전투부터 적용됩니다. 첫 전투(튜토리얼 포함)는 두 난이도 모두 기존 규칙을 유지합니다. 조정 수치는 `packages/game-core/src/engine.ts`의 `ENEMY_PHASE_BONUS`(난이도·페이즈별 영웅 체력, 하수인 공격력, 하수인 체력)에 있습니다. 일반 난이도 적은 하드와 같은 턴 계획 방식을 쓰지만 플레이어의 손패와 덱 순서는 보지 않습니다.

## 주문·영웅 능력 연출 미리보기

영웅 능력 3종과 주문 카드(플레이어 24장, 보스 전용 8장) 35개에는 각각 고유한 연출과 소리가 있습니다. 연출은 CSS/SVG로, 소리는 기존 효과음 위에 Web Audio 합성 레이어로 만듭니다. 새 이미지나 오디오 파일은 쓰지 않습니다.

개발 서버를 켜고 `/?effects-preview`를 열면 로그인 없이 모든 효과를 골라서 재생해 보고, 시전자·대상·피해량·슬로 모션을 바꿔 볼 수 있습니다. 이 페이지는 개발 서버에서만 열리며 프로덕션 빌드에는 포함되지 않습니다.

```bash
npm run dev
# 브라우저에서 http://localhost:5173/?effects-preview 열기
```

효과 등록 위치는 `apps/web/src/game/spellEffects/`(스펙과 소리 레시피, 글리프)이고, 레지스트리는 `spellEffectCatalog.ts`, `soundRecipes.ts`, `spellEffectMotifs.tsx`입니다. 새 주문 카드를 추가하면 `spellEffectContent.test.ts`의 완전성 검사가 연출이 등록될 때까지 실패합니다.

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
