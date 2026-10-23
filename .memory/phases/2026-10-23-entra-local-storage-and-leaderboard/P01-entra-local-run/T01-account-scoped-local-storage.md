# T01 — Account-Scoped Local Run Storage

**Status:** done  
**Plan:** `2026-10-23-entra-local-storage-and-leaderboard`  
**Phase:** P01 — Entra Login and Browser-Local Run

## Objective

Add a small, typed persistence adapter for the complete game `RunState`, with each signed-in Entra account's run isolated from other accounts in the same browser.

## Files and symbols

- Add `apps/web/src/game/localRunStorage.ts`:
  - Export `LocalRunStorage` with `load(userId)`, `save(userId, run)`, and `clear(userId)` operations.
  - Export a factory that accepts a `Storage` implementation so tests can inject a fake or throwing storage object.
  - Use a stable key prefix such as `board-card-roguelike:run:v1:` followed by an encoded Entra object ID.
- Add `apps/web/src/game/localRunStorage.test.ts` covering independent account keys, round-trip persistence of the full `RunState`, empty storage, malformed/unsupported envelope, and read/write/remove exceptions.
- Reuse the canonical `RunState` type from `packages/game-core/src/types.ts`; do not create a second game-state schema.

## Data contract

Persist an envelope with:

```ts
type StoredRunEnvelope = {
  schemaVersion: 1;
  userId: string;
  savedAt: string;
  run: RunState;
};
```

Validate the envelope version and matching `userId` when loading. Treat malformed, unsupported, or cross-account data as unavailable rather than returning it as a valid run. Return a typed result that lets the caller distinguish no saved run from storage failure. Do not store access tokens, ID tokens, or other credentials.

## Acceptance criteria

- One account cannot load or overwrite another account's saved run.
- Saving and loading preserves all `RunState` fields, including encounter state, pending rewards, and turn timer.
- Storage exceptions are surfaced as a recoverable result; the adapter does not crash the game.
- No API or Cosmos client is introduced in this task.

## Validation

- `npm test -- apps/web/src/game/localRunStorage.test.ts`
- `npm run build`

## Commit

`Plan: 2026-10-23-entra-local-storage-and-leaderboard P01-T01 account-scoped local run storage`

