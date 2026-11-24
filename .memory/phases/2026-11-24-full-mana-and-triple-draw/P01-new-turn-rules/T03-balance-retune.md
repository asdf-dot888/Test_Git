# Task: T03 Balance Retune

## Status: superseded (see plan 2026-11-24-hearthstone-rules-and-taunt, P03-T01)

## Implementation
- `npm run balance:sim -- --runs 300 ...` baseline, then adjust the enemy knobs (`ENEMY_PHASE_BONUS` attack and hero health, AI beam widths and weights) until normal 55-65% and hard 6-10% average completion; record reports under `docs/balance/2026-11-24-full-mana-*.md` and a summary. The class gap target (5 points) is reported, not forced. Stop and tell the user if the averages cannot be reached with these knobs.

## Validation
- `npm run balance:sim -- --runs 1000 --label full-mana-final --out docs/balance/2026-11-24-full-mana-final.md`, `npm test`, `npm run lint`.

## Commit Message
```text
balance: retune difficulty for full mana and triple draw

Plan: 2026-11-24-full-mana-and-triple-draw
Phase: P01-new-turn-rules
Task: T03-balance-retune
```

## Progress
- [ ] done
