# Task: T03 Azure 인증 로컬 실행 문서

## Status: done

## Goal

README와 Azure 운영 문서에서 로그인 없는 로컬 데모 안내를 제거하고, 사내 Entra와 Cosmos 연결이 완전한 경우에만 `npm run dev`를 사용할 수 있음을 문서화한다.

## Decision Summary

- 개발자는 사내 관리자로부터 여섯 Azure 설정값과 개발 계정의 Cosmos 데이터 권한을 받아야 한다.
- `.env`는 개발자 로컬에만 두며 Git 또는 배포 ZIP에 포함하지 않는다.

## Implementation

### I01. README 및 Azure 문서 갱신

- Related Files:
  - `README.md` :: 빠른 로컬 데모, Entra/Cosmos 개발 모드, 문제 해결; modify
  - `docs/azure-setup.md` :: 로컬 redirect URI, 환경 변수, 개발자 Cosmos 권한; modify
  - `.env.example` :: 변수명과 빈 예시; read-only unless existing names are inconsistent

#### Details

- README에서 “Azure 계정이나 `.env` 없이 실행” 및 “설정이 모두 비어 있으면 로컬 데모로 실행” 설명을 삭제한다.
- 로컬 절차는 Node.js 24, `.env.example` 복사, 다음 6개 값 설정, `npm run dev` 순으로 안내한다: `ENTRA_TENANT_ID`, `ENTRA_API_AUDIENCE`, `VITE_ENTRA_TENANT_ID`, `VITE_ENTRA_CLIENT_ID`, `VITE_ENTRA_API_SCOPE`, `COSMOS_ENDPOINT`.
- `PORT`, `COSMOS_DATABASE`, `COSMOS_CONTAINER` 기본값은 필수 인증/DB 설정의 대체값이 아님을 구별한다. 불완전한 설정에서는 개발 서버가 시작되지 않고 missing key가 출력된다.
- `docs/azure-setup.md`는 SPA redirect URI `http://localhost:5173`, delegated API scope, 개발자 계정의 Cosmos data-plane 권한, `.env`를 Git에 넣지 말라는 지침을 유지하고 데모 fallback 문장을 제거한다.
- `.env.example`에는 실제 ID, endpoint, secret을 입력하지 않는다. 기존 변수명이 결정 문서의 여섯 필수 키와 일치하면 수정하지 않는다.

## Acceptance Criteria

- [x] 신규 개발자가 README만 보고 인증 없는 로컬 실행 방법을 찾지 않는다.
- [x] `.env`가 비어 있으면 실패하고, 완전한 설정과 권한이 있어야 로컬 Entra/Cosmos 흐름이 시작된다고 설명한다.
- [x] 문서와 예시 파일에 실제 사내 식별자나 비밀값이 없다.

## Validation

- `rg -n "로컬 데모|데모 모드|VITE_DEMO_MODE|Azure 설정이 모두 비어" README.md docs/azure-setup.md .env.example` — 오래된 실행 안내 결과 없음.
- `npm run build` — 문서 변경 후 전체 production build 통과.

## Commit Message

```text
docs(dev): document Entra-only local development

Plan: 2026-10-23-production-azure-deployment
Phase: P01-azure-only-development
Task: T03-update-local-dev-docs

- Require complete Entra and Cosmos configuration for local runs
- Remove instructions for the unauthenticated demo mode
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: recorded in Git history
