# Task: T03 Versioning and Release Documentation

## Status: done

## Goal

Document version source, production increment rule, preview behavior, clean-tree prerequisite, automatic release commit/push, and push-failure recovery.

## Decision Summary

- Production version increments only after successful Azure production deployment; current baseline is 1.0.0.
- Successful production records live in root deployments.json and are pushed with an automatic metadata commit.
- Preview, dry-run, local build, and failed build/upload do not increment or record a production version.

## Implementation

### I01. Update developer and deployment instructions

- Related Files:
  - README.md :: Azure Static Web Apps manual deployment section; modify
  - docs/azure-setup.md :: deployment and operations instructions; modify
  - deployments.json :: documented schema/location; read-only

#### Details

- In README.md, document current baseline 1.0.0, next successful production release 1.0.1, and the small main-menu version label.
- Explain that npm run deploy:swa requires a clean Git working tree and an upstream configured for the current branch.
- Explain that after a successful production upload, the script updates package/lock metadata and deployments.json, creates chore(release): v{version}, and pushes the current branch upstream.
- Explain a push warning means Azure is already serving the release and the local release commit can be pushed with git push.
- Document npm run deploy:swa -- -Environment preview as using the current version and not modifying production history or creating a release commit.
- Document npm run deploy:swa -- -DryRun as no-upload validation with no release side effects.
- In docs/azure-setup.md, preserve Entra, Cosmos, and deployment-secret instructions while documenting the same release behavior beside the existing manual deployment instructions.
- State that baseline 1.0.0 has no fabricated historic record; future successful production releases populate the releases array.

## Acceptance Criteria

- [x] README and Azure setup guide agree on production versus preview behavior.
- [x] Instructions explain clean-tree/upstream requirements and automatic release commit/push.
- [x] Push-failure recovery does not suggest redeploying the already-live version.
- [x] No deployment secrets or fabricated historical release metadata are added.

## Validation

- git diff --check: documentation changes have no whitespace errors.
- Manually compare README and Azure setup instructions with deployment script parameters and output messages: passed.

## Commit Message

docs(release): explain deployment-based versioning

Plan: 2026-10-30-deployment-versioning
Phase: P01-versioned-swa-release
Task: T03-versioning-documentation

- Explain automatic production patch increments and release records
- Document clean-tree, preview, dry-run, and push recovery behavior

## Progress

- [x] Implementation complete
- [x] Validation complete
- commit: pending
