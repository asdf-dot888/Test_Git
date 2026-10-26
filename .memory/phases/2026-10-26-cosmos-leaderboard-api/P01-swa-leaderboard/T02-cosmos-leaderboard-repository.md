# Task: T02 Cosmos Leaderboard Repository

## Status: done

## Goal

Implement the leaderboard repository on the existing Cosmos DB account using the server-side account key setting, preserving each employee's highest completed progress under concurrent or repeated submissions.

## Decision Summary

- Use `COSMOS_ENDPOINT`, `COSMOS_KEY`, `COSMOS_DATABASE`, and `COSMOS_CONTAINER` from the Functions process environment. Do not use `DefaultAzureCredential` or system-assigned managed identity for the SWA managed API.
- Use database `mango-stone`, container `leaderboard-progress`, partition key `/userId`, one document per employee with `id: "best-progress"`. The database uses 400 RU/s shared throughput.
- Preserve the existing best record for equal/lower progress; only a strictly higher `completedBattles` replaces it and receives a new `recordedAt`.

## Implementation

### I01. Cosmos configuration and client

- Related Files:
  - `apps/leaderboard-api/src/config/env.ts` :: implement `loadLeaderboardConfig`; new
  - `apps/leaderboard-api/src/db/cosmosLeaderboardClient.ts` :: implement lazy Cosmos client and container factory; new
  - `apps/leaderboard-api/src/config/env.test.ts` :: test required and default configuration; new

#### Details

- **Signatures & Types**:
  ```ts
  export interface LeaderboardConfig {
    entraTenantId: string;
    entraApiAudience: string;
    cosmosEndpoint: string;
    cosmosKey: string;
    cosmosDatabase: string;
    cosmosContainer: string;
  }

  export function loadLeaderboardConfig(
    environment?: Record<string, string | undefined>,
  ): LeaderboardConfig;
  ```
- Require non-empty `ENTRA_TENANT_ID`, `ENTRA_API_AUDIENCE`, `COSMOS_ENDPOINT`, and `COSMOS_KEY`. Default `COSMOS_DATABASE` to `mango-stone` and `COSMOS_CONTAINER` to `leaderboard-progress`.
- Build `new CosmosClient({ endpoint: cosmosEndpoint, key: cosmosKey })`. Do not log the key or include it in thrown error messages.
- Instantiate the client/container lazily on first API invocation so missing configuration does not prevent the static site or existing browser-local play from loading. A misconfigured API returns the safe 503 behavior defined in T01.
- Export injectable factories for tests; tests must never connect to the live account.

### I02. Best-only Cosmos operations

- Related Files:
  - `apps/leaderboard-api/src/leaderboard/cosmosLeaderboardRepository.ts` :: implement `getTopTen` and `recordBestProgress`; new
  - `apps/leaderboard-api/src/leaderboard/cosmosLeaderboardRepository.test.ts` :: fake Cosmos SDK calls and verify ordering/update rules; new
  - `apps/leaderboard-api/src/index.ts` :: compose the configured Cosmos repository into the T01 handlers; modify

#### Details

- Create/read documents in the configured container with partition key equal to verified `userId`; persist exactly the T01 `LeaderboardRecord` fields.
- `recordBestProgress` behavior:
  1. Read item ID `best-progress` for the `userId` partition.
  2. If missing, create a record with input identity, count, timestamp, and `schemaVersion: 1`.
  3. If input progress is greater, replace the record and set `recordedAt` to the input server timestamp.
  4. If input progress is equal or lower, return the existing record unchanged and `updated: false`; never lower the score or move its timestamp.
  5. Use Cosmos ETag conditional replace and bounded retry on 412/precondition conflict so overlapping submissions cannot overwrite a higher score with a lower one. Re-read and compare after each conflict.
- `getTopTen` executes a cross-partition query equivalent to `SELECT TOP 10 * FROM c ORDER BY c.completedBattles DESC, c.recordedAt ASC`, requests at most 10 results, and maps only public record fields into the response.
- Translate Cosmos 404 on item read to “no current record”; propagate other storage failures to T01's safe unavailable response.
- Unit tests cover first create, improvement, lower/equal no-op with preserved timestamp, competing update retry, deterministic tie order, result limit 10, and absence of Cosmos secrets in errors/log calls.

## Acceptance Criteria

- [x] Cosmos client uses a server-only key and is initialized lazily.
- [x] Storage is partitioned by Entra object ID and contains one `best-progress` item per employee.
- [x] Concurrent and repeated requests cannot lower a stored score; equal/lower submissions preserve the original timestamp.
- [x] Top ten ordering is deterministic and the query reads no more than ten response items.
- [x] Cosmos credentials never enter the frontend bundle, tests, logs, or error bodies.

## Validation

- `npm test -- apps/leaderboard-api/src/config/env.test.ts apps/leaderboard-api/src/leaderboard/cosmosLeaderboardRepository.test.ts`
- `npm test -- apps/leaderboard-api/src`
- `npm run build --workspace @board-game/leaderboard-api`
- `npm run lint -- apps/leaderboard-api/src`

## Commit Message

```text
feat(api): store best leaderboard progress in Cosmos DB

Plan: 2026-10-26-cosmos-leaderboard-api
Phase: P01-swa-leaderboard
Task: T02-cosmos-leaderboard-repository

- Add key-configured Cosmos repository for best progress and top ten
- Protect best-score writes with ETag-based concurrency handling
```

## Progress

- [x] Implementation complete
- [x] Validation passed
- commit: recorded in git history
