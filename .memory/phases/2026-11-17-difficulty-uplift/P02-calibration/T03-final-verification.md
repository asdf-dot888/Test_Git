# Task: T03 Final Verification

## Status: done

## Goal
Confirm the targets on an independent seed with a larger sample, run all quality gates, update docs, and close the plan.

## Decision Summary
- D02: Normal 55-65%, Hard 6-10%, class gap <= 5pp; independent seed to avoid overfitting.
- D06: leaderboard, API, and save formats untouched; record the leaderboard comparability note.

## Implementation
### I01. Final measurement
- `npm run balance:sim -- --runs 1000 --seed 20281117 --label uplift-final --out docs/balance/2026-11-17-uplift-final.md` (both difficulties; about 20 minutes; run in the background).
- If a target or the class gap is missed, do not hand-wave: record the result and write a follow-up decision in `.memory/decisions/`.
### I02. Documentation
- Append a summary to `docs/balance/2026-11-17-uplift-final.md`: before (docs/balance/2026-11-17-final.md) vs after table for both difficulties, the full list of numeric/AI changes, the limitations note (bot is weaker than a human), and the leaderboard note (harder battles make new progress records harder; existing entries unchanged).
- `README.md`: in the "밸런스 시뮬레이션" section add one paragraph with the difficulty targets (Normal 55-65%, Hard 6-10% average bot completion) and where the tables live (`ENEMY_PHASE_BONUS`).
- Search `apps/web/src` and `docs/game-architecture.html` for text that describes Normal/Hard enemy strength or AI behavior; update it only if it is now wrong.
### I03. Quality gates
- `npm test`, `npm run lint`, `npm run build`; confirm `playBotTurn` is absent from `apps/web/dist`, `apps/api/dist`, `apps/leaderboard-api/dist`.
### I04. Close-out
- Mark this task and phase `done`, set the plan status to `done`, and set `.memory/current.md` to "No active task".

## Acceptance Criteria
- [ ] Independent-seed report meets both target ranges and class gap <= 5pp, or a follow-up decision is recorded.
- [ ] Docs and README updated.
- [ ] Tests, lint, build pass; bot absent from bundles.

## Validation
- `npm test`
- `npm run lint`
- `npm run build`
- `npm run balance:sim -- --runs 1000 --seed 20281117 --label uplift-final --out docs/balance/2026-11-17-uplift-final.md`

## Commit Message
```text
docs(balance): record final difficulty uplift verification

Plan: 2026-11-17-difficulty-uplift
Phase: P02-calibration
Task: T03-final-verification
```

## Progress
- [x] implementation complete: `docs/balance/2026-11-17-uplift-final.md` (seed 20281117, 1000 runs per cell) plus summary; README difficulty-target section added; UI text checked (no change needed).
- [x] validation passed: 788 tests, lint clean, build clean, `playBotTurn` absent from web/api/leaderboard bundles.
- Result: Normal avg 62.9% (61.5 / 64.8 / 62.3), gap 3.3pp - met. Hard avg 6.3% (8.8 / 3.5 / 6.7) in range, gap 5.3pp - 0.3pp over the 5pp target (within statistical error, SE about 1.1pp). Recorded as a follow-up decision rather than tuned further: `.memory/decisions/2026-11-17-difficulty-uplift-followup.md`.
- commit: see Git history
