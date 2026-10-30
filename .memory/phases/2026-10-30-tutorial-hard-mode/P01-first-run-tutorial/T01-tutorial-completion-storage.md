# Task: T01 Tutorial Completion Storage

## Status: pending

## Goal

Persist whether the signed-in user has completed or skipped the first-run tutorial in this browser, and expose safe load/save helpers for the tutorial UI.

## Decision Summary

- Store completion per Entra `userId` in `window.localStorage`.
- Skipping counts as completion. Replaying the tutorial does not erase completion or alter the active run.

## Implementation

### I01. Add a versioned tutorial progress storage module

- Related Files:
  - `apps/web/src/game/tutorialProgress.ts` :: create tutorial completion read/write helpers; new
  - `apps/web/src/game/tutorialProgress.test.ts` :: cover valid, missing, malformed, and storage-error data; new

#### Details

- **Signatures & Types**:
  ```typescript
  export interface TutorialProgress {
    schemaVersion: 1;
    userId: string;
    completed: true;
    completedAt: string;
  }

  export type TutorialProgressResult =
    | { status: "completed"; progress: TutorialProgress }
    | { status: "not-completed" }
    | { status: "error"; error: unknown };

  export function loadTutorialProgress(storage: Storage, userId: string): TutorialProgressResult;
  export function markTutorialCompleted(storage: Storage, userId: string, completedAt?: Date): { status: "saved" } | { status: "error"; error: unknown };
  ```
- **Data & Schema Fields**:
  - Storage key: `board-card-roguelike:tutorial:v1:${encodeURIComponent(userId)}`.
  - JSON value: exactly `{ schemaVersion: 1, userId, completed: true, completedAt }`.
  - `completedAt` is `Date.toISOString()`. Reject records with mismatched user ID, schema version, completion value, or invalid date as `not-completed`; never throw for malformed JSON.
- **Execution Flow / Logic**:
  1. Return `not-completed` for empty storage or malformed/unsupported content.
  2. Catch `getItem` and `setItem` errors and return `status: "error"` with the original error.
  3. Allow a caller-provided date for deterministic tests; default to `new Date()`.
  4. Use the existing `userId` from `useAuth()`; do not store a display name or access token.

### I02. Cover storage behavior

- Related Files:
  - `apps/web/src/game/tutorialProgress.test.ts` :: `loadTutorialProgress`, `markTutorialCompleted`; new

#### Details

- Cover empty storage, valid completion, wrong user, wrong schema, invalid timestamp, invalid JSON, blocked storage reads, blocked storage writes, and the exact encoded key.
- Assert replay does not require or invoke a completion reset function; no reset API is part of this module.

## Acceptance Criteria

- [ ] Completion can be read and written independently for two user IDs.
- [ ] Malformed or inaccessible storage never crashes the app.
- [ ] Saved data contains only the schema fields above and no credentials or profile data.

## Validation

- `npm run test --workspace @board-game/web -- src/game/tutorialProgress.test.ts`
- `npm run build --workspace @board-game/web`

## Commit Message

```text
feat(tutorial): persist per-user tutorial completion

Plan: 2026-10-30-tutorial-hard-mode
Phase: P01-first-run-tutorial
Task: T01-tutorial-completion-storage

- Add versioned local tutorial progress storage
- Cover account isolation and storage failures
```

## Progress

- [x] Implementation complete
- [x] Validation passed
- commit: pending

