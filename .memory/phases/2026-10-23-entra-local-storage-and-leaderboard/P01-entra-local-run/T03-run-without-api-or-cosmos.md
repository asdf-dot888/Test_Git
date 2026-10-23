# T03 — Run Without Cosmos or Game API Dependencies

**Status:** done  
**Plan:** `2026-10-23-entra-local-storage-and-leaderboard`  
**Phase:** P01 — Entra Login and Browser-Local Run

## Objective

Make the local development command and Azure static-SPA host usable without Cosmos DB or the current run-sync API. Keep a health endpoint for the Azure host, but do not require API authentication or Cosmos initialization just to serve the game.

## Files and symbols

- `package.json`: make the documented local `npm run dev` start the web app without requiring backend/Cosmos variables. Keep any API development command clearly separate if useful for later leaderboard work.
- `scripts/dev.mjs` and `scripts/dev-mode.mjs`: remove the current six-variable gate and Cosmos/API dependency from the default local game mode. Ensure missing Entra SPA values lead to the existing configuration/login setup screen, not an API startup failure.
- `apps/api/src/index.ts`: allow static SPA serving and `/api/health` without creating a Cosmos client or requiring API audience configuration. Avoid eager Cosmos initialization in the default host startup.
- `apps/api/src/app.ts` and `apps/api/src/config/env.ts`: make current-mode API auth/repository dependencies optional for static hosting and health; preserve a clean extension point for P02 leaderboard API configuration.
- `apps/web/vite.config.ts`: remove or document the `/api` proxy if no current-mode game route uses it.
- Update `apps/api/src/index.test.ts` and `apps/api/src/app.test.ts` for static hosting and health with no Cosmos or Entra API settings; retain tests proving protected routes remain protected if any route is still mounted.

## Acceptance criteria

- `npm run dev` can launch the React game without Cosmos endpoint, API audience, or API server tenant variables.
- `npm start` can serve the production SPA and health endpoint without attempting a Cosmos connection.
- P01 does not expose or mount active-run synchronization endpoints.
- P02 can later enable a separately configured leaderboard repository and protected API routes.

## Validation

- `npm test -- --exclude "artifacts/**" apps/api/src/index.test.ts apps/api/src/app.test.ts`
- `npm run build`
- Manual smoke check: run `npm run dev` with no Cosmos/API variables and verify the app responds at the Vite URL (Entra values may still be needed to complete sign-in).

## Commit

`Plan: 2026-10-23-entra-local-storage-and-leaderboard P01-T03 run without API or Cosmos dependencies`

