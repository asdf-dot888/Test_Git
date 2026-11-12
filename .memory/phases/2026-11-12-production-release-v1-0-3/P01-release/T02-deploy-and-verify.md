# Task: T02 Deploy and Verify

## Status: done

## Goal
Publish v1.0.3 to production, record the successful release, push Git metadata, and verify the live site.

## Decision Summary
- Use the existing production deployment script and Azure Static Web Apps resource.
- Temporarily stash unrelated local work to satisfy the clean-tree gate, then restore it.

## Implementation

### I01. Clean deployment workspace
- Related Files:
  - `.env` :: ignored Entra public identifiers; read-only.
  - repository worktree :: stash unrelated tracked and untracked files, retaining ignored `.env`.
- Preconditions: main has upstream `origin/main`; `.env` contains both public identifiers; source gates passed.
- Error handling: if stash, build, upload, metadata commit, or push fails, preserve the recoverable state and report the exact stage.

### I02. Production deployment and release metadata
- Related Files:
  - `scripts/deploy-static-web-app.ps1` :: existing production pipeline; execute read-only.
  - `package.json` :: version becomes 1.0.3 after Azure upload succeeds.
  - `package-lock.json` :: root version becomes 1.0.3 after Azure upload succeeds.
  - `deployments.json` :: append v1.0.3, UTC deployment time, and source commit.
- Flow: build candidate v1.0.3, stage managed API, upload production, update metadata, create `chore(release): v1.0.3`, push main.

### I03. Verification and restore
- Verify the production URL responds and its JavaScript bundle contains v1.0.3.
- Restore the unrelated local stash and confirm its files remain present.

## Acceptance Criteria
- [x] Azure production deployment reports success.
- [x] `package.json`, lock file, and deployment history record v1.0.3.
- [x] Release commit is pushed to `origin/main`.
- [x] Live site serves v1.0.3.
- [x] Unrelated local work is restored.

## Validation
- `npm.cmd run deploy:swa`
- `git log -1 --oneline`
- `git status -sb`
- production HTTP and bundle version check.

## Commit Message
```text
docs: close production release v1.0.3

Plan: 2026-11-12-production-release-v1-0-3
Phase: P01-release
Task: T02-deploy-and-verify
```

## Progress
- [x] deployment complete: `https://mango-stone-0631f0d00.5.azurestaticapps.net`
- [x] verification passed: HTTP 200, live bundle contains v1.0.3, unauthenticated leaderboard returns 401.
- release commit: `646eb6a20507bdcf6afa72a33135126dce92142c`
- source commit: `e75559a4dc8ac94e776d0c6f98eeffc679a6af70`
