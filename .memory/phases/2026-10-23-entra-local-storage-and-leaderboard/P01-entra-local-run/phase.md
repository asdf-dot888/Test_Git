# P01 — Entra Login and Browser-Local Run

**Status:** done  
**Progress:** 4 / 4 tasks complete

## Outcome

Players sign in through Microsoft Entra ID, then play with their active `RunState` stored locally under their Entra identity. Local development and the Azure-hosted game can run without Cosmos DB or a game API. Storage failure does not block the current session, but the UI explains that progress may be lost on refresh.

## Tasks

| Task | Name | Status |
| --- | --- | --- |
| T01 | Account-scoped local run storage | done |
| T02 | Entra-only authentication and local run lifecycle | done |
| T03 | Run without Cosmos/API dependencies | done |
| T04 | Configuration and operating documentation | done |

