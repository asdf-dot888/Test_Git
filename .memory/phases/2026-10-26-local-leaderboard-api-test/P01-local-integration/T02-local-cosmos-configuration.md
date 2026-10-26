# Task: T02 Local Cosmos Configuration

## Status: done

## Goal

Make API defaults and local setup instructions match the actual leaderboard database (`maze-rescue`) and container (`leaderboard-progress`), and document the Entra redirect URI required by the integrated local origin `http://localhost:4280`.

## Decision Summary

- Cosmos account `maze-rescue-ms-b7af62a9` is in resource group `grill-me-edu`; the existing SQL database is `maze-rescue`.
- Container `leaderboard-progress` has partition key `/userId` and composite index `(completedBattles DESC, recordedAt ASC)`. It was created using the database's existing shared throughput; do not add dedicated throughput.
- The only local secret source is ignored `apps/leaderboard-api/local.settings.json`. Keep the checked-in example free of real credentials.
- Register `http://localhost:4280` as an SPA redirect URI alongside the existing `http://localhost:5173` URI.

## Implementation

### I01. Align API defaults and example settings

- Related Files:
  - `apps/leaderboard-api/src/config/env.ts` :: `loadLeaderboardConfig`; modify
  - `apps/leaderboard-api/src/config/env.test.ts` :: `loadLeaderboardConfig` default and Cosmos client factory tests; modify
  - `apps/leaderboard-api/local.settings.example.json` :: `Values.COSMOS_DATABASE` and `Values.COSMOS_CONTAINER`; modify
  - `apps/leaderboard-api/local.settings.json` :: read-only; never modify, print, or stage user credentials

#### Details

- Change the fallback `COSMOS_DATABASE` from `card-roguelike` to `maze-rescue` in `loadLeaderboardConfig`. Keep `leaderboard-progress` as the fallback container name.
- Update the default expectation in `env.test.ts` and the sample `createCosmosClient` config database value to `maze-rescue`. Preserve the secret-omission assertion and the explicit database/container override test.
- Set the example settings database to `maze-rescue` and leave `COSMOS_ENDPOINT`, `COSMOS_KEY`, `ENTRA_TENANT_ID`, and `ENTRA_API_AUDIENCE` empty. Keep `AzureWebJobsStorage` as `UseDevelopmentStorage=true`.
- Do not change any values in the ignored user settings file. Its actual Cosmos endpoint and key are already configured.

### I02. Correct Azure and local API setup documentation

- Related Files:
  - `docs/azure-setup.md` :: `### Cosmos DB`, `### 로컬 API 미리보기 (선택)`, and Entra redirect URI steps; modify
  - `apps/leaderboard-api/local.settings.example.json` :: documented setting names; read-only after I01

#### Details

- Replace the old database name `card-roguelike` with `maze-rescue` in the Cosmos setup instructions and current API settings table. State the actual account/resource group, container name, `/userId` partition key, and required composite index `(completedBattles DESC, recordedAt ASC)`.
- Explain that the leaderboard container uses the database's existing shared throughput and that local setup must not request dedicated container throughput.
- Add `http://localhost:4280` to the local SPA redirect URI instructions while retaining `http://localhost:5173` for the Vite-only flow.
- Replace the optional raw `npx swa start` recipe with `npm run dev:swa`; explain that it builds the app, starts Azurite and the SWA emulator, and opens `http://localhost:4280`. Keep the existing `npm run dev` description for frontend-only development.
- Explain the local settings mapping: `ENTRA_TENANT_ID`, `ENTRA_API_AUDIENCE`, `COSMOS_ENDPOINT`, `COSMOS_KEY`, `COSMOS_DATABASE=maze-rescue`, and `COSMOS_CONTAINER=leaderboard-progress`.
- State that Azurite is only the Functions runtime's local `AzureWebJobsStorage` emulator; the leaderboard data still goes to the configured real Cosmos account. Never include or print actual key values.

## Acceptance Criteria

- [x] With only the required environment fields supplied, `loadLeaderboardConfig` defaults to `maze-rescue` and `leaderboard-progress`.
- [x] The checked-in local settings example points at `maze-rescue` but contains no credentials.
- [x] Azure setup documentation no longer tells this app to create or use `card-roguelike`.
- [x] Documentation gives the exact local redirect URI, runner command, database/container/partition/index details, and secret handling.
- [x] The ignored `local.settings.json` is unchanged by this task and is never included in Git.

## Validation

- `npm.cmd test --workspace @board-game/leaderboard-api`
- `npm.cmd run lint --workspace @board-game/leaderboard-api`
- `rg -n "card-roguelike|localhost:4280|maze-rescue|leaderboard-progress" docs/azure-setup.md apps/leaderboard-api/src/config/env.ts apps/leaderboard-api/local.settings.example.json`
- `git check-ignore apps/leaderboard-api/local.settings.json`

## Commit Message

```text
fix(leaderboard): align local Cosmos configuration

Plan: 2026-10-26-local-leaderboard-api-test
Phase: P01-local-integration
Task: T02-local-cosmos-configuration

- Use the existing maze-rescue database by default
- Document the integrated local Entra and Cosmos setup
```

## Progress

- [x] Implementation complete
- [x] Validation completed (68 API tests and API workspace lint passed)
- commit: `pending`
