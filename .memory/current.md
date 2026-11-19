# Current Context

## Active Plan
None — [Assassin Hero Power on Touch (tap-then-tap and drag)](./plans/2026-11-19-assassin-hero-power-touch.md) is complete (implementation); the user's check on a real phone is pending.

## Active Phase
None — P01 and P02 are complete.

## Active Task
None — no active task.

## Status
- Plan done: 2 phases and 4 tasks (drag payload and drop rules, App drop handling, hero power button drag UI, guide text and whole-screen tests). 1140 tests (98 files), lint and build pass. Decision: [assassin-hero-power-touch](./decisions/2026-11-19-assassin-hero-power-touch.md) (D08 of the mobile decision is now confirmed: both tap-then-tap and drag, invalid drop cancels).
- Previous plan [card details and touch drag](./plans/2026-11-19-card-details-and-touch-drag.md): implemented (10/10 tasks), released in v1.0.6. Its P04-T02 holds the phone checklist, now with an addendum for the Assassin hero power drag.
- Previous plan (unique spell and hero power effects) is implemented; the user's visual/audio review is still pending (`npm run dev`, open `/?effects-preview`).
- Released: production serves **v1.0.6** (deployed 2026-11-19 UTC, source commit cb51d25, release commit 84d27af; verified: the live site serves `assets/index-CqttR38G.js`, `/changelog.html` has the v1.0.6 entry, the API answers 401 without login). It includes both touch plans (card details, touch drag, assassin hero power drag). Deploying needs `SWA_CLI_DEPLOYMENT_TOKEN` in `.env`; the token was shared in chat on 2026-11-19 and **should still be rotated** in the Azure portal. The user's phone check of the touch controls is still pending after release; retune in a small follow-up plan if needed.
- Claude cannot test touch behavior on a phone; it is verified by unit/jsdom tests and still needs the manual checklists.
- The user granted Claude permission to change file permissions in this project when work needs it (done for the whole project folder including `.git`, 2026-11-19). The user also asked Claude to run a memory plan to the end without asking between tasks.
- Environment: Node 24 lives in `~/.local/node-v24.22.3-darwin-arm64/bin` (prefix commands with `export PATH="$HOME/.local/node-v24.22.3-darwin-arm64/bin:$PATH"`); git author for this repo is set locally to the existing `asdf-dot888` identity.
- Releases on this Mac are manual (the PowerShell deploy script cannot run here): build a clean `git worktree` of HEAD with `VITE_APP_VERSION`, stage the API, `swa deploy`, verify the live bundle, then commit `chore(release)` and push. Needs Rosetta (installed 2026-11-19) and the GitHub CLI login: `~/.local/gh_2.105.0_macOS_arm64/bin/gh` is logged in as `asdf-dot888` and wired into this repo's git config as a credential helper. See the assistant memory notes `project-release-process` and `links-three-at-once` (always give the game URL, patch notes URL and localhost link together).
- Working tree has many files that are CRLF locally but LF in HEAD (shown as modified; also `local-work.patch`, `.agents/`). Commit by explicit file path only, and convert a file you edit back to LF first (`sed -i '' $'s/\r$//' <file>`, then `git diff --numstat -- <file>` should be empty). Cleaning up line endings repo-wide is a separate task nobody has asked for yet.
- An unexplained flaky test failure happened once (P01-T01 of the previous plan; reruns passed); mention it if it recurs.

## Next Step (IMPORTANT)
No active task. Both touch plans are released (v1.0.6). Wait for the user's phone check of both touch plans (checklists in the previous plan's [P04-T02](./phases/2026-11-19-card-details-and-touch-drag/P04-guidance-and-verification/T02-audit-and-close-out.md)) and retune in a small follow-up plan and a new release only when the user asks. Also pending: rotate the Azure token.
