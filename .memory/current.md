# Current Context

## Active Plan
[Class/Card/Enemy Balance via Simulation Bot](./plans/2026-11-17-class-balance-simulation.md)

## Active Phase
[P02 Balance Tuning](./phases/2026-11-17-class-balance-simulation/P02-balance-tuning/phase.md)

## Active Task
[P02-T03 Final Verification](./phases/2026-11-17-class-balance-simulation/P02-balance-tuning/T03-final-verification.md)

## Status
- P01 complete. P02-T01 and P02-T02 complete.
- Hard completion gap: baseline 24.0pp -> round 1 11.8pp -> round 2 2.2pp (warrior 15.8 / assassin 14.0 / demonist 16.2). Reports in `docs/balance/`.
- Normal difficulty is saturated for the bot (>= 98.8% for every class); not changed (no agreed target). Open item to report to the user.
- 9 numeric edits total (round 1: 6, round 2: 3).
- User instruction: run the whole plan to the end without asking; no push notifications.

## Next Step (IMPORTANT)
P02-T03: run the independent-seed final measurement (`--seed 20271117`, `--runs 1000`, both difficulties, ~17 min, background), write `docs/balance/2026-11-17-final.md` with the baseline-vs-final table and full change list, add the README "Balance simulation" section, run `npm test`, `npm run lint`, `npm run build`, check the bot is absent from bundles, commit, then close the plan and set this file to "No active task".
