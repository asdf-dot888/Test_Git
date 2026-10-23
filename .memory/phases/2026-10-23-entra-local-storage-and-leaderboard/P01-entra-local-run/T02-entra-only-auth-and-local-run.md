# T02 — Entra-Only Authentication and Local Run Lifecycle

**Status:** done  
**Plan:** `2026-10-23-entra-local-storage-and-leaderboard`  
**Phase:** P01 — Entra Login and Browser-Local Run

## Objective

Make Entra sign-in the gate for the game, but remove API-token and server-run synchronization requirements from the playable run lifecycle. Restore and save the current user's game with the P01-T01 browser storage adapter.

## Files and symbols

- `apps/web/src/auth/authConfig.ts`: reduce the current login configuration to `tenantId`, `clientId`, and `redirectUri`; remove required API scope from login-only mode. Configure MSAL for OIDC sign-in using the account identity needed by the app.
- `apps/web/src/auth/AuthProvider.tsx` and `apps/web/src/auth/authState.ts`: expose the signed-in account's stable Entra object ID (`homeAccountId`/`localAccountId` as appropriate to the token claims; prefer the `oid` claim when available), display name, sign-in, and sign-out. Remove `getApiToken` from the current login-only contract.
- `apps/web/src/main.tsx` and `apps/web/src/auth/AuthConfigurationPage.tsx`: request only the tenant and SPA client ID; explain that the SPA registration must allow the current origin as a redirect URI. Do not ask users to enter API scope for login-only operation.
- `apps/web/src/App.tsx`: replace `useRunSync` use with local run lifecycle. Load the signed-in account's saved run, create a fresh run if none exists, persist state changes locally, and keep victory/reward/defeat progression working.
- Add or update `apps/web/src/game/useLocalRun.ts` (or the smallest equivalent hook/controller) to connect React state to `LocalRunStorage`, including storage warning state.
- Update `apps/web/src/game/useRunSync.ts` and its tests only as needed to remove the active game dependency; preserve files only if another still-active feature requires them.
- Update `apps/web/src/App.test.tsx`, auth tests, and game-hook tests for authenticated load, new-run creation, account switching/isolation, sign-out, and storage failure.

## Behavior and state rules

- A user must be authenticated before accessing the game or saved run.
- Key saved state by authenticated Entra object ID, never by display name or a client-supplied arbitrary identity.
- Persist every meaningful `RunState` transition, including battle progress, reward selection, roadmap movement, and victory/defeat state.
- On local-storage failure, continue the current in-memory session and show a persistent, visible notice that reloading or closing the tab can lose progress.
- Do not add cross-device synchronization, API calls, run locks, or Cosmos persistence in P01.

## Acceptance criteria

- Valid tenant/client configuration presents Entra login and authenticated users can start or resume a browser-local run.
- No API audience or Cosmos configuration is needed by React to play.
- Switching authenticated accounts reads only that account's local run.
- Storage failure is non-fatal and communicated clearly.

## Validation

- `npm test -- apps/web/src/auth/authConfig.test.ts apps/web/src/App.test.tsx`
- `npm test -- apps/web/src/game/useLocalRun.test.tsx`
- `npm run build`

## Commit

`Plan: 2026-10-23-entra-local-storage-and-leaderboard P01-T02 Entra-only auth and local run lifecycle`

