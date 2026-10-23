# P01 — Entra Login and Browser-Local Run

**Status:** in progress  
**Progress:** 1 / 4 tasks complete (active: T02)

## Outcome

Players sign in through Microsoft Entra ID, then play with their active `RunState` stored locally under their Entra identity. Local development and the Azure-hosted game can run without Cosmos DB or a game API. Storage failure does not block the current session, but the UI explains that progress may be lost on refresh.

## Tasks

| Task | Name | Status |
| --- | --- | --- |
| T01 | Account-scoped local run storage | done |
| T02 | Entra-only authentication and local run lifecycle | in progress |
| T03 | Run without Cosmos/API dependencies | pending |
| T04 | Configuration and operating documentation | pending |

