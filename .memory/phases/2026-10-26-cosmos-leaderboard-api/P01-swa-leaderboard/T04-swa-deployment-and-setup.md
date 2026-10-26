# Task: T04 Static Web Apps API Deployment and Setup

## Status: pending

## Goal

Make the React site and managed Functions API deploy together to the existing Static Web Apps Free resource using the user's manual deployment flow, and document all required Entra, Cosmos, and server-side application settings without exposing credentials.

## Decision Summary

- Deploy the built `apps/web` frontend and `apps/leaderboard-api` as one Static Web Apps Free deployment with Azure Static Web Apps CLI; do not create App Service or a separate Functions resource.
- Static Web Apps managed API runtime is Node.js 22 (`node:22`) and Functions v4. The API uses same-origin `/api` routing.
- Configure Cosmos DB key and API validation settings in Static Web Apps API environment settings only. Keep the API key out of `.env`, Vite settings, Git, deployment output, and command logs.

## Implementation

### I01. Build and manual SWA deployment wiring

- Related Files:
  - `package.json` :: add `apps/leaderboard-api` workspace, API build, and SWA deploy scripts; modify
  - `package-lock.json` :: lock workspace/runtime/tool dependencies; modify
  - `apps/web/public/staticwebapp.config.json` :: select `apiRuntime: "node:22"`; new
  - `apps/leaderboard-api/package.json` :: provide Functions v4 production entry point/dependencies to SWA; modify if needed
  - `scripts/deploy-static-web-app.ps1` :: build and deploy frontend plus API; new
  - `.gitignore` :: exclude `apps/leaderboard-api/local.settings.json`, SWA CLI state, and deployment artifacts; modify

#### Details

- Ensure `npm run build` compiles game-core, web, Express API, and managed API without changing the existing `npm run dev` browser-local path. Root workspace registration/build wiring is completed in T01.
- `staticwebapp.config.json` must be copied from `apps/web/public` to `apps/web/dist` by Vite and contain `{"platform":{"apiRuntime":"node:22"}}` while preserving any existing routing/security configuration.
- Configure Functions Node v4 entry point so the deployed API package loads compiled `dist` registrations and runtime dependencies. The API deployment folder must contain `host.json`, `package.json`, and all compiled registrations.
- Add `@azure/static-web-apps-cli` as a reproducible development dependency and script that runs web/API builds, verifies required deployment settings, then deploys `apps/web/dist` with `apps/leaderboard-api` as `--api-location` to `--env production`.
- Deployment reads `SWA_CLI_DEPLOYMENT_TOKEN` from the process environment or uses authenticated SWA CLI login; fail with an actionable message when neither is configured. Never echo token values, invoke commands with a literal secret, or place the token in the release artifact.
- Add local API settings only through ignored `apps/leaderboard-api/local.settings.json`; include a safe example with empty placeholders and no actual secrets. Ensure test/build and site deployment work when Azure settings are absent.

### I02. Azure setup and operations documentation

- Related Files:
  - `.env.example` :: keep only public SPA tenant/client settings and describe the derived API scope; modify
  - `README.md` :: document current localStorage + SWA managed API architecture and manual deployment entry point; modify
  - `docs/azure-setup.md` :: document Entra scope, Cosmos container, SWA settings, secret handling, deployment, and smoke checks; modify
  - `docs/troubleshooting.md` :: add API scope/consent, Cosmos configuration, and Functions runtime troubleshooting; modify
  - `.memory/decisions/2026-10-23-production-azure-deployment.md` :: mark its App Service/full-run-Cosmos deployment choices superseded by later localStorage/SWA decisions; modify

#### Details

- Document the portal steps to expose delegated scope `leaderboard.access` on the existing registration (Application ID URI `api://86862438-ff66-4df4-8302-802115dfed70`), add/consent it for the SPA, and verify the exact requested scope.
- Document the existing account/resource group and creation of database `card-roguelike` plus container `leaderboard-progress` with partition key `/userId`; configure the composite index on `/completedBattles` descending and `/recordedAt` ascending required by the top-ten query; preserve any existing Cosmos databases/containers.
- Document Static Web Apps API application settings by exact name: `ENTRA_TENANT_ID`, `ENTRA_API_AUDIENCE` (the registration client ID for v2 tokens), `COSMOS_ENDPOINT`, `COSMOS_KEY`, `COSMOS_DATABASE`, and `COSMOS_CONTAINER`. Explain which values are identifiers and which is secret; set `COSMOS_KEY` only through the portal's server-side API environment settings.
- Document the Vite build-time public values `VITE_ENTRA_TENANT_ID` and `VITE_ENTRA_CLIENT_ID`; never add a `VITE_COSMOS_KEY` or client secret. Keep `COSMOS_KEY` and SWA deployment tokens out of Git and browser bundles.
- Document local full-stack preview through SWA CLI with Functions Core Tools. Explain that ordinary `npm run dev` continues to support browser-local gameplay, while leaderboard calls require local API settings and Cosmos reachability.
- Document manual release command, deployment-token handling, verification of deployed `/api/leaderboard` with and without a token, valid progress write, top-ten read, and Cosmos data row. Do not include live secret values or run production write examples that alter real leaderboard data.
- Mark the old App Service/full active-run Cosmos deployment decision superseded for this product architecture; preserve unrelated history and the still-current Entra/browser-local decisions.

## Acceptance Criteria

- [ ] Static Web Apps deployment includes both the SPA and managed API with Node.js 22 runtime and same-origin `/api` routes.
- [ ] Existing local game development and app builds do not require Cosmos or deployment credentials.
- [ ] Documentation gives exact Entra scope, Cosmos database/container, Static Web Apps app-setting names, manual deployment, and smoke-test steps.
- [ ] Cosmos and deployment secrets cannot appear in Vite output, Git-tracked files, logs, or deployment artifacts.
- [ ] Conflicting older App Service/full-run Cosmos deployment notes are clearly marked superseded.

## Validation

- `npm test`
- `npm run lint`
- `npm run build`
- `npx swa start apps/web/dist --api-location apps/leaderboard-api` (local integration smoke check; requires Azure Functions Core Tools)
- `npm run deploy:swa -- --dry-run` (deployment packaging dry run; must not publish)

## Commit Message

```text
docs(deploy): configure free Static Web Apps leaderboard deployment

Plan: 2026-10-26-cosmos-leaderboard-api
Phase: P01-swa-leaderboard
Task: T04-swa-deployment-and-setup

- Add repeatable manual SWA deployment for the site and managed API
- Document Entra scope, Cosmos settings, and secret-safe operations
```

## Progress

- [ ] Implementation complete
- [ ] Validation passed
- commit: pending
