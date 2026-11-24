# Current Context

## Active Plan
None — [Hearthstone Rules, Taunt, Turn-Order Pick](./plans/2026-11-24-hearthstone-rules-and-taunt.md) is complete (10 tasks, 2026-11-24); not released. Decisions: [2026-11-24-hearthstone-rules-and-taunt](./decisions/2026-11-24-hearthstone-rules-and-taunt.md) (with the final-numbers addendum).

## Active Phase
None — P01 engine, P02 web and P03 balance/close-out are done.

## Active Task
None — no active task.

## Status
- Plan done: 1 draw per turn, fatigue instead of reshuffling, taunt (10 cards), attacks reach the hero past non-taunt minions, no all-attack button, a two-card turn-order pick every battle (first: 3 cards + draw; second: 4 cards + the Coin, enemy plays first), enemy AI/bot follow taunt and the Coin, texts and docs updated. 1261 tests (104 files), lint and build pass. Commits 903b45f .. d3aaedc plus the close-out commit.
- Difficulty (1000 runs per cell, docs/balance/2026-11-24-hs-rules-final.md): **normal 55.8 %** (57.1 / 54.0 / 56.4, lower edge of 55-65), **hard 8.5 %** (11.4 / 8.2 / 6.0). Class gap normal 3.1, hard 5.4 points (target 5; Demonist lowest on hard). Summary of what was changed and why: docs/balance/2026-11-24-hs-rules-summary.md. Tuning headroom: lower boss health by 1-2 for normal, or one more Demonist card adjustment for the hard gap.
- Pending checks only the user can do: the checklist in the addendum of the previous plan's [P04-T02](./phases/2026-11-19-card-details-and-touch-drag/P04-guidance-and-verification/T02-audit-and-close-out.md) (turn-order picker, taunt look and sounds, attacking past minions, fatigue, enemy behaviour; phone layout), plus the older checklist for the playtest-feedback round (button layout, turn badge, damage numbers, hover sound, 30 s timer).
- Not released: the newest production release is **v1.0.7** (Azure, public HTML presentation). A release (version bump, changelog entry in `apps/web/public/changelog.html`, deploy) only when the user asks. Deploying needs `SWA_CLI_DEPLOYMENT_TOKEN` in `.env`; the token was shared in chat on 2026-11-19 and **should still be rotated** in the Azure portal.
- Earlier plans: [2026-11-24-full-mana-and-triple-draw](./plans/2026-11-24-full-mana-and-triple-draw.md) (its balance task was superseded by this plan), [2026-11-24-playtest-feedback-round](./plans/2026-11-24-playtest-feedback-round.md) (done, 12 tasks).
- Claude cannot test touch behavior or sounds on a phone/speakers; it is verified by unit/jsdom tests and needs the manual checklists. Sound problems were Safari-only (`.ogg`); the user decided to use Chrome and dropped the `.m4a` conversion.
- Environment: Node 24 lives in `~/.local/node-v24.22.3-darwin-arm64/bin` (prefix commands with `export PATH="$HOME/.local/node-v24.22.3-darwin-arm64/bin:$PATH"`); git author for this repo is the existing `asdf-dot888` identity. Releases on this Mac are manual (see assistant memory notes `project-release-process` and `links-three-at-once`: always give the game URL, patch notes URL and localhost link together).
- Untracked and still uncommitted (do not touch; a deploy refuses to start with them present): `.agents/`, `local-work.patch`, `docs/2026-11-19-session-handoff.md`, `Feedback`, and older `.memory` decision/plan/phase files; ask the user whether to commit, ignore or delete them. Commit by explicit file path only (never `git add` a whole `.memory/plans` or `.memory/phases` folder).
- The user wants memory plans run to the end without questions between tasks.

## Next Step (IMPORTANT)
No active task. Wait for the user's feedback on the checklist; a release only when the user asks. Open items for the user: whether to fine-tune the hard class gap (5.4 vs 5) and the lower edge of normal (55.8 %), rotate the Azure token, decide on the untracked files, delete the old private ChatGPT Sites copy `mango-stone-project-story-2026` through the Sites UI.
