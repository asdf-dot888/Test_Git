# Decisions: Cosmos leaderboard API

- Date: 2026-10-23
- Status: Confirmed

## D01. Cosmos DB purpose
- **Chosen**: Use Cosmos DB only for the internal progress leaderboard. Keep the active expedition state in browser `localStorage`.
- **Rationale**: The leaderboard needs shared durable data; full run synchronization is out of scope.

## D02. Cosmos account and data model
- **Chosen**: Reuse the existing Cosmos DB account in resource group `grill-me-edu`; create a dedicated `card-roguelike` database and `leaderboard-progress` container partitioned by `/userId`.
- **Record**: Store one best-progress record per Entra employee with the verified `userId` (`oid`), Entra display name, highest `completedBattles`, record timestamp, and schema version.
- **Rationale**: Keep this game's records isolated from other applications while reusing the provisioned account.

## D03. Leaderboard API and authentication
- **Chosen**: Implement `POST /api/leaderboard/progress` and `GET /api/leaderboard` as HTTP-triggered Functions in the existing Azure Static Web Apps Free managed API.
- **Entra**: Add one delegated `leaderboard.access` scope to the existing SPA app registration. The React SPA requests that scope for leaderboard calls. The API validates the access token and derives employee identity and display name from verified claims; it never trusts a user ID or name supplied by the request body.
- **Submission**: On each battle victory, submit only `{ completedBattles }`. Accept progress from 1 through 12 and update the record only when the reported value is higher. Anti-cheat validation is out of scope; this is an informal internal ranking.
- **Query**: Return the top ten records ordered by completed battles descending, breaking ties by earlier record timestamp.

## D04. API hosting and Cosmos credentials
- **Chosen**: Use Static Web Apps Free's managed Functions API; do not create a separate App Service or Functions resource for the leaderboard API.
- **Cosmos access**: Store the Cosmos account key as a server-side Static Web Apps API application setting. The function reads it from the environment; it is never included in the React bundle or sent to the browser.
- **Rationale**: Avoid an additional API hosting resource and its separate hosting charge. The managed API does not support managed identity, so this design uses a server-side Cosmos key instead.
- **Cost note**: Cosmos DB usage and storage may still incur charges. The managed API has platform limits and supports HTTP triggers.
