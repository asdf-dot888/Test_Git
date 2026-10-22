# Task: T01 개발 모드 선택과 실행 launcher

## Status: done

## Goal
루트 `npm run dev`가 Azure 설정값이 전혀 없을 때 프런트엔드만 데모 모드로 시작하고, 설정 일부 누락 시 실행을 중단하며, 설정이 모두 있을 때 기존 API+웹 개발 서버를 실행하도록 한다.

## Decision Summary
- 설정 판별 대상은 `ENTRA_TENANT_ID`, `ENTRA_API_AUDIENCE`, `VITE_ENTRA_TENANT_ID`, `VITE_ENTRA_CLIENT_ID`, `VITE_ENTRA_API_SCOPE`, `COSMOS_ENDPOINT`다. 기본값 `PORT`, `COSMOS_DATABASE`, `COSMOS_CONTAINER`는 인증/접속 자격 증명 여부 판정에서 제외한다.
- Azure 키가 모두 비었으면 API를 실행하지 않는다. 일부만 설정되면 실행 실패, 모두 설정되면 기존 인증 개발 흐름이다. `.env.local`과 `.env`를 읽고 이미 프로세스에 설정된 환경변수를 우선한다.

## Implementation

### I01. 순수 개발 모드 판별기와 테스트
- Related Files:
  - `scripts/dev-mode.mjs` :: `AZURE_DEV_REQUIRED_KEYS`, `resolveDevelopmentMode` — 설정 분기 규칙; new
  - `scripts/dev-mode.test.mjs` :: 모드 판별 케이스 — 단위 검증; new

#### Details
- **Signatures & Types**:
  ```javascript
  export const AZURE_DEV_REQUIRED_KEYS = [
    "ENTRA_TENANT_ID",
    "ENTRA_API_AUDIENCE",
    "VITE_ENTRA_TENANT_ID",
    "VITE_ENTRA_CLIENT_ID",
    "VITE_ENTRA_API_SCOPE",
    "COSMOS_ENDPOINT",
  ];

  export function resolveDevelopmentMode(environment = process.env) {
    // returns { mode: "demo", missing: [] }
    //       | { mode: "azure", missing: [] }
    //       | { mode: "invalid", missing: string[] }
  }
  ```
- 각 key의 `undefined` 또는 `trim()===""` 값은 미설정으로 취급한다. 0개 설정됨 → `{mode:"demo", missing:[]}`; 6개 설정됨 → `{mode:"azure", missing:[]}`; 그 외 → `{mode:"invalid", missing:[누락 key...]}`.
- 판별기는 파일 시스템이나 프로세스를 변경하지 않는 순수 함수로 둔다.
- 테스트는 6개 미설정, 공백 문자열만 있는 경우, 일부 설정과 누락 목록의 정확성, 전체 설정, `PORT`/database/container 기본값만 있는 경우를 포함한다.

### I02. 환경 로딩과 root 개발 명령 분기
- Related Files:
  - `scripts/dev.mjs` :: env load 및 child process 실행 — root 개발 launcher; new
  - `package.json` :: `scripts.dev`, `scripts.dev:azure` — 개발 명령 진입점; modify

#### Details
- root `dev`는 `node scripts/dev.mjs`를 실행한다.
- `dev:azure`는 기존 명령 `concurrently -k -n api,web "npm run dev --workspace @board-game/api" "npm run dev --workspace @board-game/web"`을 유지한다.
- Launcher는 저장소 root의 `.env.local` 다음 `.env`를 `node:process`의 `loadEnvFile`로 읽는다. 기존 프로세스 환경 값은 Node의 기본 우선순위를 따른다. 파일이 없으면 건너뛴다.
- `resolveDevelopmentMode`가 `invalid`이면 누락된 key 이름을 목록으로 출력하고 자식 프로세스를 시작하지 않은 채 exit code 1로 종료한다.
- `demo`이면 `npm run dev --workspace @board-game/web`만 자식 프로세스로 실행하고 환경변수 `VITE_DEMO_MODE=true`를 전달한다. API workspace는 시작하지 않는다.
- `azure`이면 `VITE_DEMO_MODE`를 자식 환경에서 제거하고 `npm run dev:azure`를 실행한다. 플랫폼별 npm 실행은 Windows에서 `npm.cmd`, 다른 OS에서 `npm`을 사용하고, 종료 신호/exit code를 parent에 전달한다.
- 개발 launcher에는 `process.env.NODE_ENV !== "production"` 검사를 두고 production으로 실행을 요청하면 데모 분기 전 중단한다. 운영 `npm start`는 이 launcher를 사용하지 않는다.

### I03. 모드 판별 단위 검증
- Related Files:
  - `scripts/dev-mode.test.mjs` :: `resolveDevelopmentMode` cases — 설정 누락/완료 경계 검증; new

#### Details
- Vitest로 pure resolver를 직접 호출한다. 실제 npm child process나 회사 환경변수를 수정하지 않는다.
- 완전 빈 환경은 demo, 부분 설정은 invalid와 정렬된 누락 목록, 완전 설정은 azure를 기대한다.

## Acceptance Criteria
- [ ] 설정 관련 여섯 값이 모두 비어 있으면 root `npm run dev`가 API를 띄우지 않고 Vite만 시작하며 `VITE_DEMO_MODE=true`를 전달한다.
- [ ] 값 일부가 빠지면 정확한 누락 변수 이름을 표시하고 종료 코드 1로 종료한다.
- [ ] 값이 모두 있으면 기존 API와 웹 동시 실행 흐름을 유지한다.
- [ ] `PORT`, `COSMOS_DATABASE`, `COSMOS_CONTAINER` 기본값만으로 Azure 모드로 판정하지 않는다.
- [ ] production에서 launcher가 데모 모드로 실행되지 않는다.

## Validation
- `npm test -- scripts/dev-mode.test.mjs` — 모드 판별 경계 케이스 통과.
- `npm run lint` — launcher 및 테스트 포함 lint 오류 없음.
- `npm run build` — 기존 앱 production build 통과.

## Commit Message
```text
feat(dev): select local demo when Azure config is empty

Plan: 2026-10-22-local-browser-demo
Phase: P01-local-demo-mode
Task: T01-dev-mode-selection

- Detect missing, partial, and complete Azure settings
- Start only Vite for the local demo flow
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: pending
