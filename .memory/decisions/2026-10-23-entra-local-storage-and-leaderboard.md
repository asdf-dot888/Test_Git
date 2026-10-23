# Decisions: Entra login, browser saves, and progress leaderboard

- Date: 2026-10-23
- Status: Confirmed

## D01. Entra-only authentication mode
- **Chosen**: Authenticate the React SPA directly with MSAL. The current login-only mode needs the SPA's tenant ID and client ID plus a registered redirect URI; it does not require the game API, API audience, or API scope. The game does not call the game API or Cosmos DB for sign-in or run storage.
- **Rationale**: Verify company Entra login independently from game-state persistence and the backend. The SPA app registration still needs to exist in the company tenant before a user can sign in.

## D02. Game save storage
- **Chosen**: Store the full active `RunState` in browser `localStorage` in both local development and the Azure-hosted game. Use the signed-in Entra user's stable object ID as part of the storage key so accounts in the same browser have separate saves.
- **Rationale**: Keep each player's game progress without depending on Cosmos DB. This is browser/device-local and does not synchronize across devices.

## D03. Browser storage failure
- **Chosen**: If `localStorage` is unavailable or writing fails, show a clear warning and allow play for the current session without persistence. Warn that refreshing or closing the page can lose that session's progress.
- **Rationale**: Allow authentication and gameplay tests to continue while making the persistence limitation visible.

## D04. Cosmos DB purpose
- **Chosen**: Do not use Cosmos DB to persist full battle or expedition state. The future Cosmos use is a separate leaderboard that stores each employee's best completed progress, not their full run.
- **Rationale**: Cosmos is intended to power the employee ranking menu, rather than act as the game's live save system.

## D05. Leaderboard identity and record
- **Chosen**: Show the employee display name from Entra. Keep one best-progress record per employee across expeditions. Record a new best only after a battle victory; do not publish an in-progress battle state.
- **Rationale**: Keep the ranking readable and avoid writes on every turn. The record represents the furthest completed encounter.

## D06. Leaderboard ordering and ties
- **Chosen**: Show exactly ten employees, ordered by completed campaign progress. For equal progress, the employee who achieved that record earlier ranks first.
- **Rationale**: The leaderboard highlights the most advanced completed runs and has a deterministic tenth-place cutoff.

## D07. Leaderboard trust model
- **Chosen**: Treat the future ranking as an informal, internal social feature. The API may accept the best progress reported by the browser after victory; anti-cheat validation is out of scope.
- **Rationale**: Keep the feature lightweight. Because browser storage and client reports can be edited, ranking results are not verified competitive results.

## D08. Current API and run synchronization
- **Chosen**: The active game flow uses browser storage and does not call the existing full-run synchronization API. A future leaderboard will use a separate API flow that submits progress after victory.
- **Rationale**: Avoid coupling Entra login and gameplay to the current Cosmos active-run repository, whose data model does not match the intended leaderboard purpose.
