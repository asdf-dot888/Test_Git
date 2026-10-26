# Task: T03 Local API Smoke Check

## Status: done

## Goal

Install Azure Functions Core Tools v4 in the current Windows development environment, document common local API startup/auth/storage failures, and confirm that an Entra-authenticated browser session can read the top-ten list from the real Cosmos container through the local SWA route.

## Decision Summary

- Current environment is Windows PowerShell, Node.js `v24.20.0`, npm `11.19.0`; `npm.ps1` is blocked by the current execution policy, so use `npm.cmd` and `npx.cmd` in PowerShell.
- Azure CLI is signed in to enabled subscription `CR-Project-01`. Azurite is a project development dependency. Core Tools 4.15.2 was installed using WinGet because the npm installer failed in this Node installation, and its required .NET 10 runtime was installed. SWA CLI 2.1.0 rejects Node 24, so `dev:swa` uses the local Node 22 executable for the emulator after building with the root Node 24 runtime.
- Cosmos endpoint/key values are present in ignored `local.settings.json`. Never print, copy into logs, or include them in screenshots or Git.
- The final leaderboard store is account `maze-rescue-ms-b7af62a9`, database `mango-stone` with shared throughput 400 RU/s, and container `leaderboard-progress` partitioned by `/userId`, with the required `(completedBattles DESC, recordedAt ASC)` composite index. The ignored local settings use this database.
- The root `.env` contains `COSMOS_DATABASE=card-roguelike` and `COSMOS_CONTAINER=active-runs` for the separate game API. The `dev:swa` command must override only those two values for the leaderboard Functions host.
- The SPA redirect URI `http://localhost:4280` is registered. Azure Cosmos resources were created or changed only at the user's explicit request; no deployment is in scope.
- The Entra app issues a token whose issuer did not match the API's original v2-only validator. The API now verifies tenant-specific v1/v2 issuer and signing-key endpoints and accepts only the configured API client ID or its `api://` URI as audience.
- The root `.env` has game API values `card-roguelike/active-runs`; `dev:swa` explicitly sets `mango-stone/leaderboard-progress` for the leaderboard emulator.
- Authenticated browser verification succeeded: leaderboard GET and victory-progress POST both returned HTTP 200. The API rendered and wrote to the actual leaderboard container.

## Implementation

### I01. Install and verify Azure Functions Core Tools v4

- Related Files:
  - `apps/leaderboard-api/package.json` :: `scripts.build:azure`, `main`; read-only
  - `apps/leaderboard-api/host.json` :: Functions v4 host config; read-only
  - `apps/leaderboard-api/local.settings.json` :: local settings; read-only, secret-bearing

#### Details

- Install Functions Core Tools v4 for the current Windows account using WinGet (the npm installer was attempted but failed with a `chalk.red is not a function` error in this environment):
  ```powershell
  winget install --id Microsoft.Azure.FunctionsCoreTools --exact
  ```
- Install the .NET runtime required by the installed Core Tools version if it is missing. Close/reopen PowerShell if PATH does not update. Verify the installed `func.exe --version` reports major version 4. In this shell, `func --version` selects a blocked PowerShell shim, so invoke `func.exe` explicitly.
- Verify Azurite is available through the root project dependency after T01 with `npm.cmd exec -- azurite --version`.
- Do not write real settings into command-line arguments. The Functions host loads `apps/leaderboard-api/local.settings.json` from its API project directory.

### I02. Document local startup and failure diagnostics

- Related Files:
  - `docs/troubleshooting.md` :: local leaderboard API failures; modify
  - `docs/azure-setup.md` :: local emulator and verification commands; read-only after T02

#### Details

- Add a local leaderboard troubleshooting section for:
  - `func.exe` not found or wrong major version: install/restart terminal, verify `func.exe --version` is 4.x.
  - Functions host storage error: confirm Azurite is running on ports 10000-10002 and `AzureWebJobsStorage` equals `UseDevelopmentStorage=true`.
  - `API_NOT_CONFIGURED` / 503: check that the ignored local settings file exists and required setting names are non-empty; never print values.
  - 401: sign in with Entra, use the `leaderboard.access` token, and check the SPA redirect URI includes `http://localhost:4280`.
  - 503 from Cosmos: check endpoint/key remain server-side, correct database/container names, account network firewall access, and container index readiness. Do not show secret values.
- Include the run command `npm.cmd run dev:swa` for Windows PowerShell and URL `http://localhost:4280`; explain that Vite-only `npm.cmd run dev` remains at `http://localhost:5173` and does not proxy `/api`.

### I03. Verify the real local route without exposing credentials

- Related Files:
  - `apps/leaderboard-api/src/functions/leaderboard.ts` :: registered `GET /api/leaderboard` handler; read-only
  - `apps/leaderboard-api/src/leaderboard/cosmosLeaderboardRepository.ts` :: `getTopTen`; read-only
  - `apps/web/src` :: existing Entra acquisition and leaderboard API request; read-only

#### Details

- Run `npm.cmd run dev:swa`; confirm SWA CLI serves port 4280 and the Functions host registers both leaderboard endpoints.
- In the browser, open `http://localhost:4280`, sign in through the SPA with Entra, and open the ranking UI. Confirm the same-origin `GET /api/leaderboard` returns HTTP 200 and the UI displays the API response (an empty `items` array is valid for a new leaderboard).
- Confirm a request without a bearer token returns HTTP 401 and does not expose Cosmos settings. Do not print, copy, or screenshot access tokens.
- A real game victory sends the logged-in player's progress to Cosmos. Treat such a manual play as a real leaderboard write; do not send synthetic progress or alter other users' records during the smoke check.
- Confirm closing the runner with Ctrl+C stops the Azurite and SWA listeners. Do not deploy or change Azure settings.

## Acceptance Criteria

- [x] `func.exe --version` reports Azure Functions Core Tools major version 4.
- [x] `npm.cmd run dev:swa` starts the local app/API at port 4280 and launches Azurite first.
- [x] After Entra login, `GET /api/leaderboard` returns 200 from `mango-stone/leaderboard-progress` and the ranking UI renders its result.
- [x] An unauthenticated ranking request returns 401; no Cosmos key or Entra access token is printed or committed.
- [x] Documentation distinguishes frontend-only port 5173 from integrated port 4280, covers the listed failure cases, and explains the root `.env` Cosmos override.
- [x] No deployment or fabricated score was made; the only new Cosmos resources are the user-requested `mango-stone` database and its leaderboard container. Existing unrelated databases were preserved.

## Validation

- `& "$env:ProgramFiles\Microsoft\Azure Functions Core Tools\func.exe" --version` (reports `4.15.2`)
- `npm.cmd exec -- azurite --version`
- `npm.cmd run dev:swa` (manual browser smoke check at `http://localhost:4280`)
- `npm.cmd test --workspace @board-game/leaderboard-api` — 10 files, 68 tests passed
- `npm.cmd run build` — passed
- `git check-ignore apps/leaderboard-api/local.settings.json` — ignored as expected
- Authenticated browser GET and progress POST — both HTTP 200

## Commit Message

```text
fix(leaderboard): complete local Cosmos ranking integration

Plan: 2026-10-26-local-leaderboard-api-test
Phase: P01-local-integration
Task: T03-local-api-smoke-check

- Validate v1 and v2 Entra access tokens with tenant-specific issuers
- Ensure the local SWA runner targets the leaderboard Cosmos database
- Document safe local troubleshooting and verify authenticated GET/POST flows
```

## Progress

- [x] Implementation complete
- [x] Validation completed
- commit: completed by this task
