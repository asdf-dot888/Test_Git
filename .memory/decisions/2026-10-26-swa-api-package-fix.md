# Decision: Fix Static Web Apps API Package

## Context

The local integrated runner returns successful leaderboard GET and POST responses. The deployed Static Web App serves the SPA with HTTP 200, but `/api/leaderboard` returns an empty HTTP 404. The API is an npm workspace package. Its runtime dependencies are hoisted into the repository root `node_modules`, while SWA CLI deploys only `apps/leaderboard-api`; that subfolder's `node_modules` contains development type packages but not the runtime packages needed by the Functions host.

## Decision

- Build the leaderboard API as a standalone deployment artifact before invoking SWA CLI.
- Stage `host.json`, the API `package.json`, and compiled runtime code in a temporary `.swa` directory. Exclude local settings and test files.
- Install production dependencies inside the staged API directory so the Functions host can resolve `@azure/functions`, `@azure/cosmos`, `jose`, and `zod` without relying on npm workspace hoisting.
- Deploy this staged API directory with Node.js 22. Keep the app's current free Static Web Apps resource and Cosmos configuration.
- Verify deployment by requiring the site's root to return HTTP 200 and the unauthenticated API route to return HTTP 401. A 404 means the API functions were not registered and deployment is incomplete.
- Keep all Cosmos credentials in server-side Azure app settings and ignored local settings; never copy `local.settings.json` into the deployment artifact.

## Scope

This is a packaging and deployment correction. It does not change leaderboard behavior, API routes, Entra validation, Cosmos schema, or hosting SKU.
