# Plan: Cosmos Leaderboard API on Static Web Apps Free

## Goal

Add an Entra-protected, informal top-10 leaderboard to the existing game without creating a separately billed API hosting resource. Use the existing Azure Static Web Apps Free managed Functions API and existing Cosmos DB account. Keep full active expedition state in account-scoped browser `localStorage`; submit only completed battle count after victory. The leaderboard is client-reported and is not anti-cheat protected.

## Accepted decisions

- Existing Azure Static Web App: `board-card-roguelike-demo` in resource group `grill-me-edu`.
- Existing Entra tenant ID: `69c1e470-4528-435a-a1ae-de98e0aac738`; existing SPA/API app registration client ID: `86862438-ff66-4df4-8302-802115dfed70`.
- Add delegated scope `leaderboard.access` to that same app registration. The v2 API token audience is the API app's client ID; the scope requested by MSAL is `api://86862438-ff66-4df4-8302-802115dfed70/leaderboard.access`.
- Use the existing Cosmos account in `grill-me-edu`, with a dedicated `card-roguelike` database and `leaderboard-progress` container partitioned by `/userId`.
- Store the Cosmos account key as a server-side Static Web Apps API application setting. Never expose it through Vite `VITE_*` variables or browser code.
- The API returns the top ten scores ordered by `completedBattles` descending, then `recordedAt` ascending. It derives employee ID and display name from validated Entra claims and never trusts those values in a request body.
- The managed API avoids a separate API hosting charge; Cosmos DB usage and storage may still incur charges.

## Phases

| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `in_progress` | Implement the managed Functions API, Cosmos repository, game integration, and manual SWA deployment configuration | [P01](../phases/2026-10-26-cosmos-leaderboard-api/P01-swa-leaderboard/phase.md) |

## Execution rules

- The previous P02 blueprint assumed Express on App Service and Managed Identity. It is superseded by this plan's Static Web Apps Free managed Functions API and server-side Cosmos key.
- Execute one Task at a time from `.memory/current.md`.
- Do not send or store a full run state in Cosmos. Keep leaderboard failures non-blocking to gameplay.
- Do not print, commit, or bundle the Cosmos account key or Static Web Apps deployment token.
