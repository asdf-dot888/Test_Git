# T02 — Victory Submission and Top-10 UI

**Status:** pending  
**Plan:** `2026-10-23-entra-local-storage-and-leaderboard`  
**Phase:** P02 — Informal Progress Leaderboard

## Objective

Submit completed progress to the leaderboard after battle victories and let employees view the top 10 from the game UI, without moving active game saves out of browser storage.

## Files and symbols

- `apps/web/src/auth/authConfig.ts`, `AuthProvider.tsx`, `authState.ts`: add optional API-scope acquisition for leaderboard calls. SPA-only play must continue to work when leaderboard settings are absent; request API consent only when a leaderboard request is made.
- Add `apps/web/src/leaderboard/leaderboardClient.ts` and tests: call `GET /api/leaderboard` and `POST /api/leaderboard/progress` with an MSAL access token. Send only completed battle count.
- Integrate victory lifecycle in `apps/web/src/App.tsx` or the existing victory handler: after the player confirms a victory and the completed-battle count is persisted locally, submit that count. Avoid posting during ordinary state updates or for a defeat/in-progress run.
- Add a leaderboard view/modal reachable from the main menu, with rank, Entra display name, and derived campaign progress. Show at most 10 rows and provide loading, empty, and recoverable error states.
- Add/update `apps/web/src/App.test.tsx` and leaderboard client/component tests for victory-only submission, token/API errors, response ordering, and display labels.
- Update `README.md` and `docs/azure-setup.md` with API permission consent, Cosmos container settings, deployment configuration, and the informal client-reported nature of scores.

## Behavior rules

- Submit after a victory only. The API retains a score only if it beats the user's existing best.
- Do not send deck, health, current encounter, timer, or the full `RunState`.
- Do not block gameplay or reward selection on leaderboard availability. Show a non-blocking status/error and allow the user to retry a failed submission.
- The ranking is global to employees in the configured tenant and contains at most 10 entries.

## Acceptance criteria

- Existing Entra login-only play works when leaderboard API scope/config is not enabled.
- A victory results in a single progress submission with the completed battle count.
- Defeats and routine autosaves do not submit ranking data.
- The UI renders the API's top 10 and reports API unavailability without blocking the game.
- Active campaign saves remain account-scoped in `localStorage`.

## Validation

- `npm test -- apps/web/src/leaderboard`
- `npm test -- apps/web/src/App.test.tsx`
- `npm run build`

## Commit

`Plan: 2026-10-23-entra-local-storage-and-leaderboard P02-T02 add victory reporting and leaderboard UI`

