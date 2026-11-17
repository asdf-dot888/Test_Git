# Task: T03 Final Verification

## Status: done

## Goal
Confirm the ±5pp goal with a larger, independent sample, run the full quality gates, and close out documentation.

## Decision Summary
- D04: class gap within ±5pp, per difficulty, by the plan's judging rule.
- Use a different base seed than tuning rounds to avoid overfitting to the tuned seeds.

## Implementation
### I01. Final measurement
- `npm run balance:sim -- --runs <at least 2x the tuning run count> --seed 20271117 --label final --out docs/balance/2026-11-17-final.md`.
- If the gap exceeds 5pp on either difficulty, do not hand-wave: record the result, note the remaining outlier, and add a follow-up decision to `.memory/decisions/` instead of silently widening the target.
### I02. Documentation
- `docs/balance/2026-11-17-final.md` contains: baseline vs final table, list of every numeric change (card/hero power, old -> new), run count, seeds, judged metric, and a limitations note (bot is weaker than a human; results are relative).
- Add a short "Balance simulation" section to `README.md` documenting `npm run balance:sim` and its flags (Korean, matching the existing README).
### I03. Quality gates
- Run the full suite, lint, and build. Confirm `apps/web/dist` contains no bot code (`playBotTurn`).
### I04. Close-out
- Set this task and its phase to `done`, mark the plan status `done`, and set `.memory/current.md` to "No active task".

## Acceptance Criteria
- [ ] Final report generated with an independent seed.
- [ ] Class gap ≤ 5pp on both difficulties, or an explicit follow-up decision recorded.
- [ ] `npm test`, `npm run lint`, `npm run build` all pass.
- [ ] README documents the simulation command.

## Validation
- `npm test`
- `npm run lint`
- `npm run build`
- `npm run balance:sim -- --runs <n> --seed 20271117 --label final --out docs/balance/2026-11-17-final.md`

## Commit Message
```text
docs(balance): record final class balance verification

Plan: 2026-11-17-class-balance-simulation
Phase: P02-balance-tuning
Task: T03-final-verification
```

## Progress
- [x] implementation complete: final report `docs/balance/2026-11-17-final.md` (seed 20271117, 1000 runs per cell, 2x the tuning sample), README "밸런스 시뮬레이션" section added.
- [x] validation passed: 736 tests, lint clean, build clean, `playBotTurn` absent from web/api bundles.
- Result: Hard completion warrior 16.9% / assassin 16.6% / demonist 18.3%, gap 1.7pp (target 5pp). Normal saturated (>= 99.7%).
- Open items recorded in the final report: Normal difficulty target/curve (not changed), assassin final-boss win rate lower than other classes.
- commit: see Git history
