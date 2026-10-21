# Task: T02 Cosmos 활성 런 저장소와 잠금

## Status: done

## Goal
계정당 Cosmos DB에 활성 판 문서 하나를 저장하고, 15분 동안 실제 입력이 없는 경우에만 다른 기기가 같은 판의 편집권을 얻도록 하는 저장소 계층을 만든다.

## Decision Summary
- Cosmos DB for NoSQL 컨테이너 partition key는 `/userId`; `userId`는 인증 middleware가 검증한 Entra `oid`다.
- Azure에서는 App Service Managed Identity, 로컬에서는 `DefaultAzureCredential`을 사용한다. DB에는 활성 판만 저장하고 terminal/abandon 시 문서를 지운다.

## Implementation

### I01. Cosmos client와 document repository
- Related Files:
  - `apps/api/src/db/cosmosClient.ts` :: `createCosmosClient`, `getActiveRunContainer` — client wiring; new
  - `apps/api/src/db/runRepository.ts` :: `RunRepository`, `CosmosRunRepository` — persistence and ETag operations; new
  - `apps/api/src/db/runDocument.ts` :: `ActiveRunDocument`, `SessionLease` — persisted schema; new
  - `apps/api/src/db/runRepository.test.ts` :: fake Cosmos adapter cases; new

#### Details
- **Signatures & Types**:
  ```typescript
  export interface SessionLease { ownerId: string; lastActivityAt: string; expiresAt: string; }
  export interface ActiveRunDocument {
    id: "active-run"; userId: string; schemaVersion: 1;
    run: RunState; lease: SessionLease | null;
    createdAt: string; updatedAt: string;
  }
  export interface RunRecord { document: ActiveRunDocument; etag: string; }
  export interface RunRepository {
    get(userId: string): Promise<RunRecord | null>;
    create(userId: string, run: RunState, ownerId: string, now: Date): Promise<RunRecord>;
    save(userId: string, ownerId: string, expectedEtag: string, run: RunState, now: Date): Promise<RunRecord>;
    acquire(userId: string, ownerId: string, now: Date): Promise<RunRecord>;
    recordActivity(userId: string, ownerId: string, now: Date): Promise<RunRecord>;
    delete(userId: string, ownerId: string): Promise<void>;
  }
  ```
- Database id `card-roguelike`; container `active-runs`; partition key `/userId`; document id constant `active-run`. ETag is the optimistic concurrency token.
- `createCosmosClient(config)` uses `new DefaultAzureCredential()` and `new CosmosClient({endpoint, aadCredentials})`; no account key or connection string.
- `create` uses conditional create. Existing document becomes `ActiveRunExistsError`; it never overwrites.
- `save` requires matching `ownerId` and `expectedEtag`; use `If-Match`. Precondition conflict becomes `RunConflictError`, never silently last-write-wins.
- `acquire`: no record → `RunNotFoundError`; absent/expired lease (`now >= expiresAt`) → claim for requester; active lease owned by another owner → `RunLockedError(expiresAt)`; same owner → renew.
- `recordActivity` sets `lastActivityAt=now`, `expiresAt=now+15 minutes`. It is called only after real player input/state action; a background interval alone cannot keep a lease alive.
- Only schema version 1 is readable. Unknown version returns `UnsupportedRunSchemaError` and preserves the document.
- `delete` requires matching lease owner; it is invoked only after run victory/defeat or explicit abandon.
- Map Cosmos 404 to missing; 409 to active record collision; 412 to ETag conflict; 429 uses SDK retry; 5xx/network to `RunStorageUnavailableError`. Do not leak SDK message or user IDs in errors.

### I02. Repository edge-case tests
- Test with a fake Container/SDK adapter, injected clock; no live Cosmos resource required.
- Cases: partition-scoped lookup, conditional create, owner-only save/delete, ETag conflict, lease acquisition, same-device renewal, different-device lock, takeover exactly at 15-minute expiry, wrong schema, 429 retry, service outage.

## Acceptance Criteria
- [ ] One active-run document exists per Entra `oid` partition and cannot be replaced during create.
- [ ] Lease unlocks at 15 minutes after last player input and is not extended by background polling.
- [ ] ETag conflict and owner mismatch fail safely without overwriting state.
- [ ] DB client uses managed identity/default credential and never reads Cosmos keys.

## Validation
- `npm run test --workspace @board-game/api` — repository tests pass with injected clock and fake Cosmos adapter.
- `npm run build --workspace @board-game/api` — strict TS compile passes.
- `npm run lint --workspace @board-game/api` — no lint/type errors.

## Commit Message
```text
feat(save): add Cosmos active run repository and lease

Plan: 2026-10-21-board-card-roguelike
Phase: P03-cloud-auth-save
Task: T02-cosmos-run-repository

- Store one run per Entra user with partitioned Cosmos documents
- Add ETag updates and 15-minute inactive-device takeover
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: `a7b01fd`
