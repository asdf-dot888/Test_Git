# Task: T01 Managed Leaderboard API

## Status: done

## Goal

Create an independently deployable Azure Functions Node.js v4 API project for the two leaderboard HTTP endpoints. Validate single-tenant Entra access tokens and the delegated `leaderboard.access` scope before any repository call. Keep the existing Express API and browser-local run flow unchanged.

## Decision Summary

- Use Static Web Apps Free managed Functions, Node.js v4 programming model, Node API runtime `node:22`, and the same Entra app registration as the SPA.
- API scope is `api://86862438-ff66-4df4-8302-802115dfed70/leaderboard.access`; validate tenant-matching v1/v2 token issuers with their version-specific signing keys, and accept only this API's client ID or Application ID URI as audience. Validate tenant, signature, expiry, `oid`, `name`, and `scp`.
- API contracts: `GET /api/leaderboard` returns `{ items: LeaderboardRecord[] }`; `POST /api/leaderboard/progress` accepts only `{ completedBattles }` and returns `{ record, updated }`.

## Implementation

### I01. Functions project and endpoint handlers

- Related Files:
  - `apps/leaderboard-api/package.json` :: define `@board-game/leaderboard-api`, runtime dependencies, and v4 entry point; new
  - `apps/leaderboard-api/host.json` :: Functions host v2 configuration; new
  - `apps/leaderboard-api/tsconfig.json` :: compile TypeScript to `dist`; new
  - `apps/leaderboard-api/src/index.ts` :: import function registrations; new
  - `apps/leaderboard-api/src/functions/leaderboard.ts` :: register `leaderboardGet` and `leaderboardProgressPost`; new
  - `apps/leaderboard-api/src/leaderboard/types.ts` :: define the record, response, principal, and repository types; new
  - `apps/leaderboard-api/src/leaderboard/validation.ts` :: parse strict POST input and safe API error bodies; new
  - `package.json` :: register the new npm workspace and include its build in root build; modify
  - `package-lock.json` :: record the workspace package/dependencies; modify

#### Details

- **Signatures & Types**:
  ```ts
  export type LeaderboardRecord = {
    id: "best-progress";
    userId: string;             // validated Entra oid
    displayName: string;        // validated Entra name claim
    completedBattles: number;   // integer 1..12
    recordedAt: string;         // ISO-8601 UTC time when this best was achieved
    schemaVersion: 1;
  };

  export type LeaderboardPrincipal = {
    userId: string;
    displayName: string;
    tenantId: string;
  };

  export interface LeaderboardRepository {
    getTopTen(): Promise<LeaderboardRecord[]>;
    recordBestProgress(input: {
      userId: string;
      displayName: string;
      completedBattles: number;
      recordedAt: string;
    }): Promise<{ record: LeaderboardRecord; updated: boolean }>;
  }
  ```
- Register v4 functions with `app.http(...)`; set `authLevel: "anonymous"` because function-key auth is not the user-auth mechanism. Explicitly allow only GET for `leaderboard` and POST for `leaderboard/progress`.
- Add `apps/leaderboard-api` to root npm workspaces and add `npm run build --workspace @board-game/leaderboard-api` to the root `build` script while preserving the existing workspace build order.
- Set the route paths to `leaderboard` and `leaderboard/progress`; Azure Static Web Apps supplies the `/api` prefix. Do not add CORS headers: the managed API shares the Static Web App origin.
- Keep handlers as exported functions accepting an injected token verifier, repository, and clock so unit tests can run without Azure or Cosmos. Production registration composes these dependencies from environment configuration.
- Require `Authorization: Bearer <access-token>`. Missing or invalid token returns `401 { error: { code: "UNAUTHENTICATED", message: "A valid company access token is required." } }`.
- Verify RS256 signatures with the tenant OpenID Connect JWKS matching the token version (`/discovery/keys` for v1; `/discovery/v2.0/keys` for v2). Require the exact tenant issuer matching the token version and audience `ENTRA_API_AUDIENCE` or its corresponding `api://` Application ID URI.
- Reject tokens whose `tid` differs from `ENTRA_TENANT_ID`, whose `oid` or `name` claim is missing/empty, or whose whitespace-delimited `scp` claim lacks `leaderboard.access`. Valid signature with wrong tenant, audience, or scope returns 403; malformed, expired, or bad-signature tokens return 401.
- POST body must be a JSON object containing exactly one property, `completedBattles`, as integer 1 through 12. Reject extra fields, missing fields, decimals, strings, and out-of-range values with `400 INVALID_PROGRESS`.
- Never accept `userId`, `displayName`, `recordedAt`, or a run/deck payload from the client. Obtain identity only from verified claims and time from the injected server clock.
- GET returns `{ items }` with zero to ten records. POST returns `{ record, updated }`; use 200 for both newly recorded and unchanged/replaced best records.
- Missing runtime settings return a generic 503 configuration error without exposing setting names or secret values. Unexpected repository failures return generic 503 `LEADERBOARD_UNAVAILABLE`; log only a correlation identifier and safe error metadata, never bearer tokens or Cosmos keys.

### I02. API auth and handler tests

- Related Files:
  - `apps/leaderboard-api/src/auth/entraBearer.ts` :: implement `createEntraTokenVerifier`; new
  - `apps/leaderboard-api/src/auth/entraBearer.test.ts` :: test signed tokens and claim rejection; new
  - `apps/leaderboard-api/src/functions/leaderboard.test.ts` :: test HTTP behavior with injected verifier/repository; new
  - `apps/leaderboard-api/src/leaderboard/validation.test.ts` :: test strict payload schema; new

#### Details

- Use `jose` `createRemoteJWKSet` and `jwtVerify`; allow an injected `JWTVerifyGetKey` for deterministic tests.
- Cover valid tenant token with scope, missing bearer token, malformed token, bad signature, expired token, wrong issuer, wrong audience, wrong tenant, missing `oid`, missing `name`, missing scope, unsupported HTTP method, invalid JSON, extra body properties, `completedBattles` values below 1/above 12/noninteger, repository unavailable, and valid GET/POST response contracts.
- Confirm a body attempting to forge `userId` or `displayName` is rejected and repository receives identity from the verified principal only.
- Add `@azure/functions`, `jose`, and `zod` as runtime dependencies; keep Cosmos initialization and its dependency in T02 so endpoint/auth tests do not require a Cosmos account.

## Acceptance Criteria

- [x] Functions v4 project exposes only the two specified HTTP routes through the SWA `/api` prefix.
- [x] API rejects tokens that fail signature, issuer, audience, tenant, identity-claim, or `leaderboard.access` scope validation.
- [x] API rejects malformed/forged client payloads and derives employee identity exclusively from verified claims.
- [x] API contract and error responses match this task exactly; handlers are testable with injected dependencies.
- [x] Existing `apps/api` Express endpoints and P01 localStorage flow are not changed by this task.

## Validation

- `npm test -- apps/leaderboard-api/src/auth apps/leaderboard-api/src/functions apps/leaderboard-api/src/leaderboard/validation`
- `npm run build --workspace @board-game/leaderboard-api`
- `npm run lint -- apps/leaderboard-api/src`

## Commit Message

```text
feat(api): add Entra-protected Functions leaderboard endpoints

Plan: 2026-10-26-cosmos-leaderboard-api
Phase: P01-swa-leaderboard
Task: T01-managed-leaderboard-api

- Add Node.js Functions v4 leaderboard HTTP routes and strict API contracts
- Validate tenant, audience, signature, identity claims, and delegated scope
```

## Progress

- [x] Implementation complete
- [x] Validation passed
- commit: recorded in git history
