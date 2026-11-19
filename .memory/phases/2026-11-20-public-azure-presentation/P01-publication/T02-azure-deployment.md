# Task: T02 Azure Deployment

## Status: done

## Goal
Publish the deck publicly through the existing Azure Static Web Apps production resource and prove the game and API remain available.

## Decision Summary
- Use SWA resource `board-card-roguelike-demo` in resource group `grill-me-edu` with the token from `.env`, kept only in process memory.
- Deploy the freshly built `apps/web/dist` with the staged managed Functions API; increment the patch version after a verified upload.

## Implementation
### I01. Package and deploy
- Related Files:
  - `apps/web/dist/presentation/index.html` :: static route artifact; generated/read-only
  - `apps/leaderboard-api/dist/index.js` :: Functions entry; generated/read-only
  - `apps/leaderboard-api/package.json` :: production dependency list; read-only
  - `apps/leaderboard-api/host.json` :: Functions host configuration; read-only
- Signatures & Types: no new application interfaces. SWA CLI receives the static output path and staged API path.
- Data & Schema Fields: no new persisted application data.
- Execution Flow: rebuild current source; stage compiled API under a temporary directory with `main: lib/index.js` and production dependencies; invoke `swa deploy` for production.
- Error Handling: require CLI success and independent live HTTP checks before modifying release metadata.

### I02. Release metadata and verification
- Related Files:
  - `package.json` :: `version: string` — advance from 1.0.6 to 1.0.7 after live verification; modify
  - `package-lock.json` :: root `version: string` — mirror package version; modify
  - `deployments.json` :: `releases[]` — append `{version: string, deployedAtUtc: string, sourceCommit: string}`; modify
  - `.memory/current.md`, `phase.md`, task blueprint, plan — completion state; modify
- Execution Flow: GET `/presentation/` must return 200 HTML without login; GET `/` must still return the game bundle; GET `/api/leaderboard` without login must return 401. Update release metadata, commit exact files, push upstream, advance pointer to none.
- Error Handling: if upload succeeds but verification or push fails, report the partial state and do not redeploy blindly.

## Acceptance Criteria
- [x] Public `/presentation/` serves slide content without login (HTTP 200, exact built HTML).
- [x] Game `/` returns the new 1.0.7 bundle and the leaderboard API returns 401 without login.
- [x] Release history matches the deployed source; release commit is prepared for push.

## Validation
- `npm test` — regression tests.
- `npm run lint` — repository lint.
- `npm run build` — full production build.
- HTTP GET checks for presentation, game, and API after upload.

## Commit Message
```text
chore(release): v1.0.7

Plan: 2026-11-20-public-azure-presentation
Phase: P01-publication
Task: T02-azure-deployment

- Record the verified public presentation release.
```

## Progress
- [x] implementation complete
- [x] validation passed (1140 tests, lint, build, live HTTP checks)
- commit: chore(release): v1.0.7
