# Plan: Static Web Apps API Package Fix

## Goal

Make the already deployed leaderboard Functions API start on Azure Static Web Apps by packaging its runtime dependencies with the API artifact. The deployed site must return HTTP 200 and an unauthenticated `GET /api/leaderboard` must return HTTP 401 rather than 404.

## Phases

| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `done` | Stage and deploy a self-contained Node.js 22 leaderboard API, then smoke-check the public route. | [P01](../phases/2026-10-26-swa-api-package-fix/P01-standalone-api-deployment/phase.md) |

## Status

Complete. The site is deployed at `https://mango-stone-0631f0d00.5.azurestaticapps.net`; the API now responds from the deployment and returns HTTP 401 when called without an Entra bearer token.
