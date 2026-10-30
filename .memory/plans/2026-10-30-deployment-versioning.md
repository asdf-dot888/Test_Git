# Plan: Deployment-Based Versioning

## Goal

Show the deployed Mango Stone version in the main menu and synchronize it with successful Azure Static Web Apps production releases. Treat the currently deployed site as 1.0.0; each later successful production deployment publishes the next patch version, records source commit and UTC deployment time, then commits and pushes release metadata.

Source decision: [Deployment-Based Versioning](../decisions/2026-10-30-deployment-versioning.md)

## Phases

| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | done | Add the version to the game, automate production release bookkeeping in the existing SWA deploy command, and document the workflow. | [P01](../phases/2026-10-30-deployment-versioning/P01-versioned-swa-release/phase.md) |

## Scope and constraints

- Root package.json is the canonical version source, starting at 1.0.0; keep root package-lock.json metadata synchronized.
- Compile selected release version into the web bundle using VITE_APP_VERSION, falling back to root package version for local builds.
- Display v{version} in small text at the bottom of the main menu.
- Production builds calculate the next patch version before building, so deployed UI shows the version being published. Update canonical metadata and deployments.json only after Azure confirms successful production deployment.
- deployments.json schema is { releases: [{ version, deployedAtUtc, sourceCommit }] }. Use ISO 8601 UTC timestamps and the full 40-character Git SHA. Initialize releases as an empty array; do not invent historic time or commit for the 1.0.0 baseline.
- Every actual production or preview deployment requires a clean Git working tree and a configured upstream for the current branch. Dry runs do not publish or record releases.
- Preview uses the current canonical version and never changes production history or creates release Git changes.
- After production success, update package.json, package-lock.json, and deployments.json; create a release commit containing only these files; push the current branch to its upstream. If push fails, preserve Azure success and the local commit, then report the failure.
- Do not create a CI workflow, deploy to production, or push during planning or validation.
