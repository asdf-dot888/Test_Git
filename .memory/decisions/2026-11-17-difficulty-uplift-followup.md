# Decisions: Difficulty Uplift Follow-up (Hard class gap)

- Date: 2026-11-17
- Status: Confirmed (option A chosen by the user)
- Related: `2026-11-17-difficulty-uplift.md`, `docs/balance/2026-11-17-uplift-final.md`

## Situation
The independent-seed verification (seed 20281117, 1000 runs per cell) met every target except one: the Hard class gap is 5.3pp against the 5pp target (warrior 8.8%, assassin 3.5%, demonist 6.7%). Normal passed (average 62.9%, gap 3.3pp). Hard's average is 6.3%, close to the lower edge of 6-10%.

The standard error of the gap at this sample size is about 1.1pp, so 5.3pp is not statistically distinguishable from 5pp. The 500-run round-4 measurement on the tuning seed showed a gap of 4.2pp.

## Observations
- Assassin is the weak class on Hard, mostly at the final boss (E12: assassin 47.3%, warrior 71.0%, demonist 58.8%).
- The last assassin change was raising `assassin-shadow-duelist` cost 3 -> 4. Raising assassin by reverting it moves Normal assassin up (about +3.5pp, currently the highest class on Normal at 64.8%) and Hard assassin up (about +2pp).
- Assassin hero power damage is too coarse a lever (2 -> 3 doubles its Hard completion).

## Options
- **A. Accept as is (recommended if the 0.3pp miss is considered noise)**: no further change; the targets are met within statistical error and the plan closes.
- **B. Revert `assassin-shadow-duelist` cost to 3**: expected Hard assassin about 5.5%, gap about 3.3pp, Normal assassin up to about 68% (Normal gap then about 6pp, over target). Needs another 20-minute verification and a likely second tweak.
- **C. Relax the gap target for Hard to 6pp**: documents that low completion rates amplify relative differences; no code change.

## Decision
- **Chosen: A. Accept as is.** The 5.3pp Hard class gap is treated as within statistical error of the 5pp target; no further tuning, and the difficulty uplift plan is closed.
- Nothing was changed after the final measurement, to avoid tuning against the verification seed.
- Revisit only if players report that the assassin is clearly weaker on Hard (final boss); option B (revert `assassin-shadow-duelist` cost to 3) is the first lever to try.
