# Plan: Local Leaderboard API Test

## Goal

Let the user run the React game, Static Web Apps local emulator, Functions v4 leaderboard API, and Azurite together at `http://localhost:4280` and read/write the existing Cosmos leaderboard using Entra authentication. Keep `npm run dev` on port 5173 unchanged, and keep Cosmos credentials out of tracked files and browser code.

## Phases

| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `done` | Add the integrated local runner, align Cosmos defaults/docs, install Functions Core Tools, and verify the real local API flow. | [P01](../phases/2026-10-26-local-leaderboard-api-test/P01-local-integration/phase.md) |

## Status

Complete. The local Entra-authenticated leaderboard GET and progress POST both returned HTTP 200 against `mango-stone/leaderboard-progress`.
