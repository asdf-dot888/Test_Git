# Plan: Entra Login, Browser-Local Runs, and Informal Progress Leaderboard

**Date:** 2026-10-23  
**Status:** planned  
**Decision record:** `.memory/decisions/2026-10-23-entra-local-storage-and-leaderboard.md`

## Goal

Require Microsoft Entra ID sign-in to play, while keeping the active game run in the signed-in user's browser storage. The current mode must run locally and on the Azure-hosted SPA without requiring Cosmos DB or a game API. Plan the informal employee progress leaderboard as a later, separate feature: on battle victories, the browser reports the user's best completed progress to an API backed by Cosmos DB. The leaderboard is not anti-cheat protected.

## Accepted decisions

- Use MSAL in the React SPA for Entra sign-in. Login-only mode requires a SPA tenant ID and client ID, not a game API scope or API permission.
- Store the complete active `RunState` in `localStorage`, scoped by the authenticated Entra object ID. It is local to that browser/device; do not sync active runs to Cosmos.
- If storage is blocked or fails, allow play for the current session and clearly warn that a refresh or browser close can lose progress.
- A later leaderboard stores each employee's best completed campaign progress, updated after victories only. Do not publish in-progress runs.
- Use the Entra display name and authenticated object ID. Show exactly the top 10 employees, ordered by completed progress descending; for ties, the earlier achieved record ranks first.
- This is an informal internal leaderboard. Accept client-reported progress after victory; anti-cheat measures are out of scope.

## Phases

| Phase | Scope | Status |
| --- | --- | --- |
| P01 — Entra login and browser-local run | Remove game API/Cosmos from the current playable path; authenticate and persist runs in the browser | pending |
| P02 — Informal progress leaderboard | Add a separate authenticated API/Cosmos flow for best completed progress and top-10 display | pending, intentionally after P01 |

## Execution rules

Execute one task at a time from `.memory/current.md`. Each task blueprint lists its implementation scope, data contracts, validation commands, and commit message. Do not start P02 until P01 is complete and the leaderboard infrastructure is ready.

