# Current Context

## Active Plan
[Production Azure deployment](./plans/2026-10-23-production-azure-deployment.md)

## Active Phase
[P02 Manual App Service release](./phases/2026-10-23-production-azure-deployment/P02-manual-app-service-release/phase.md)

## Active Task
None. The planned release package and deployment runbook are complete.

## Status
- P01 Azure-only development and P02 manual release preparation are complete.
- Release ZIP packager commit: `b28f52f`.
- Manual deployment runbook commit: recorded in git history.
- No App Service has been deployed; the real game URL depends on administrator-provisioned Azure resources and app registrations.

## Next Step (IMPORTANT)
After the App Service, Entra app registrations, Cosmos DB container, managed identity permissions, and deployment access are ready, follow `docs/azure-setup.md` to build the production ZIP, deploy it, and run the smoke checks.
