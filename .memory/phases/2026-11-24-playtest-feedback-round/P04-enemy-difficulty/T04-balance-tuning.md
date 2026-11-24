# Task: T04 Balance Tuning with the Simulation

## Status: done (averages reached; class gap target NOT reached, reported to the user)

## Goal
After P03 (faster player mana, two Mana Springs) and P04-T01..T03 (enemy changes), tune the enemy until the average completion rate is inside the README targets and write the reports.

## Decision Summary
D09 tuning rule: **normal 55-65% average completion, hard 6-10%, class gap within 5 percentage points** (README "난이도 목표"; the report has a "난이도 목표 판정" section). The user asked for the AI to be made as smart as needed to reach these rates.

## Implementation
### I01. Baseline
- Run `npm run balance:sim -- --runs 300 --label feedback-round-baseline --out docs/balance/2026-11-24-feedback-round-baseline.md`. It builds `@board-game/game-core` first. Long runs (several minutes): run it in the background and wait for the completion notice; do not poll.
### I02. Tuning loop (each round: change one group of knobs, run 300 runs, write `docs/balance/2026-11-24-feedback-round-roundN.md`, note the change and result in Progress)
Knobs, in the order to try them (smarter before stronger, as the user wants):
1. AI strength: `ENEMY_ATTACK_BEAM_WIDTH` (T02), `ENEMY_ATTACK_WEIGHTS`, `hardAiBeamWidth` / `normalAiBeamWidth`, `ENEMY_MANA_USE_WEIGHT` (T03).
2. `ENEMY_PHASE_BONUS.*.minionAttack` (attack may be raised; health stays 0 per the user).
3. `ENEMY_PHASE_BONUS.*.heroHealth` and the extra hero health on hard (`existingHardBonus`).
4. `ENEMY_MANA_RECOVERY` (decided 2; change only if the other knobs cannot reach the targets, and say so).
Rules: never give enemy minions extra health; normal difficulty must keep not reading the player's hidden information; keep the first battle on the base rules; keep the boss area attack as decided.
### I03. Final confirmation
- With the final values run `npm run balance:sim -- --runs 1000 --label feedback-round-final --out docs/balance/2026-11-24-feedback-round-final.md` (500 at least if time is a problem) and check the target section: normal 55-65%, hard 6-10%, class gap <= 5 points. Because the errors are about plus or minus 5 points at 300 runs, a borderline result needs the larger run before accepting it.
### I04. Record
- Update the README difficulty paragraph ("적 강화는 두 번째 전투부터 적용됩니다 ... `ENEMY_PHASE_BONUS`"): the knobs now are hero health and minion attack bonuses (minion health bonus is 0), the enemy mana recovery and the AI strength constants, with the final values; keep the targets table.
- Update tests that pin changed constants. Add a regression test that `ENEMY_PHASE_BONUS.*.minionHealth` stays 0.
- If the targets cannot be met after 6 rounds, or only by breaking the rules above, stop and report the numbers to the user with options; do not change the decided design silently.

## Acceptance Criteria
- [ ] The final report shows normal 55-65%, hard 6-10% average completion and a class gap within 5 points (or the user was asked, with data, before any design change).
- [ ] Reports for the baseline, every round and the final run are in `docs/balance/`; the README difficulty text matches the final constants.
- [ ] Build, lint and tests pass.

## Validation
- `npm run build`
- `npm run balance:sim -- --runs 1000 --label feedback-round-final --out docs/balance/2026-11-24-feedback-round-final.md`
- `npm test`, `npm run lint`

## Commit Message
```text
balance: tune enemy difficulty after the playtest feedback round

Plan: 2026-11-24-playtest-feedback-round
Phase: P04-enemy-difficulty
Task: T04-balance-tuning
```
Commit the code, README and the `docs/balance/2026-11-24-feedback-round-*.md` reports by explicit path (intermediate rounds may go in the same commit).

## Progress
- [x] baseline recorded (`docs/balance/2026-11-24-feedback-round-baseline.md`, 300 runs): normal 30.7%, hard 7.6%.
- [x] rounds recorded in `docs/balance/2026-11-24-feedback-round-summary.md` (7 rounds, each with its own report file). Final knobs: normal enemy `minionAttack {0, 1, 1}` and `heroHealth {0, 0, 0}`; hard unchanged (`heroHealth {0, 8, 16}`, `minionAttack {1, 1, 2}`); `minionHealth` 0 for both; attack beam width normal 3 / hard 8 and weights unchanged; `ENEMY_MANA_USE_WEIGHT` 0; enemy mana +2. The biggest lever is the normal attack bonus (+1 gives about 30%, 0 gives about 96%); hero health bonus and attack beam width barely matter.
- [x] final run: **normal 55.7%** (49.2 / 61.3 / 56.6, 1000 runs, in range but near the lower edge), **hard 7.1%** (3.7 / 13.4 / 4.2, 1000 runs, in range).
- [ ] **Not met: class gap within 5 points** (normal 12.1, hard 9.7; warrior lowest, assassin highest, with many "stalled" warrior battles). The allowed knobs do not move it; the earlier balance rounds fixed gaps by retuning class cards and hero powers, which was outside the decided design, so it was left for the user to decide.
- [x] validation passed: build clean, lint clean, 1194 tests (101 files). README difficulty paragraph updated.
- commit: see Git history
