# 작업 인수인계 정리 (2026-11-19)

작업 환경을 옮기기 전에, 이 세션에서 한 일과 남은 일을 정리한 문서입니다. 새 환경에서 Claude에게 "docs/2026-11-19-session-handoff.md 읽고 이어서 해줘"라고 하면 바로 이어갈 수 있습니다.

## 1. 프로젝트 개요
- 프로젝트: Mangostone (웹 카드 로그라이크 게임). 폴더 이름은 `Test_Git`, 압축본 이름은 `Mango_Stone`.
- 구성: React + TypeScript 모노레포 (`apps/web` Vite, `apps/api`, `apps/leaderboard-api`, `packages/game-core`).
- 배포: Azure Static Web Apps, Entra 로그인, Cosmos DB 리더보드.
- 작업 방식: `AGENTS.md`의 3단계 워크플로를 따릅니다.
  1. `/grill-me <기능명>`: 질문을 한 번에 하나씩 하며 결정 사항을 `.memory/decisions/`에 저장
  2. `/memory-plan <기능명>`: 코드 없이 `.memory/plans`, `.memory/phases`에 계획과 작업 청사진 작성, `.memory/current.md` 설정
  3. `/memory-execute`: `current.md`가 가리키는 작업을 하나씩 구현, 검증, 커밋, 포인터 전진

## 2. 이번 세션에서 한 일 (시간순)
1. **게임 밸런스**: 시뮬레이션 봇으로 클래스 밸런스를 측정하고 조정했습니다. 기록은 `docs/balance/`에 있습니다.
2. **난이도 상향**: 난이도를 올리고 후속 조정을 했습니다.
3. **주문/영웅 능력 효과**: 고유 효과 35개를 추가했습니다.
4. **푸시와 배포**: 실행했고, 가짜 배포 기록 문제를 고쳤습니다.
5. **변경 이력 HTML**과 적 스탯 보너스에 대한 답변을 정리했습니다.
6. **취소한 grill-me**: "스탯 의존도 낮추기"는 취소했고, 난이도는 현재 상태를 유지합니다.
7. **발표 자료**: 웹앱 환경과 Mangostone 소개 슬라이드 20장을 Slides 아티팩트로 만들었습니다 (코딩 경험 없이 grill-me/memory-plan/memory-execute로 만든 점을 강조). 링크: https://claude.ai/artifact/LRQU3SBnrjpk2iLdWLhvSg (공유 전까지 비공개, 화면으로 직접 확인하지 못했습니다)
8. **카드 상세보기와 터치 드래그** (계획 `2026-11-19-card-details-and-touch-drag`, 작업 10개 모두 완료):
   - PC: 버릴 카드 선택 화면(손패 초과, 덱 초과)에서 카드에 마우스를 올리면 220×320 고정 크기 미리보기가 나옵니다. 새로 추가된 카드 줄에도 적용됩니다.
   - 모바일: 한 번 탭하면 어디서든 카드 상세보기가 열립니다 (손패, 양쪽 필드, 보상, 버리기 선택). 길게 눌렀을 때 뜨던 이미지 저장 메뉴는 막았습니다.
   - 모바일에서 카드를 내거나 공격하려면 드래그합니다. PC와 같은 규칙이 적용되고, 놓을 수 있는 곳은 강조 표시됩니다. 손패는 가로 스와이프(스크롤)와 세로 드래그를 손가락 방향으로 구분합니다.
   - 보상과 버리기는 상세보기 안의 "이 카드 받기", "이 카드 버리기" 버튼으로 확정합니다. 상세보기는 빈 곳이나 × 를 눌러 닫습니다.
   - 튜토리얼과 게임 가이드는 모바일에서 드래그 안내 문구로 바뀝니다.
   - 암살자 영웅 능력은 모바일에서 버튼을 누른 뒤 대상을 탭하는 방식을 유지합니다 (D08, 사용자가 확인하지 않은 기본값).
9. 질문 답변: 리모트컨트롤은 연결 자체로 토큰을 더 쓰지 않고, 대화가 길어질수록 많이 씁니다. 공식 문서로 확인한 내용은 아닙니다.

