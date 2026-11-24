# Current Context

## Active Plan
[Hearthstone Rules, Taunt, Turn-Order Pick](./plans/2026-11-24-hearthstone-rules-and-taunt.md) — in progress (P01 done). Decisions: [2026-11-24-hearthstone-rules-and-taunt](./decisions/2026-11-24-hearthstone-rules-and-taunt.md).

## Active Phase
[P03 Balance and Close-out](./phases/2026-11-24-hearthstone-rules-and-taunt/P03-balance-and-close-out/phase.md)

## Active Task
[P03-T01 Balance Retune with the Simulation](./phases/2026-11-24-hearthstone-rules-and-taunt/P03-balance-and-close-out/T01-balance-retune.md) — status `todo`.

## Plan Overview (10 tasks)
- P01 engine: T01 fatigue and 1 draw (+API fields), T02 taunt and attack rules (10 cards), T03 turn-order pick and the Coin (+API fields), T04 enemy AI and simulation bot.
- P02 web: T01 attack legality and removing the all-attack button, T02 taunt visuals and sounds, T03 turn-order picker, Coin, enemy-first playback, tutorial, T04 texts and docs.
- P03: T01 balance retune (normal 55-65 %, hard 6-10 %), T02 audit, user checklist, close-out.

## Status
- Previous plan [2026-11-24-full-mana-and-triple-draw](./plans/2026-11-24-full-mana-and-triple-draw.md): engine, texts and tests done (commits 2b8ad8c, c4b9e7a); its T03 balance retune is **superseded** by P03-T01 here. The simulation under 5 draws per turn gave 0 % completion on both difficulties (board stalemates because a hero could only be hit when the opposing board was empty); report `docs/balance/2026-11-24-hs-mana-baseline.md`. The new plan fixes the cause (taunt rules, 1 draw, fatigue).
- Plan [2026-11-24-playtest-feedback-round](./plans/2026-11-24-playtest-feedback-round.md) is complete and not released (12 tasks). Its difficulty result before the rule change: normal 55.7 %, hard 7.1 %, class gap 12.1 / 9.7 points (target 5 not met; decided to report, not force). Pending user checks: the PC/phone checklist (addendum in the previous plan's [P04-T02](./phases/2026-11-19-card-details-and-touch-drag/P04-guidance-and-verification/T02-audit-and-close-out.md)).
- Current engine rules (commit c4b9e7a): Hearthstone mana for both sides, 5 draws per turn (to be replaced by 1), stronger starter deck, enemy all-attack. 1198 tests (101 files), lint and build pass at that commit.
- Last release: production served **v1.0.7** (Azure, includes the public HTML presentation); the newer work is unreleased. Releases only when the user asks. Deploying needs `SWA_CLI_DEPLOYMENT_TOKEN` in `.env`; the token was shared in chat on 2026-11-19 and **should still be rotated** in the Azure portal.
- Claude cannot test touch behavior on a phone; it is verified by unit/jsdom tests and needs the manual checklists.
- Environment: Node 24 lives in `~/.local/node-v24.22.3-darwin-arm64/bin` (prefix commands with `export PATH="$HOME/.local/node-v24.22.3-darwin-arm64/bin:$PATH"`); git author for this repo is the existing `asdf-dot888` identity. Releases on this Mac are manual (see assistant memory notes `project-release-process` and `links-three-at-once`: always give the game URL, patch notes URL and localhost link together).
- Untracked and still uncommitted (do not touch; a deploy refuses to start with them present): `.agents/`, `local-work.patch`, `docs/2026-11-19-session-handoff.md`, `Feedback`, and older `.memory` decision/plan/phase files; ask the user whether to commit, ignore or delete them. Commit by explicit file path only.
- The user wants this memory plan run to the end without questions between tasks; the user's PC/phone checks happen after the plan closes (checklist in P03-T02).
- An unexplained flaky test failure happened once earlier (reruns passed); mention it if it recurs.
- Browser note: sound problems were Safari-only (`.ogg`); the user decided to use Chrome and dropped the `.m4a` conversion.

## Next Step (IMPORTANT)
Continue with P03-T01 per its blueprint (user asked to run the whole plan to the end without questions): implement, validate, commit with the message in the task file, then advance this file.
