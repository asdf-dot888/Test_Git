# T04 — Configuration and Operating Documentation

**Status:** done  
**Plan:** `2026-10-23-entra-local-storage-and-leaderboard`  
**Phase:** P01 — Entra Login and Browser-Local Run

## Objective

Align environment examples and setup instructions with the login-only, browser-local current mode, and make clear which Entra values come from the app registration versus the user signing in.

## Files and symbols

- `.env.example`: document only the SPA settings required for current gameplay (`VITE_ENTRA_TENANT_ID`, `VITE_ENTRA_CLIENT_ID`), with no secret values. Keep future API/Cosmos values in a separately labeled optional section only if still used by another command.
- `README.md`: document prerequisites, installing dependencies, starting local development without Cosmos, configuring the SPA redirect URI, Entra sign-in, browser/device-local run persistence, and the storage-failure warning.
- `docs/azure-setup.md`: separate current SPA login setup from future API/Cosmos leaderboard setup. Clarify that Tenant ID and Client ID are application configuration values and are not fetched from the employee's sign-in session. Include local redirect origin and Azure App Service origin as allowed SPA redirect URIs.
- Review `docs/` deployment instructions so they do not claim Cosmos is required to start the game in P01.

## Acceptance criteria

- A developer can follow the README to open the local game without setting Cosmos variables.
- Documentation states that each user has an independent browser-local save and it will not roam across devices.
- Entra configuration requirements distinguish SPA tenant/client IDs from optional, future game API permissions.
- No credentials or real tenant secrets are added to tracked examples.

## Validation

- Manually follow the documented setup commands in a clean environment or verify each command against `package.json` scripts.
- `git diff --check`

## Commit

`Plan: 2026-10-23-entra-local-storage-and-leaderboard P01-T04 document Entra and local development setup`

