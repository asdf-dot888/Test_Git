# T01 — Cosmos-Backed Best-Progress API

**Status:** superseded by `.memory/phases/2026-10-26-cosmos-leaderboard-api/P01-swa-leaderboard/T01-managed-leaderboard-api.md`  
**Plan:** `2026-10-23-entra-local-storage-and-leaderboard`  
**Phase:** P02 — Informal Progress Leaderboard

## Objective

Create an Entra-protected API and Cosmos repository that records each employee's best completed campaign progress and returns the top 10. This API is independent from active run storage and deliberately does not attempt anti-cheat validation.

## Files and symbols

- `apps/api/src/index.ts`, `apps/api/src/app.ts`: mount leaderboard routes only when configured; validate bearer tokens against the game API audience; derive user identity from verified `oid` and display name from verified claims.
- Add `apps/api/src/leaderboard/leaderboardTypes.ts`: define request/response and persisted record types.
- Add `apps/api/src/leaderboard/cosmosLeaderboardRepository.ts`: implement `getTopTen()` and `recordBestProgress()` using the existing Cosmos client conventions and `DefaultAzureCredential`.
- Add `apps/api/src/leaderboard/leaderboardRoutes.ts`: authenticated `GET /api/leaderboard` and `POST /api/leaderboard/progress` routes with validation and safe error responses.
- Add focused API tests for route auth/validation, best-only updates, top-10 ordering, and ties.
- `apps/api/src/config/env.ts` and deployment/config docs: add leaderboard Cosmos database/container settings without reintroducing Cosmos as a requirement for P01 static-game startup.

## Data contract

Use one document per authenticated employee in a dedicated `leaderboard-progress` container, partitioned by `/userId`:

```ts
type LeaderboardRecord = {
  id: "best-progress";
  userId: string;             // verified Entra oid; never accepted from request body
  displayName: string;        // verified Entra claim
  completedBattles: number;   // integer 1..12, reported after a victory
  recordedAt: string;         // first time this best score was achieved
  schemaVersion: 1;
};
```

The POST body may contain only `{ completedBattles }`. The server uses the verified token identity and display name. Create a record if absent; replace it only when progress is strictly greater. If progress is equal, preserve the earlier `recordedAt`. `GET` returns at most 10 rows ordered by `completedBattles` descending then `recordedAt` ascending. Do not accept full run state or an in-progress status.

Progress presentation is derived from the score: each four completed battles correspond to a defeated phase boss; 12 means the campaign is complete. Keep exact wording consistent with the campaign UI.

## Acceptance criteria

- Unauthenticated requests cannot read or write the leaderboard.
- A caller cannot write a different employee's identity or display name.
- The API keeps only each user's highest completed progress; equal or lower submissions do not move the record time.
- The top response has no more than 10 employees and applies deterministic tie ordering.
- Cosmos is initialized only when leaderboard configuration is enabled; P01 local/browser mode still works without it.
- No anti-cheat controls are added; this is explicitly an informal, client-reported ranking.

## Validation

- `npm test -- apps/api/src/leaderboard`
- `npm test -- apps/api/src/app.test.ts apps/api/src/index.test.ts`
- `npm run build`

## Commit

`Plan: 2026-10-23-entra-local-storage-and-leaderboard P02-T01 add informal progress leaderboard API`

