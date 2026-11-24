# Current Context

## Active Plan
[Playtest Feedback Round (UI, sound, mana, difficulty)](./plans/2026-11-24-playtest-feedback-round.md) — planned 2026-11-24; decisions in [2026-11-24-playtest-feedback-round](./decisions/2026-11-24-playtest-feedback-round.md). 5 phases, 12 tasks. Run it to the end without asking between tasks (the user's standing instruction for memory plans).

## Active Phase
[P03 Mana and Starter Deck](./phases/2026-11-24-playtest-feedback-round/P03-mana-and-starter-deck/phase.md)

## Active Task
[P03-T02 Two Mana Springs in the Starter Deck](./phases/2026-11-24-playtest-feedback-round/P03-mana-and-starter-deck/T02-mana-spring-copies.md)

## Status
- Plan order: P01 layout and turn clarity (T01 buttons, T02 badge/banner, T03 30 s timer and boss panel text), P02 combat feedback (T01 damage/heal numbers, T02 card rustle hover sound), P03 mana (T01 player recovery 2/3/4, T02 two Mana Springs), P04 enemy difficulty (T01 enemy mana +2 and no minion health bonus, T02 attack planning, T03 card plan fix and mana efficiency, T04 balance tuning to normal 55-65% / hard 6-10% / class gap <= 5 points), P05 close-out (docs, checklist, audit). No release is part of the plan.
- Findings during planning: the enemy cannot hit the hero while the player has minions (so "go face" is already automatic); `planEnemyTurn` can return an empty plan when the enemy is behind on board (probable cause of idle enemy turns, reproduce first in P04-T03). Both are written into the plan file.
- Public HTML presentation released on Azure at `https://mango-stone-0631f0d00.5.azurestaticapps.net/presentation/` as part of v1.0.7; 1140 tests, lint, build, and live route checks passed. Plan: [public-azure-presentation](./plans/2026-11-20-public-azure-presentation.md). The earlier private ChatGPT Sites copy remains owner-only because the connected Sites tools do not expose deletion; remove it through Sites UI.
- Plan done: 2 phases and 4 tasks (drag payload and drop rules, App drop handling, hero power button drag UI, guide text and whole-screen tests). 1140 tests (98 files), lint and build pass. Decision: [assassin-hero-power-touch](./decisions/2026-11-19-assassin-hero-power-touch.md) (D08 of the mobile decision is now confirmed: both tap-then-tap and drag, invalid drop cancels).
- Previous plan [card details and touch drag](./plans/2026-11-19-card-details-and-touch-drag.md): implemented (10/10 tasks), released in v1.0.6. Its P04-T02 holds the phone checklist, now with an addendum for the Assassin hero power drag.
- Previous plan (unique spell and hero power effects) is implemented; the user's visual/audio review is still pending (`npm run dev`, open `/?effects-preview`).
- Previous release: production served **v1.0.6** (deployed 2026-11-19 UTC, source commit cb51d25, release commit 84d27af; verified: the live site serves `assets/index-CqttR38G.js`, `/changelog.html` has the v1.0.6 entry, the API answers 401 without login). It includes both touch plans (card details, touch drag, assassin hero power drag). Deploying needs `SWA_CLI_DEPLOYMENT_TOKEN` in `.env`; the token was shared in chat on 2026-11-19 and **should still be rotated** in the Azure portal. The user's phone check of the touch controls is still pending after release; retune in a small follow-up plan if needed.
- Claude cannot test touch behavior on a phone; it is verified by unit/jsdom tests and still needs the manual checklists.
- The user granted Claude permission to change file permissions in this project when work needs it (done for the whole project folder including `.git`, 2026-11-19). The user also asked Claude to run a memory plan to the end without asking between tasks.
- Environment: Node 24 lives in `~/.local/node-v24.22.3-darwin-arm64/bin` (prefix commands with `export PATH="$HOME/.local/node-v24.22.3-darwin-arm64/bin:$PATH"`); git author for this repo is set locally to the existing `asdf-dot888` identity.
- Releases on this Mac are manual (the PowerShell deploy script cannot run here): build a clean `git worktree` of HEAD with `VITE_APP_VERSION`, stage the API, `swa deploy`, verify the live bundle, then commit `chore(release)` and push. Needs Rosetta (installed 2026-11-19) and the GitHub CLI login: `~/.local/gh_2.105.0_macOS_arm64/bin/gh` is logged in as `asdf-dot888` and wired into this repo's git config as a credential helper. See the assistant memory notes `project-release-process` and `links-three-at-once` (always give the game URL, patch notes URL and localhost link together).
- Line endings were cleaned up on 2026-11-19: all 169 tracked files that were CRLF in the Windows-made copy were converted to LF (content identical to HEAD, no real changes lost), the git index was rebuilt, and `.gitattributes` (`* text=auto eol=lf`) keeps Windows and macOS consistent. Tracked files are clean. Untracked and still uncommitted (they also make a deploy refuse to start): `.agents/`, `local-work.patch`, `docs/2026-11-19-session-handoff.md`, and 19 older `.memory` decision/plan/phase files; ask the user whether to commit, ignore or delete them. Commit by explicit file path.
- An unexplained flaky test failure happened once (P01-T01 of the previous plan; reruns passed); mention it if it recurs.

## Next Step (IMPORTANT)
Start the active task: `/memory-execute` (or "current 보고 이어서 해줘"), continuing the Playtest Feedback Round at P03-T02 (P01, P02 and P03-T01 are done). Validation setup: `export PATH="$HOME/.local/node-v24.22.3-darwin-arm64/bin:$PATH"`. Commit by explicit file path (unrelated untracked files exist).

Still pending from before: delete the old private ChatGPT Sites copy `mango-stone-project-story-2026` through the Sites UI when accessible; the current connector has no delete/unpublish operation.

No active task. Both touch plans are released (v1.0.6) and the presentation is live in v1.0.7. Wait for the user's phone check of both touch plans (checklists in the previous plan's [P04-T02](./phases/2026-11-19-card-details-and-touch-drag/P04-guidance-and-verification/T02-audit-and-close-out.md)) and retune in a small follow-up plan and a new release only when the user asks. Also pending: rotate the Azure token.
