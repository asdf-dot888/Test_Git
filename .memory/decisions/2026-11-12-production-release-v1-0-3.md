# Decisions: Production Release v1.0.3

- Date: 2026-11-12
- Status: Confirmed

## D01. Release target
- **Chosen**: Publish the current validated main branch to the existing Azure Static Web Apps production environment as v1.0.3.
- **Rationale**: The current canonical version is 1.0.2 and the established release automation increments PATCH after a successful production upload.

## D02. Included source
- **Chosen**: Include the committed spell-target fixes, test/lint cleanup, missing art, and the two remaining runtime presentation edits in `EnemyHeroDefeatEffect.tsx` and `board.css`.
- **Rationale**: These are the application changes present in the validated working tree. Unrelated `.memory` and local files remain outside the release commit.

## D03. Deployment workflow
- **Chosen**: Use `npm run deploy:swa` with the existing Entra public identifiers in ignored `.env`; let the script build, upload, bump version metadata, append deployment history, commit, and push.
- **Rationale**: This is the repository's documented production release path and records only successful deployments.

## D04. Dirty worktree handling
- **Chosen**: Commit release source and plan files, temporarily stash all unrelated tracked and untracked work, deploy from the clean main branch, then restore the stash.
- **Rationale**: The deployment script requires a clean worktree, while existing user work must be preserved.
