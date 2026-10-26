# Task: T01 Integrated Local Runner

## Status: done

## Goal

Add one root command that builds the web app and starts Azurite and the Static Web Apps CLI together, serving the React UI and local Functions API at `http://localhost:4280`. Preserve the existing frontend-only `npm run dev` behavior on port 5173.

## Decision Summary

- Use the existing root `concurrently` and SWA CLI dependencies; add project-local `azurite`, `wait-on`, and Node 22 development dependencies so local storage startup is repeatable and the SWA CLI runs on a supported Node version.
- Azurite supplies `AzureWebJobsStorage=UseDevelopmentStorage=true` for the local Functions host. The leaderboard API still connects to the real Cosmos account using ignored `apps/leaderboard-api/local.settings.json`.
- Bind the SWA emulator to `127.0.0.1:4280`; do not expose local development services on the network.

## Implementation

### I01. Add project-local Azurite and readiness dependencies

- Related Files:
  - `package.json` :: root scripts and `devDependencies`; modify
  - `package-lock.json` :: lock the new root workspace dependencies; modify
  - `.gitignore` :: ignore the Azurite data directory; modify

#### Details

- Add `azurite` and `wait-on` to root `devDependencies`; retain existing `concurrently` and `@azure/static-web-apps-cli` dependencies.
- Add `node@22` to root `devDependencies`. SWA CLI 2.1.0 rejects Node 24 even though the Functions runtime itself supports it; run the CLI and local API worker with the pinned Node 22 executable while the existing build continues to use the repository's Node 24 requirement.
- Add `.azurite/` to `.gitignore`. Do not ignore or remove `apps/leaderboard-api/local.settings.json`; it is already Git-ignored and holds user-local credentials.
- Do not add a Cosmos connection string, account key, Entra token, or any `VITE_COSMOS_*` setting to package scripts, lockfiles, source code, or logs.

### I02. Add the integrated local command

- Related Files:
  - `package.json` :: `scripts.dev` and new `scripts.dev:swa`; modify
  - `apps/web/package.json` :: existing `scripts.build`; read-only
  - `apps/leaderboard-api/host.json` :: Functions runtime configuration; read-only
  - `apps/leaderboard-api/local.settings.json` :: local Functions settings; read-only, never stage or print

#### Details

- Preserve the existing root script `"dev": "npm run dev --workspace @board-game/web"` exactly.
- Add a root script with this behavior and equivalent shell-safe quoting. On Windows, after the production build, prepend `node_modules/node/bin` and `%ProgramFiles%\Microsoft\Azure Functions Core Tools` to `PATH` before launching Azurite and SWA CLI. This keeps the build on the configured Node 24 and runs the emulator stack on Node 22.
  1. Run `npm run build` from the repository root so `apps/web/dist` and `apps/leaderboard-api/dist` exist.
  2. Start Azurite with `azurite --silent --location .azurite`.
  3. Wait until local Blob, Queue, and Table endpoints on TCP ports 10000, 10001, and 10002 are ready.
  4. Start `swa start apps/web/dist --api-location apps/leaderboard-api --host 127.0.0.1 --port 4280`.
  5. Stop the sibling process when either Azurite or SWA CLI exits, including Ctrl+C, so no orphan emulator process remains.
- Use the root `concurrently` package to manage the two long-running commands and the `wait-on` package for the three Azurite TCP readiness checks. The intended script shape is:
  ```json
  "dev:swa": "npm run build && set \"PATH=%CD%\\node_modules\\node\\bin;%ProgramFiles%\\Microsoft\\Azure Functions Core Tools;%PATH%\" && concurrently --kill-others -n azurite,swa \"azurite --silent --location .azurite\" \"wait-on tcp:10000 tcp:10001 tcp:10002 && swa start apps/web/dist --api-location apps/leaderboard-api --host 127.0.0.1 --port 4280\""
  ```
- The SWA CLI must use the compiled web output and `apps/leaderboard-api` as its API location. Do not run the SPA on Vite port 5173 from this command.
- On missing or invalid local Functions settings, show the missing setting names only; never print their values. Do not auto-create or overwrite `local.settings.json`.

## Acceptance Criteria

- [x] `npm run dev` remains the existing Vite-only workflow on port 5173.
- [x] `npm run dev:swa` builds successfully, starts Azurite before the Functions host attempts its storage connection, and serves the app at `http://localhost:4280`.
- [x] The SWA local emulator routes `/api/leaderboard` to the Functions API in `apps/leaderboard-api` (unauthenticated request returns the expected 401).
- [x] Ctrl+C stops both local services and leaves no listener on ports 10000-10002 or 4280.
- [x] `.azurite/` and `apps/leaderboard-api/local.settings.json` are ignored by Git.

## Validation

- `npm.cmd install`
- `npm.cmd run build`
- `npm.cmd run lint`
- `npm.cmd run dev:swa` (manual run; confirm the printed URL is `http://localhost:4280`, then stop with Ctrl+C)
- `Test-NetConnection 127.0.0.1 -Port 4280` after stopping the runner (expected: `TcpTestSucceeded: False`)

Validation note: `npm.cmd run lint` reports three pre-existing errors in `apps/web/src/game/useLocalRun.ts`; the leaderboard API workspace lint passes. The full lint errors are outside this runner task.

## Commit Message

```text
feat(dev): add integrated local leaderboard runner

Plan: 2026-10-26-local-leaderboard-api-test
Phase: P01-local-integration
Task: T01-integrated-local-runner

- Start Azurite and SWA CLI together on localhost:4280
- Preserve the existing Vite-only dev command
```

## Progress

- [x] Implementation complete
- [x] Validation completed (build and integrated runner passed; API workspace lint passed)
- commit: `pending`
