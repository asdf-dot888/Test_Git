# Decisions: Local Leaderboard API Test

- Date: 2026-10-26
- Status: Confirmed
- Related plan: `.memory/plans/2026-10-26-cosmos-leaderboard-api.md`

## D01. Local test mode
- **Chosen**: Keep `npm run dev` and the frontend at `http://localhost:5173`; add `npm run dev:swa` for an integrated Static Web Apps local run at `http://localhost:4280`.
- **Rationale**: Preserve the existing frontend-only workflow while providing a separate URL that routes `/api` calls to the real local Functions API.
- **Source**: Confirmed by the user.

## D02. Leaderboard data source
- **Chosen**: Use Cosmos account `maze-rescue-ms-b7af62a9`, database `mango-stone`, and container `leaderboard-progress` with partition key `/userId`.
- **Rationale**: The account name and database name were clarified by the user. The database and container are dedicated to leaderboard progress.
- **Source**: Confirmed against Azure through CLI and the user's clarification.

## D03. Local API prerequisites
- **Chosen**: Install Azure Functions Core Tools v4 and Azurite in the current development environment and prepare the integrated local run command to use them.
- **Rationale**: The local SWA emulator needs a running Functions host, and `AzureWebJobsStorage=UseDevelopmentStorage=true` needs Azurite. Both tools are currently unavailable in the environment.
- **Source**: User chose local installation; prerequisite and current tool availability were checked in the workspace.

## D04. Entra redirect URI
- **Chosen**: Use `http://localhost:4280` for the integrated browser test and add it to the existing Entra SPA app registration's redirect URIs, keeping `http://localhost:5173` as well.
- **Rationale**: Entra must return the login response to the origin running the integrated local app.
- **Source**: Confirmed by the user; the current setup guide lists `5173` only.

## D05. Local Cosmos and API settings
- **Chosen**: Put local API settings in ignored `apps/leaderboard-api/local.settings.json`, based on the existing example. Cosmos endpoint and key are entered locally and are never requested in chat, printed, or committed.
- **Rationale**: The Functions host needs server-side Cosmos credentials, and the settings file is excluded from Git. The browser continues to receive only Entra access tokens, never the Cosmos key.
- **Source**: User confirmed Cosmos connection information is available for local entry; file location is based on the existing Functions example and project setup guide.

## Current findings

- The frontend is served by Vite on port `5173`; that server does not provide `/api/leaderboard`, which explains the current local leaderboard fetch failure.
- Port `4280` is not currently serving the Static Web Apps local emulator.
- `apps/leaderboard-api/local.settings.json` exists, is Git-ignored, parses as JSON, and has the correct database/container names plus non-empty Cosmos endpoint/key. Secret values are never printed.
- Azure Functions Core Tools and Azurite are not currently installed. `npm.cmd`/`npx.cmd` are available in PowerShell; invoking `npm` resolves to a blocked `npm.ps1` under the current execution policy.
- The documented local integration command is `npx swa start apps/web/dist --api-location apps/leaderboard-api`; it requires a built frontend, Azure Functions Core Tools v4, and Azurite.

## Provisioned Cosmos resources

- Account: `maze-rescue-ms-b7af62a9` in resource group `grill-me-edu`.
- Database: `mango-stone`, configured with shared throughput of 400 RU/s.
- Container: `leaderboard-progress`, partition key `/userId`, no dedicated throughput, with composite index `(completedBattles DESC, recordedAt ASC)`.
- `local.settings.json` is configured with database `mango-stone` and container `leaderboard-progress`. Cosmos credentials are not included here.

## Scope boundary

- This work covers local integrated testing of the leaderboard API. At the user's request, leaderboard-specific Cosmos resources were created in the existing account. It does not deploy the API, change leaderboard rules, or alter the existing `npm run dev` behavior.
- The user entered their Cosmos endpoint and key directly into the ignored local settings file. No credential values are included in this decision document.
- This does not add ranking fraud prevention; leaderboard progress remains the client-reported value already specified by the existing API plan.
