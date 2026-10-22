# Task: T03 로컬 데모 실행 문서

## Status: done

## Goal
새 개발자가 회사 인증 정보 없이 로컬 데모를 실행하고, 데모와 실제 Entra/Cosmos 개발 모드의 차이를 README에서 구분할 수 있게 한다.

## Decision Summary
- 설정 없는 개발 실행은 `npm run dev`이며 기본 주소 `http://localhost:5173`이다. 데모 상태는 브라우저 저장소나 server DB에 보관하지 않는다.
- Azure 설정이 모두 있을 때만 같은 명령이 실제 API+웹 개발 서버를 실행한다. 부분 설정은 오류이므로 README에서 설정 누락 메시지 확인 방법을 안내한다.

## Implementation

### I01. README 로컬 실행 절차
- Related Files:
  - `README.md` :: 개발 환경/실행/문제해결 — starter 문서를 앱 실행 안내로 교체 또는 기존 섹션 수정; modify
  - `.env.example` :: env names/defaults — 실제 이름과 대조; read-only unless stale

#### Details
- README의 실행 절차는 Node.js 24 LTS와 npm을 먼저 안내하고 root에서 `npm install` 또는 lockfile 기준 설치 후 `npm run dev`를 실행한다.
- Azure 변수 6개(`ENTRA_TENANT_ID`, `ENTRA_API_AUDIENCE`, `VITE_ENTRA_TENANT_ID`, `VITE_ENTRA_CLIENT_ID`, `VITE_ENTRA_API_SCOPE`, `COSMOS_ENDPOINT`)가 모두 빈 경우 demo를 연다고 적는다. `.env.example` 복사 후 빈 값을 유지해도 로컬 데모를 실행할 수 있다고 안내한다.
- 실행 주소 `http://localhost:5173`, 종료 `Ctrl+C`, 배너 의미, 새로고침 시 초기화, 공개 인터넷에서 접속되지 않는 점을 쓴다.
- 여섯 변수 일부만 입력했을 때는 데모 대신 누락 변수 오류가 난다고 안내한다. 실제 사내 인증 개발에는 여섯 변수를 회사 관리자에게 받아 설정하고 Cosmos 권한을 준비해야 한다고 분리해 설명한다.
- `npm run build`, `npm test`, `npm run lint` 명령과 API production `npm start`가 로컬 데모 fallback을 하지 않는다는 점을 남긴다.
- secret, 토큰, Cosmos key를 문서 예시나 저장소에 넣지 않는다. `.env.example`은 dummy/빈 값만 허용한다.

## Acceptance Criteria
- [ ] 신규 개발자가 README만 보고 Azure 계정 없이 localhost 데모를 시작할 수 있다.
- [ ] 로컬 데모와 Entra/Cosmos 개발 실행의 자동 선택 조건이 정확히 구별된다.
- [ ] 새로고침 초기화 및 데모 비영속 안내가 사용자에게 보인다.
- [ ] 실제 tenant 값, client secret, token, Cosmos endpoint를 문서에 추가하지 않는다.

## Validation
- 수동 검토: 변수명/스크립트/주소를 `package.json`, `.env.example`, T01 launcher와 대조한다.
- `npm run build` — 문서 변경 후 production build 통과.
- `npm test` — 전체 workspace 테스트 통과.

## Commit Message
```text
docs(dev): explain local demo and Azure development modes

Plan: 2026-10-22-local-browser-demo
Phase: P01-local-demo-mode
Task: T03-demo-runbook

- Document no-credential browser demo startup
- Clarify Azure configuration fallback and reload behavior
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: pending
