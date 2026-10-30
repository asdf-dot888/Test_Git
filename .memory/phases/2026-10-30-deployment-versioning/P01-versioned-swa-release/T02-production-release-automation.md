# Task: T02 Production Release Automation

## Status: pending

## Goal

Make the existing Static Web Apps deployment publish a production bundle with the next patch version and, only after Azure confirms success, update release metadata, create a release commit, and push it to the current branch upstream.

## Decision Summary

- Only successful production deployments increment PATCH; preview deployments and failed attempts do not.
- Actual production and preview attempts require a clean working tree and configured upstream. Dry runs do not publish or record releases.
- A Git push failure after Azure success leaves Azure deployed and the release commit local, with a warning.

## Implementation

### I01. Release-history schema

- Related Files:
  - deployments.json :: root production release history; new

#### Details

- Initialize the tracked file as JSON object { "releases": [] }.
- Append exactly one record per successful production deploy:
  - version: string, semantic version such as 1.0.1
  - deployedAtUtc: string, ISO 8601 UTC timestamp such as 2026-10-30T12:34:56.000Z
  - sourceCommit: string, full 40-character Git SHA captured before deployment
- Do not add a historical row for baseline 1.0.0 because its source commit and deploy timestamp are unknown.

### I02. Preflight and candidate version selection

- Related Files:
  - scripts/deploy-static-web-app.ps1 :: parameter handling and main deployment flow; modify
  - package.json :: canonical version; read-only in this step

#### Details

- Preserve parameters -DryRun and -Environment with allowed values production and preview.
- Before every actual deployment, run git status --porcelain --untracked-files=normal. If output is non-empty, stop before build/upload with an actionable clean-tree message. Git-ignored files do not count.
- Before every actual deployment, resolve current branch upstream with Git; if absent, fail before build/upload. Capture full HEAD SHA as sourceCommit before the later release commit.
- Parse root version as non-negative SemVer numeric MAJOR.MINOR.PATCH; reject invalid versions.
- For production, candidate version increments PATCH once. For preview, selected version remains canonical current version.
- Set process VITE_APP_VERSION to selected version before npm run build and restore its prior value in finally, including on errors.
- Production dry-run may build/package the next candidate version but must not update metadata, commit, push, or count as a deployment. Preserve current artifact validation and API staging.
- Existing build and artifact checks stay before SWA upload.

### I03. Success-only recording, commit, and push

- Related Files:
  - scripts/deploy-static-web-app.ps1 :: post-deploy success path; modify
  - package.json :: root version; modify only after successful production upload
  - package-lock.json :: root lock version; modify only after successful production upload
  - deployments.json :: append successful production release record; modify only after successful production upload

#### Details

1. Run existing build, artifact validation, API staging, dependency packaging, and npx swa deploy flow without printing secrets.
2. If build, packaging, or Azure upload fails, leave package.json, package-lock.json, and deployments.json unchanged; do not commit or push.
3. If Environment is preview, report successful preview and exit without changing production metadata or invoking release Git commands.
4. After production upload succeeds, update root package and lock versions to candidate using npm version update behavior without creating an npm-owned Git commit/tag or running lifecycle scripts.
5. Append one release row with candidate version, UTC completion timestamp, and pre-deploy sourceCommit.
6. Stage only package.json, package-lock.json, and deployments.json. Commit with message chore(release): v{version}. Record the pre-release source SHA, not the new metadata commit.
7. Push current branch to its configured upstream. Do not push a tag or unrelated files.
8. If push fails, keep Azure deployment and local metadata commit successful; print a warning with release version, local commit SHA, and retry command. Do not roll back or describe Azure upload as failed.
9. Clearly distinguish deployment failure, metadata/commit failure after Azure success, and push failure after local release commit.

- State transition: canonical 1.0.0 -> candidate bundle 1.0.1 -> on Azure success, package/lock/history become 1.0.1. Build or upload failure leaves canonical version at 1.0.0.

## Acceptance Criteria

- [ ] Dirty working trees and branches without upstream are rejected before actual Azure upload.
- [ ] Production bundle contains next PATCH; preview bundle contains current canonical version.
- [ ] Failed build/upload, preview, and dry-run do not increment or append production history.
- [ ] Successful production upload updates package/lock versions and appends exactly one record.
- [ ] Release commit contains only the three metadata files and is pushed to current branch upstream.
- [ ] Push failure leaves a local release commit and reports Azure success plus Git synchronization failure.
- [ ] Existing dry-run still checks build/package output without Azure upload or release side effects.

## Validation

- npm run build — canonical-version build succeeds.
- npm run deploy:swa -- -DryRun -Environment production — builds/stages candidate without upload or metadata/Git side effects.
- npm run deploy:swa -- -DryRun -Environment preview — validates current-version preview bundle without release side effects.
- Manual preflight check: an uncommitted change is rejected before upload; a clean branch with upstream resolves its full SHA.
- Do not run a live production deployment as validation.

## Commit Message

feat(release): version successful Static Web Apps deployments

Plan: 2026-10-30-deployment-versioning
Phase: P01-versioned-swa-release
Task: T02-production-release-automation

- Enforce clean-tree and upstream checks before deployment
- Record and commit successful production version metadata
- Push release metadata while preserving Azure success on push failure

## Progress

- [ ] Implementation complete
- [ ] Validation complete
- commit: pending
