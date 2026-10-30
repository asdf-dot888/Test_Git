# Decisions: Deployment-Based Versioning

- Date: 2026-10-30
- Status: Confirmed

## Goal

Manage the game's visible and recorded version by successful production deployment count, using the existing manual Static Web Apps deployment command.

## Confirmed decisions

### D01. Version format and increment rule
- **Chosen**: Use semantic-looking versions in `MAJOR.MINOR.PATCH` format, beginning at `1.0.0`. Each successful production deployment increments PATCH by one (`1.0.0` → `1.0.1`).
- **Rationale**: The user chose the familiar `1.0.0` format and wants deployment count reflected automatically.

### D02. Counted deployments
- **Chosen**: Count only successful Static Web Apps production deployments. Local builds, tests, preview deployments, and failed production attempts do not increment the version.
- **Rationale**: The version should describe what has actually been published to production.

### D03. Current production baseline
- **Chosen**: Treat the currently deployed site as `1.0.0`; the next successful production deployment becomes `1.0.1`.
- **Rationale**: No historical deployment counter exists in the repository, so the current production release is the baseline.

### D04. Version visibility and records
- **Chosen**: Show the version in small text at the bottom of the main menu, and keep it in project version metadata and a deployment history file.
- **Rationale**: Players can identify the deployed build while maintainers can inspect its release history in the repository.

### D05. Deployment automation
- **Chosen**: Automate version selection through the existing `npm run deploy:swa` command. Determine the next version for the production build, then update version metadata and deployment history only after Azure confirms a successful production deployment.
- **Rationale**: The version displayed in the deployed artifact must match the deployment, while unsuccessful attempts must leave the recorded production version unchanged.

### D06. Deployment record fields
- **Chosen**: Record the version, deployment time, and source Git commit for each production release.
- **Rationale**: This identifies both when a release was published and which source commit it represents.

### D07. Clean Git requirement and release commit
- **Chosen**: Block deployment when the working tree has uncommitted changes. After a successful production deployment, automatically commit the updated version metadata and deployment history, then push the current branch to its configured remote.
- **Rationale**: The recorded source commit must identify the exact committed source used for deployment, and release records should be synchronized to the repository.

### D08. Push failure after deployment
- **Chosen**: Keep the Azure deployment marked successful if Git push fails. Report the push failure and leave the release commit available locally for a later retry.
- **Rationale**: A Git synchronization failure cannot undo a site that Azure has already deployed.

## Existing implementation constraints and conventions

- The root `package.json` has no version field yet. It is the project-level manifest and can serve as the canonical semantic version source.
- `npm run deploy:swa` invokes `scripts/deploy-static-web-app.ps1`.
- The PowerShell script accepts `production` and `preview` environments and builds `apps/web/dist` before calling `npx swa deploy`.
- No GitHub Actions or other automatic deployment workflow was found in the repository; the existing production deployment entry point is the manual script.
- The deployment script currently allows building from an uncommitted tree and does not update version metadata, create release commits, or push them.
- A build-time version value will be needed so the production artifact shows the version being deployed even though the canonical version file is updated only after deployment succeeds.

## Scope boundaries and follow-up notes

- This decision changes the manual Static Web Apps deployment and main-menu version display. It does not add a separate release service or CI workflow.
- Preview deployments do not alter the production version or production deployment history.
- If the Azure deployment succeeds but Git push fails, the site remains live and the release commit stays local; report both facts clearly.
- No implementation, deployment, or validation was performed as part of this interview.