## 3. 현재 상태
- 마지막 커밋: `6c4f973 docs: close out card details and touch drag`
- 빌드, 린트, 테스트(1095개, 파일 97개) 통과.
- **푸시와 배포는 아직 하지 않았습니다.** 로컬 커밋만 있습니다.
- `.memory/current.md`: 계획 완료, 활성 작업 없음.

### 주요 구현 위치 (터치/상세보기)
| 파일 | 역할 |
| :--- | :--- |
| `apps/web/src/components/CardInspection.tsx` | 호버 미리보기, 탭 상세보기, 길게 누르기 메뉴 차단 |
| `apps/web/src/components/CardDetailsPopup.tsx` | 상세보기 팝업, 선택/버리기 액션 버튼 |
| `apps/web/src/components/cardPreviewRect.ts` | 미리보기 위치/크기 계산 (scaled, fixed) |
| `apps/web/src/components/useTouchDrag.tsx`, `touchDrag.ts` | 손가락 드래그 훅, 놓을 대상 판정 |
| `apps/web/src/game/dropRules.ts` | 드롭 규칙 공용화 (PC와 터치 공유) |
| `apps/web/src/game/inputMode.ts` | 터치 기기 감지 |
| `apps/web/src/styles/board.css` | 미리보기, 드래그 고스트, 드롭 강조 스타일 |

## 4. 남은 일 (요청된 건 아님)
1. **폰에서 직접 확인**: 체크리스트 10개는 `.memory/phases/2026-11-19-card-details-and-touch-drag/P04-guidance-and-verification/T02-audit-and-close-out.md`에 있습니다. 이 세션에서는 폰이나 브라우저로 확인하지 못했습니다. 확인 못 한 것은 다음과 같습니다.
   - 미리보기, 팝업, 드래그 고스트, 강조 표시가 실제로 어떻게 보이는지
   - `touch-action` 동작 (손패 스와이프와 세로 드래그 구분, 드래그 중 화면이 스크롤되지 않는지)
   - iOS Safari, Android Chrome에서 이미지 저장 메뉴가 실제로 안 뜨는지
   - 포인터 캡처와 드래그 직후 클릭 처리
2. 확인 후 이상이 없으면 **푸시와 배포(버전업)** 를 진행합니다.
3. D08(암살자 영웅 능력: 버튼 후 대상 탭)을 사용자가 확정해야 합니다.
4. 이전 계획의 효과 시각/오디오 검토가 대기 중입니다.
5. **Azure 토큰을 교체**하세요. 세션 중에 노출된 적이 있습니다.
6. 간헐적으로 실패한 테스트가 한 번 있었는데 원인을 찾지 못했습니다.

## 5. 새 환경에서 시작하기
```powershell
cd Mango_Stone
npm install
npm run build   # 먼저 실행 (dist에 컴파일된 테스트 사본이 생김)
npm test
npm run lint
npm run dev     # 같은 와이파이의 폰에서 LAN 주소로 접속해 확인
```
- 검증 순서는 build, test, lint입니다.
- `.env`는 압축본에 포함했습니다. 보안상 다른 곳에 공유하지 마세요.
- 압축본에서는 `node_modules`, `dist`, `coverage`를 뺐습니다. `npm install`로 다시 설치합니다.

## 6. 주의할 점 (이 PC 환경에서 겪은 일)
- `python`은 Windows 스토어 스텁이라 아무 일도 안 하고 성공처럼 끝납니다. 스크립트 편집은 `node`나 Edit 도구를 쓰세요. 이 때문에 작업 기록 갱신이 조용히 실패한 적이 있습니다.
- 작업 폴더에 관련 없는 수정/미추적 `.memory` 파일이 많습니다 (줄바꿈 CRLF 경고 포함). 커밋할 때는 `git add .memory/plans` 같은 폴더 단위가 아니라 파일 경로를 하나씩 지정하세요.
- 작업 트리의 `local-work.patch`와 `.agents/`는 커밋되지 않은 파일입니다.
- jsdom에는 `elementFromPoint`와 `setPointerCapture`가 없어서 테스트에서는 스텁으로 처리합니다.
- ESLint의 react-refresh 규칙 때문에 컴포넌트 파일은 컴포넌트만 export해야 합니다.
