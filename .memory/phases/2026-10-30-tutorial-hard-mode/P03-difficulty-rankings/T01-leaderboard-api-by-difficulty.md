# Task: T01 Leaderboard API by Difficulty

## Status: done

## Goal

Make leaderboard API submissions and reads difficulty-aware and store one independent highest-progress record per user and difficulty, treating existing records without a difficulty as Normal.

## Decision Summary

- Normal and Hard top-ten rankings are independent.
- Existing Cosmos records without `difficulty` remain valid as Normal results.
- Entra identity continues to supply `userId` and `displayName`; the browser supplies only progress and the selected difficulty.

## Implementation

### I01. Extend leaderboard record, validation, repository, and handlers

- Related Files:
  - `apps/leaderboard-api/src/leaderboard/types.ts` :: `LeaderboardRecord`, `RecordBestProgressInput`, `LeaderboardRepository`; modify
  - `apps/leaderboard-api/src/leaderboard/validation.ts` :: `progressSubmissionSchema`; modify
  - `apps/leaderboard-api/src/leaderboard/cosmosLeaderboardRepository.ts` :: `getTopTen`, `recordBestProgress`, `read`, `createRecord`, `toPublicRecord`; modify
  - `apps/leaderboard-api/src/functions/leaderboard.ts` :: GET/POST handlers; modify
  - `apps/leaderboard-api/src/leaderboard/validation.test.ts` :: difficulty validation; modify
  - `apps/leaderboard-api/src/leaderboard/cosmosLeaderboardRepository.test.ts` :: partitioned score and legacy migration; modify
  - `apps/leaderboard-api/src/functions/leaderboard.test.ts` :: GET query and POST difficulty; modify

#### Details

- **Signatures & Types**:
  ```typescript
  export type RunDifficulty = "normal" | "hard";
  export type LeaderboardRecord = {
    id: "best-progress" | "best-progress:hard";
    userId: string;
    displayName: string;
    difficulty: RunDifficulty;
    completedBattles: number;
    recordedAt: string;
    schemaVersion: 2;
  };

  export type RecordBestProgressInput = {
    userId: string;
    displayName: string;
    difficulty: RunDifficulty;
    completedBattles: number;
    recordedAt: string;
  };
  ```
- **API contract**:
  - `GET /api/leaderboard?difficulty=normal|hard`; missing query defaults to `normal`; invalid values return HTTP 400 `INVALID_DIFFICULTY`.
  - `POST /api/leaderboard/progress` body is exactly `{ completedBattles: integer 1..12, difficulty: "normal" | "hard" }`; strict schema rejects other fields.
  - GET response remains `{ items: LeaderboardRecord[] }`, max 10 records.
  - POST response remains `{ record, updated }`.
- **Cosmos document schema and migration**:
  - Use `id = "best-progress"` for Normal and `id = "best-progress:hard"` for Hard, `userId` as partition key, and `schemaVersion: 2` for new writes.
  - Keep one record per `(userId, difficulty)` in the existing `/userId` partition.
  - When reading Normal by user, read `best-progress`. A legacy schemaVersion 1 document missing `difficulty` is treated as Normal; update that same document ID to schemaVersion 2 on a new higher-score write.
  - Hard reads never fall back to the legacy record.
  - Use `SELECT TOP 10 * FROM c WHERE c.difficulty = @difficulty OR (@difficulty = "normal" AND NOT IS_DEFINED(c.difficulty)) ORDER BY c.completedBattles DESC, c.recordedAt ASC`; bind `@difficulty` as a Cosmos query parameter and limit to 10.
  - Normalize legacy schemaVersion 1 records without difficulty to public `difficulty: "normal"`, `id: "best-progress"`, and `schemaVersion: 2`; validate new records against schemaVersion 2 and the matching ID.
- **Execution Flow / Logic**:
  1. Parse `difficulty` from GET query or strict POST body before repository access.
  2. Continue deriving identity from the verified Entra token; ignore any user ID/name sent by the client.
  3. Perform optimistic ETag replacement with the existing retry limit of 5; keep independent concurrency for the Normal ID and the Hard ID.
  4. On invalid API data return 400; preserve existing authentication and storage error responses.

## Acceptance Criteria

- [ ] One user can hold independent Normal and Hard records; improving one does not alter the other.
- [ ] Legacy v1 records appear in Normal results and never in Hard results.
- [ ] Hard writes do not overwrite legacy Normal records.
- [ ] Top-ten queries filter by difficulty, sort and cap as specified.
- [ ] API derives identity from Entra and rejects invalid difficulty values.

## Validation

- `npm run test --workspace @board-game/leaderboard-api -- src/leaderboard/validation.test.ts src/leaderboard/cosmosLeaderboardRepository.test.ts src/functions/leaderboard.test.ts`
- `npm run build --workspace @board-game/leaderboard-api`

## Commit Message

```text
feat(leaderboard): store separate normal and hard rankings

Plan: 2026-10-30-tutorial-hard-mode
Phase: P03-difficulty-rankings
Task: T01-leaderboard-api-by-difficulty

- Add difficulty to API records and progress validation
- Preserve legacy records as normal scores
```

## Progress

- [x] Implementation complete
- [x] Validation passed
- commit: pending
