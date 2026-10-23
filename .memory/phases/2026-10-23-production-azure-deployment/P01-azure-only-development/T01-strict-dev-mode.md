# Task: T01 Azure 설정 필수 개발 런처

## Status: done

## Goal

`npm run dev`가 로컬 데모를 시작하는 경로를 제거하고, 사내 Entra/API/Cosmos 설정 여섯 개가 모두 유효할 때만 기존 API와 Vite 개발 서버를 함께 시작하게 한다. 누락 설정이 있으면 누락 목록을 출력하고 하위 프로세스를 만들지 않은 채 종료 코드 1을 반환한다.

## Decision Summary

- 빈 `.env`나 `.env.example`만 복사한 상태에서도 로그인 없는 게임이 열리지 않게 한다.
- 부분 설정과 전체 설정의 구분 순서는 기존 `AZURE_DEV_REQUIRED_KEYS` 순서를 유지한다.

## Implementation

### I01. 개발 모드 판정 및 launcher

- Related Files:
  - `scripts/dev-mode.mjs` :: `AZURE_DEV_REQUIRED_KEYS`, `resolveDevelopmentMode`; modify
  - `scripts/dev.mjs` :: `.env.local`/`.env` 로딩, invalid 중단, child process 실행; modify
  - `package.json` :: `dev`, `dev:azure` 명령 계약; inspect, modify only if required to remove obsolete route

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
    // { mode: "azure", missing: [] }
    // | { mode: "invalid", missing: string[] }
  }
  ```
- `undefined`, 빈 문자열, 공백 문자열은 미설정으로 처리한다. `PORT`, `COSMOS_DATABASE`, `COSMOS_CONTAINER`의 기본값만 있는 경우도 여섯 필수 설정은 누락 상태다.
- 6개 모두 있으면 `{ mode: "azure", missing: [] }`; 그 외에는 `{ mode: "invalid", missing: [...] }`를 반환한다. `mode: "demo"` 결과는 존재하지 않는다.
- `scripts/dev.mjs`는 기존 순서대로 `.env.local`, `.env`를 읽는다. invalid면 `Azure development configuration is incomplete. Missing: ...`를 표준 오류로 출력하고 exit code 1로 종료하며 npm child process를 생성하지 않는다. azure면 `npm run dev:azure`만 실행한다.
- child environment에서 `VITE_DEMO_MODE`를 설정하거나 제거하는 코드를 삭제한다. 시그널과 종료 코드 전달 동작은 유지한다.

### I02. 판정 단위 테스트

- Related Files:
  - `scripts/dev-mode.test.mjs` :: `resolveDevelopmentMode` cases; modify

#### Details

- 빈 객체, 여섯 값이 모두 공백/누락된 환경, 일부 설정 환경은 `invalid` 및 정확한 누락 키 목록을 반환해야 한다.
- 여섯 값이 모두 있으면 `azure`를 반환한다.
- `PORT`, `COSMOS_DATABASE`, `COSMOS_CONTAINER`만 채운 환경도 여섯 필수 키가 모두 누락된 `invalid`여야 한다.

## Acceptance Criteria

- [x] Azure 설정 6개가 모두 빠지거나 일부 빠지면 launcher가 개발 서버를 실행하지 않고 누락 키를 표시한다.
- [x] 완전한 설정에서만 `npm run dev:azure`가 호출된다.
- [x] `resolveDevelopmentMode` 반환형과 테스트에 `demo` mode가 없다.

## Validation

- `npm test -- scripts/dev-mode.test.mjs` — 빈 값, 공백, 일부 및 전체 설정 테스트 통과.
- `npm run build` — 루트 빌드 명령 구성이 유지됨.

## Commit Message

```text
fix(dev): require Azure configuration for local runs

Plan: 2026-10-23-production-azure-deployment
Phase: P01-azure-only-development
Task: T01-strict-dev-mode

- Remove the empty-config demo mode
- Start API and web dev servers only with complete Azure settings
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: recorded in Git history
