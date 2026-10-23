# Task: T01 Windows용 release ZIP 생성기

## Status: done

## Goal

Windows 개발자가 전체 테스트와 production build를 끝낸 다음, Linux App Service용 배포 ZIP을 반복 생성할 수 있도록 허용 목록 기반 PowerShell 패키징 명령을 제공한다. 패키지에 `.env`, `.git`, `node_modules`, `.memory`가 들어가지 않게 한다.

## Decision Summary

- ZIP은 Azure CLI의 `az webapp deploy --type zip`으로 수동 업로드한다.
- ZIP root에는 저장소 폴더 자체가 아니라 애플리케이션의 root `package.json`과 workspace 경로가 직접 들어간다.
- `SCM_DO_BUILD_DURING_DEPLOYMENT=true`를 App Service에 설정해 Linux 환경이 의존성 설치와 workspace build를 수행하도록 한다.

## Implementation

### I01. 허용 목록 기반 배포 패키지

- Related Files:
  - `scripts/package-release.ps1` :: release artifact creation; new
  - `package.json` :: `package:release` script; modify
  - `.gitignore` :: `artifacts/` output exclusion; modify

#### Details

- `npm run package:release`에서 PowerShell 스크립트를 호출한다. 스크립트는 Windows PowerShell을 대상으로 하고 저장소 루트를 작업 디렉터리로 사용하며 Node.js 24/npm 존재 여부를 확인한다.
- 스크립트는 `npm run build`를 먼저 실행하고 실패 시 중단한다. 실행 전에 기존 `artifacts/release-staging`을 제거할 경우, 삭제 대상의 절대경로가 저장소 아래 staging 디렉터리와 정확히 일치하는지 확인한 다음 해당 디렉터리만 제거한다.
- ZIP 출력 경로는 `artifacts/board-card-roguelike-release.zip`이다. staging root에 다음을 복사한다: root `package.json`, `package-lock.json`, `tsconfig.base.json`, `apps/api`, `apps/web`, `packages/game-core`. 각 workspace의 source/package metadata와 생성된 `dist`를 포함해 Azure Oryx가 `npm install` 및 root `npm run build`를 수행할 수 있게 한다.
- 명시적 allowlist 밖의 파일은 복사하지 않는다. 앱/workspace 하위 경로 복사에서도 `.env`, `.env.*`, `.git`, `.agents`, `.memory`, `node_modules`, `tmp`, 기존 `artifacts`를 재귀적으로 제외한다. ZIP 내부 첫 경로 요소가 `project-memory-starter(KJH)/` 같은 추가 상위 폴더가 아닌 `package.json`, `apps/`, `packages/`인지 확인한다.
- 압축은 `Compress-Archive`로 수행하고 기존 ZIP이 있으면 staging 검증 후 같은 artifact 경로의 이전 ZIP만 교체한다. 원본 작업 파일과 `.env`는 읽기만 하며 변경/삭제하지 않는다.
- `.gitignore`에는 생성물 `artifacts/`를 추가한다. 환경 ID와 client ID는 app settings와 프런트 번들에 쓰이는 공개 식별자일 수 있으나, 이 스크립트는 `.env`를 artifact에 복사하지 않는다.

- ZIP 생성 직후 `[System.IO.Compression.ZipFile]`로 artifact를 다시 열어 root/workspace manifest와 `apps/api/dist`, `apps/web/dist`, `packages/game-core/dist` 존재 여부를 검증한다.
- 같은 검증에서 `.env*`, `.git`, `node_modules`, `.memory`, `tmp` 경로가 없고 ZIP root에 불필요한 상위 directory가 없는지 확인한다. 검증 실패 시 생성 ZIP을 제거하고 exit code 1로 끝낸다.
- production build 또는 staging 검증 실패 시 기존 정상 artifact를 덮어쓰지 않는다.

## Acceptance Criteria

- [x] `npm run package:release`가 build 후 `artifacts/board-card-roguelike-release.zip`을 만든다.
- [x] ZIP 내부에는 workspace source/metadata 및 세 workspace의 build output이 있고 root에 추가 wrapper directory가 없다.
- [x] `.env`, `.env.local`, `.git`, `node_modules`, `.memory`, `tmp`가 ZIP에 없다.
- [x] 생성물은 Git status에 표시되지 않는다.

## Validation

- `npm run package:release` — production build 및 로컬 artifact 생성 성공.
- `npm run build` — 기존 production build 계속 통과.

## Commit Message

```text
build(release): create a safe App Service deployment zip

Plan: 2026-10-23-production-azure-deployment
Phase: P02-manual-app-service-release
Task: T01-release-zip-packager

- Package the built workspaces using an explicit allowlist
- Exclude credentials, local dependencies, and memory files
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: 4fd1a2d
