# Task: T01 Package and Deploy the API

## Status: done

## Goal

Ensure the Azure Static Web Apps Node.js 22 Functions host can load the leaderboard API by staging a standalone API directory with all production runtime dependencies, deploying it, and confirming the API route is registered.

## Decision Summary

- This monorepo uses npm workspaces and hoists dependencies to the repository root. Directly deploying `apps/leaderboard-api` does not reliably include the runtime packages required by that API workspace.
- Stage the API under ignored `.swa/leaderboard-api`, containing `host.json`, a production `package.json`, compiled `dist`, and locally installed production dependencies. Do not copy `local.settings.json`, tests, or credentials.
- Deploy to existing Static Web App `board-card-roguelike-demo` in `grill-me-edu` using SWA CLI production environment and Node 22.
- Production route check is unauthenticated: root must return 200; `GET /api/leaderboard` must return 401. 404 indicates functions were not loaded; 503 indicates a configuration/storage problem and does not count as success.

## Implementation

### I01. Create a safe standalone API staging directory

- Related Files:
  - `scripts/deploy-static-web-app.ps1` :: build, stage, and deploy sequence; modify
  - `docs/azure-setup.md` :: manual SWA deployment description; modify
  - `apps/leaderboard-api/package.json` :: production dependency source; read-only
  - `apps/leaderboard-api/host.json` :: Functions v4 host configuration; read-only
  - `apps/leaderboard-api/dist/index.js` :: compiled Functions v4 entry point; read-only
  - `.gitignore` :: `.swa/` already ignored; read-only

#### Details

- After the existing build and required-file checks, remove only the known staging target `<repo>/.swa/leaderboard-api` after resolving and checking it is inside `<repo>/.swa`.
- Create the staging directory and copy `apps/leaderboard-api/host.json`, `apps/leaderboard-api/package.json`, and the compiled runtime `dist` tree.
- Exclude test output and `local.settings.json`; the staging directory must not contain local settings or a Cosmos key.
- Run `npm.cmd install --omit=dev --prefix <staging-directory>` so workspace-hoisted runtime packages are installed into the staged package itself. Fail deployment on nonzero exit.
- Copy compiled runtime JavaScript into `lib/` (excluding `*.test.js` and declarations), set the staged package `main` to `lib/index.js`, and verify the entry point exists. `lib/` avoids the repository-wide `dist/` ignore pattern.
- Verify `node_modules/@azure/functions/package.json`, `node_modules/@azure/cosmos/package.json`, `node_modules/jose/package.json`, and `node_modules/zod/package.json` exist in staging before upload.
- Deploy `apps/web/dist` plus the staging directory with `--api-location`, `--api-language node`, `--api-version 22`, and the requested deployment environment. Keep the current deployment token handling.

### I02. Smoke-check deployment behavior

- Related Files:
  - `scripts/deploy-static-web-app.ps1` :: deployment artifact production; modify
  - `docs/azure-setup.md` :: deployment artifact explanation; modify
  - `.memory/current.md` and this task file :: completion state; modify

#### Details

- Run the deployment script with the Azure Static Web Apps deployment token sourced from Azure CLI in process memory; never print it.
- Verify the public site root returns HTTP 200.
- Verify unauthenticated `GET /api/leaderboard` returns HTTP 401. Do not send an access token or write leaderboard data in this smoke check.
- Verify ignored `apps/leaderboard-api/local.settings.json` remains untracked and `.swa/` staging output remains ignored.
- If the endpoint returns 404, inspect the staged package main path and runtime dependency files, correct packaging, redeploy, and repeat the route check.

## Acceptance Criteria

- [x] Deployment script creates a standalone API artifact with all four runtime dependencies and no local credentials.
- [x] Production deployment completes to `board-card-roguelike-demo`.
- [x] Site root responds HTTP 200 and unauthenticated `GET /api/leaderboard` responds HTTP 401.
- [x] No secret-bearing local settings file is copied, tracked, or printed.

## Validation

- `npm.cmd run deploy:swa -- -DryRun` — passed; standalone staged artifact contained `@azure/functions`, `@azure/cosmos`, `jose`, and `zod`; no local settings or test files were staged.
- `npm.cmd test --workspace @board-game/leaderboard-api` — passed, 10 files / 68 tests.
- `npm.cmd run deploy:swa` — completed to production Static Web App `board-card-roguelike-demo`.
- Deployment smoke check: HTTPS root `200`, unauthenticated `GET /api/leaderboard` `401`, unauthenticated `POST /api/leaderboard/progress` `401`.
- An authenticated production GET was not verified from Azure CLI because it could not acquire the custom delegated API scope; the local authenticated GET/POST was previously verified, and production endpoints now reach the auth handler instead of returning 404.

## Commit Message

```text
fix(deploy): bundle leaderboard API runtime dependencies

Plan: 2026-10-26-swa-api-package-fix
Phase: P01-standalone-api-deployment
Task: T01-package-and-deploy-api

- Stage a self-contained Functions API from the npm workspace
- Keep local Cosmos settings out of the deployment artifact
- Deploy and verify the production leaderboard route
```

## Progress

- [x] Implementation complete
- [x] Validation passed
- commit: completed by this task
