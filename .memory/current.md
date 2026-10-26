# Current Context

## Active Plan
[Static Web Apps API Package Fix](./plans/2026-10-26-swa-api-package-fix.md)

## Active Phase
Complete — [P01 Standalone API Deployment](./phases/2026-10-26-swa-api-package-fix/P01-standalone-api-deployment/phase.md)

## Active Task
None — all tasks in the active plan are complete.

## Status

- The production site is `https://mango-stone-0631f0d00.5.azurestaticapps.net`; root responds HTTP 200.
- The deployment script stages the API with production dependencies under ignored `.swa/leaderboard-api`, excluding local credentials and tests.
- Production `/api/leaderboard` and `/api/leaderboard/progress` routes now reach the authentication handler and respond HTTP 401 without a token; local authenticated GET and POST were verified previously.
- Azure server-side app settings are configured on `board-card-roguelike-demo`; no secret values are recorded in memory files.

## Next Step

Use the deployed site with Entra sign-in to confirm the authenticated ranking view.
