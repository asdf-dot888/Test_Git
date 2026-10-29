# Task: T07 Six-Minion Run Persistence Limit

## Status: pending

## Goal

Make the API accept and persist battle snapshots with up to six minions on each side, matching the engine's board capacity, and reject snapshots above that capacity.

## Decision Summary

- Both player and enemy boards can contain at most six minions.
- Keep the current per-minion schema and all other run limits unchanged.

## Implementation

### I01. Align saved battle validation with engine capacity

- Related Files:
  - `apps/api/src/routes/runRoutes.ts` :: `battleSchema.playerBoard` and `battleSchema.enemyBoard`; modify.

#### Details

- Change `playerBoard: z.array(minionSchema).max(5)` to `playerBoard: z.array(minionSchema).max(6)`.
- Change `enemyBoard: z.array(minionSchema).max(5)` to `enemyBoard: z.array(minionSchema).max(6)`.
- Leave `minionSchema`, other battle fields, authentication, owner lease, and ETag handling unchanged.
- Validation occurs on `PUT /api/run` through `runBody.safeParse`; invalid payloads continue returning HTTP 400 with error code `INVALID_BODY` before repository save is called.

### I02. Cover six-slot acceptance and over-capacity rejection

- Related Files:
  - `apps/api/src/routes/runRoutes.test.ts` :: authenticated Run API `PUT /api/run` tests; modify.

#### Details

- Build valid `MinionState` fixtures with fields `instanceId`, `cardId`, `owner`, `attack`, `health`, `maxHealth`, `summonedTurn`, and `hasAttacked`.
- Seed the fake repository with `createRun(seed)` and submit a full valid run with `PUT /api/run`, `If-Match: etag-1`, and `x-run-owner: ownerId`.
- Add one case with six distinct player minions and six distinct enemy minions; assert HTTP 200 and both six-item boards reach `repository.save`.
- Add rejection cases with seven player minions and seven enemy minions; assert HTTP 400, response error code `INVALID_BODY`, and no repository save call for each case.
- Reset or reseed the fake repository between requests so ETag and call-count assertions are isolated.

## Acceptance Criteria

- [ ] `PUT /api/run` accepts a state containing six minions on both boards simultaneously.
- [ ] `PUT /api/run` rejects seven minions on either board with HTTP 400 before persistence.
- [ ] Existing validation for minion fields and unrelated run fields is unchanged.

## Validation

- `npm test --workspace @board-game/api -- src/routes/runRoutes.test.ts` — six-slot acceptance and seven-slot rejection cases pass.
- `npm run build --workspace @board-game/api` — API TypeScript build passes.

## Commit Message

```text
fix(api): accept six-minion battle snapshots

Plan: 2026-10-29-mobile-card-ux-opening-redraw-victory
Phase: P01-mobile-and-battle-polish
Task: T07-six-minion-run-persistence

- Match both API board limits to the engine's six-minion capacity
- Cover six-minion saves and reject over-capacity states
```

## Progress

- [ ] Implementation complete
- [ ] Validation passed
- commit: pending
