# Decisions: 로컬 브라우저 데모 모드

- Date: 2026-10-22
- Status: Confirmed

## D01. 데모 접근 범위
- **Chosen**: 데모는 개발자 PC의 `localhost`에서만 사용한다. 공개 인터넷 주소로 배포하지 않는다.
- **Rationale**: 로그인 없는 임시 플레이를 빠르게 시험하려는 목적이다. 외부 공개 시 접근 제어가 없으므로 로컬 전용으로 제한한다.

## D02. 실행 모드 자동 선택
- **Chosen**: `npm run dev` 실행 시 Azure 인증·저장 설정이 전부 비어 있으면 로컬 데모 모드로 시작한다. Azure 관련 설정이 일부만 있으면 자동으로 데모로 낮추지 않고 누락 설정 오류를 표시한다. 설정이 모두 있으면 기존 사내 Entra 및 Cosmos 연결 흐름을 사용한다.
- **Rationale**: 빈 `.env`로도 간편하게 플레이할 수 있게 하면서, 운영 설정을 잘못 입력한 경우 인증 우회처럼 보이는 데모 모드로 조용히 전환되지 않게 한다.
- **Detection Inputs**: `ENTRA_TENANT_ID`, `ENTRA_API_AUDIENCE`, `VITE_ENTRA_TENANT_ID`, `VITE_ENTRA_CLIENT_ID`, `VITE_ENTRA_API_SCOPE`, `COSMOS_ENDPOINT`. 설정의 값이 빈 문자열인지 판단하며 `.env.example`의 기본 `PORT`, `COSMOS_DATABASE`, `COSMOS_CONTAINER`는 인증/DB 연결 자격 설정으로 보지 않는다.

## D03. 데모 인증과 게임 상태
- **Chosen**: 로컬 데모는 Entra 로그인을 요구하지 않고 API/Cosmos DB를 호출하지 않는다. 기존 `packages/game-core` 게임 엔진과 브라우저 메모리 상태를 사용한다. 브라우저를 새로고침하면 진행 상태가 초기화된다.
- **Rationale**: 실제 인증·DB 접근 권한 없이 카드 전투를 시험할 수 있고, 영속 저장을 구현하지 않아도 임시 테스트 목적을 충족한다.

## D04. 데모 모드 안내 표시
- **Chosen**: 데모 화면에 `로컬 데모 · 저장 안 됨`임을 명확히 표시한다.
- **Rationale**: 새로고침 시 진행이 초기화되고 사내 계정이나 서버에 저장되지 않는다는 점을 플레이 전에 알린다.

## D05. 실제 인증 경로 보호
- **Chosen**: 데모 진입은 개발용 `npm run dev`에서만 허용한다. 프로덕션 `npm start` 및 Azure 배포에는 데모 fallback을 넣지 않으며, 기존 Entra 인증과 Cosmos 저장을 계속 요구한다.
- **Rationale**: 로컬 편의를 위한 인증 우회가 운영 앱에 노출되지 않게 경로를 분리한다.
