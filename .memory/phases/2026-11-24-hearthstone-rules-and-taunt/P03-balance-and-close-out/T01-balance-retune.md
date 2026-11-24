# Task: T01 Balance Retune with the Simulation

## Status: done

## Goal
After all rule changes, tune the game until the average completion rate is normal 55-65 % and hard 6-10 %; report the class gap (target <= 5 points, reported, not forced).

## Decision Summary
D08. The previous plan's T03 (retune under 5 draws) is replaced by this task. Stop and ask the user, with the numbers, if the targets cannot be reached with the knobs below, or only by changing the decided rules.

## Implementation
### I01. Baseline
- `npm run balance:sim -- --runs 300 --label hs-rules-baseline --out docs/balance/2026-11-24-hs-rules-baseline.md` (about 10-12 minutes; run it in the background and wait for the completion notice, do not poll). Check first that completion is not ~0 % again and that "stalled" battles are rare (< 2 %); if stalls remain, find the cause before tuning (print a few stalled battles like the earlier analysis).
### I02. Tuning loop (one group of knobs per round, 300 runs each, report `docs/balance/2026-11-24-hs-rules-roundN.md`, short summary in `docs/balance/2026-11-24-hs-rules-summary.md`)
Order of knobs:
1. Player starter deck curve (`SHARED_STARTER_CARD_IDS` and class starter ids in `catalog.ts`; with 1 draw per turn the earlier "raise the curve" decision must be re-checked: target a smooth curve with 1-3 cost cards for turns 1-3).
2. Taunt list and taunt cards' stats (the 10 cards; warrior-vanguard / warrior-stonewall cost or stats first if warrior is too strong or too weak; other cards may gain or lose taunt, record the final list in the decision file as an addendum).
3. AI strength: `ENEMY_ATTACK_BEAM_WIDTH`, `ENEMY_ATTACK_WEIGHTS` (heroDamage matters more now that heroes can be hit past minions), `ENEMY_TAUNT_BOARD_BONUS`, `hardAiBeamWidth` / `normalAiBeamWidth`.
4. `ENEMY_PHASE_BONUS` (attack bonuses first; minion health bonus stays 0 per the earlier user decision; hero health bonuses next).
5. Fatigue damage curve or the enemy deck size only as a last resort, and then ask the user.
Rules: normal difficulty never reads hidden information; the first battle keeps the base rules; do not give enemy minions extra health.
### I03. Final confirmation
- `npm run balance:sim -- --runs 1000 --label hs-rules-final --out docs/balance/2026-11-24-hs-rules-final.md` and check the target section. A borderline result at 300 runs needs the 1000-run confirmation. Record the numbers, the class gap and the first-player share (the bot picks first/second pseudo-randomly; report completion by role if the report supports it, otherwise note it).
### I04. Record
- README difficulty paragraph with the final knob values; tests that pin changed constants or card stats are updated; add a regression test that `ENEMY_PHASE_BONUS.*.minionHealth` stays 0 if it does not exist yet; characterization hashes re-captured if needed.

## Acceptance Criteria
- [ ] Final report: normal 55-65 %, hard 6-10 % average completion (or the user was asked with data before any design change); class gap reported.
- [ ] Reports for baseline, rounds and final are in `docs/balance/`; the README matches the constants.
- [ ] `npm run build`, `npm test`, `npm run lint` pass.

## Validation
- `npm run build`
- `npm run balance:sim -- --runs 1000 --label hs-rules-final --out docs/balance/2026-11-24-hs-rules-final.md`
- `npm test`, `npm run lint`

## Commit Message
```text
balance: retune difficulty for the Hearthstone-style rules and taunt

Plan: 2026-11-24-hearthstone-rules-and-taunt
Phase: P03-balance-and-close-out
Task: T01-balance-retune
```
Commit code, README, tests and `docs/balance/2026-11-24-hs-rules-*.md` by explicit path (intermediate round reports may go in the same commit).

## Progress
- [x] done. Baseline 300 runs (0.4 % / 0 %), then experiments with a scratch harness (documented in docs/balance/2026-11-24-hs-rules-summary.md): AI planning and enemy deck caps barely mattered; the starter curve, boss health/cadence, normal enemy health and the Demonist cost explained the gap. Changes: shared starter deck rebuilt (1-2 cost x11, 5-cost x1), normal enemy health -4, boss health 18/22/26, boss area attack every 4th (normal) / 3rd (hard) turn, no normal attack bonus, hard attack +1 in every phase and no hero health table (+2 / +3 flat), Demonist shard cost 2 and cheaper cards (houndmaster 4, guardian 4, summoner 5, matriarch 6, ritualist 3), the UI reads the shard cost from the constant. New simulation option --turn-order. Final 1000-run result: normal 55.8 % (57.1/54.0/56.4), hard 8.5 % (11.4/8.2/6.0); class gap normal 3.1, hard 5.4 points (target 5, 0.4 over, reported). Reports: baseline, round1, final, summary. 1261 tests (104 files), lint and build pass.
- commit: see Git history
