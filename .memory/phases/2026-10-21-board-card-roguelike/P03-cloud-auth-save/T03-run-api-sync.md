# Task: T03 Run API와 자동 저장 UI

## Status: done

## Goal
로그인한 플레이어의 현재 판을 불러오고 주요 전투 행동 후 저장하며, 다른 기기의 잠금·저장 충돌·새 판 교체 확인을 사용자에게 안전하게 표시한다.

## Decision Summary
- API는 P03-T01에서 검증한 `AuthenticatedRequest.authUser.userId`와 P03-T02의 `RunRepository`만 사용한다. 브라우저가 전달한 user ID는 무시한다.
- 판은 카드 사용/공격/턴 처리/보상/페이즈 전환 후 자동 저장한다. 새 판은 기존 판 포기 확인 후에만 교체한다.

## Implementation

### I01. Authenticated run endpoints
- Related Files:
  - `apps/api/src/routes/runRoutes.ts` :: `createRunRouter` — API contracts; new
  - `apps/api/src/app.ts` :: `/api/run` mount and JSON error handler — modify
  - `apps/api/src/routes/runRoutes.test.ts` :: HTTP contract tests — new

#### Details
- **Signatures & Types**:
  ```typescript
  export function createRunRouter(deps: {
    repository: RunRepository; now?: () => Date; newOwnerId?: () => string;
    newRun?: (seed: number) => RunState;
  }): import("express").Router;
  ```
- Route contracts:
  - `GET /api/run` → 200 `{run:null}` or 200 `{run:RunState,etag:string,lease:{owned:boolean,expiresAt:string|null}}`. If a nonexpired lease belongs to another device, return 423 `{error:{code:"RUN_LOCKED",expiresAt}}` and omit mutable run data.
  - `POST /api/run` body `{seed:number}` creates a new run and initial lease. Existing active run → 409 `{error:{code:"ACTIVE_RUN_EXISTS"}}`. Never overwrite.
  - `PUT /api/run` body `{run:RunState}`, `If-Match:<etag>` saves the full validated JSON state; return `{run,etag}`. Requires lease owner.
  - `POST /api/run/activity` body `{}` updates `lastActivityAt`/lease and returns `{expiresAt}`. Call only on explicit UI action.
  - `DELETE /api/run` body `{reason:"completed"|"abandoned"}` deletes current run only for lease owner; return 204.
- Validate body with `zod`: seed safe integer, run schema version and max JSON body 256 KiB. Ignore `userId` fields in all request bodies.
- Responses: 400 invalid body; 401 missing/invalid token; 403 tenant mismatch; 404 missing run for activity/save; 409 active-run or ETag conflict; 423 another device owns lease; 413 oversized state; 503 Cosmos unavailable. JSON error format `{error:{code:string,message:string,expiresAt?:string}}`; redact SDK internals.
- `GET /api/health` remains public and is mounted outside authenticated run router.

### I02. Web API client and run synchronization
- Related Files:
  - `apps/web/src/api/runClient.ts` :: `RunClient` — bearer fetch wrapper; new
  - `apps/web/src/game/useRunSync.ts` :: `useRunSync` — load/save/lease UI state; new
  - `apps/web/src/game/useGameSession.ts` :: connect persistence callbacks; modify
  - `apps/web/src/components/RunLockNotice.tsx` :: lock wait/retry message; new
  - `apps/web/src/components/AbandonRunDialog.tsx` :: explicit replacement confirmation; new
  - `apps/web/src/api/runClient.test.ts` :: fake fetch tests; new
  - `apps/web/src/game/useRunSync.test.tsx` :: save lifecycle UI tests; new
- **Signatures & Types**:
  ```typescript
  export class RunClient {
    constructor(baseUrl: string, getToken: () => Promise<string>, fetchImpl?: typeof fetch);
    getActiveRun(ownerId: string): Promise<ActiveRunResponse>;
    createRun(seed: number, ownerId: string): Promise<RunSaveResponse>;
    saveRun(run: RunState, etag: string, ownerId: string): Promise<RunSaveResponse>;
    recordActivity(ownerId: string): Promise<{ expiresAt: string }>;
    deleteRun(reason: "completed" | "abandoned", ownerId: string): Promise<void>;
  }
  export interface RunSyncState { status: "loading"|"ready"|"saving"|"locked"|"conflict"|"error"; etag: string|null; expiresAt: string|null; message: string|null; }
  ```
- Generate `ownerId` once per tab with `crypto.randomUUID()` and keep it in `sessionStorage`; use same ID through reload in that tab but not another browser/device.
- On authenticated app entry call GET. Load existing active run only after lease acquisition; 423 disables input and displays expiry/retry action, null opens new-run menu.
- Save after each committed game state action (card, attack, end-turn including AI, reward selection/skip, battle/phase transition). Serialize sequentially so a later write uses the prior returned ETag; never parallelize mutations.
- On 401 start sign-in; 409/412 retain last server-confirmed state and show reload/reconcile prompt; 423 disable game controls; 503 preserve in-memory state and show retry. No optimistic UI mutation is treated as durable until save confirms.
- If an active run exists and player chooses new game, `AbandonRunDialog` requires explicit confirm, then DELETE and POST. Cancel leaves run untouched.
- On final victory or defeat, show result first; after user exits result, DELETE active run with `reason="completed"` so account stores no history/meta progression.

### I03. API and UI verification
- API tests verify status/body/ownership for all routes, malformed bodies, oversized JSON, and unexpected repository failure.
- UI tests verify authenticated load, autosave after each action, sequential ETag use, lock display, recoverable save failure, and cancel/confirm replacement.

## Acceptance Criteria
- [ ] Account loads the active run and can continue on a different device after a free lease.
- [ ] A second active device sees a lock and cannot mutate the run until 15 minutes idle.
- [ ] Major game changes autosave sequentially and never silently overwrite another revision.
- [ ] A player must confirm before replacing an active run; victory/defeat removes active save after result display.

## Validation
- `npm run test --workspace @board-game/api` — all Run API HTTP contracts pass.
- `npm run test --workspace @board-game/web` — API client, auth, lock, autosave, and abandon flows pass.
- `npm run build` — all workspace production artifacts compile.

## Commit Message
```text
feat(save): connect authenticated run API and autosave UI

Plan: 2026-10-21-board-card-roguelike
Phase: P03-cloud-auth-save
Task: T03-run-api-sync

- Add authenticated active run endpoints and validation
- Sync game actions with ETag saves and device lock UI
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: pending
