# Current Context

## Active Plan
None — [Assassin Hero Power on Touch (tap-then-tap and drag)](./plans/2026-11-19-assassin-hero-power-touch.md) is complete (implementation); the user's check on a real phone is pending.

## Active Phase
None — P01 and P02 are complete.

## Active Task
None — no active task.

## Status
- Plan done: 2 phases and 4 tasks (drag payload and drop rules, App drop handling, hero power button drag UI, guide text and whole-screen tests). 1140 tests (98 files), lint and build pass. Decision: [assassin-hero-power-touch](./decisions/2026-11-19-assassin-hero-power-touch.md) (D08 of the mobile decision is now confirmed: both tap-then-tap and drag, invalid drop cancels).
- Previous plan [card details and touch drag](./plans/2026-11-19-card-details-and-touch-drag.md): implemented (10/10 tasks), not released. Its P04-T02 holds the phone checklist, now with an addendum for the Assassin hero power drag.
- Previous plan (unique spell and hero power effects) is implemented; the user's visual/audio review is still pending (`npm run dev`, open `/?effects-preview`).
- Released: production serves **v1.0.5** (deployed 2026-11-19, release commit 9575aed). Deploying needs `SWA_CLI_DEPLOYMENT_TOKEN` in `.env`; the token was shared in chat on 2026-11-19 and should be rotated in the Azure portal. Neither touch plan is released.
- Claude cannot test touch behavior on a phone; it is verified by unit/jsdom tests and still needs the manual checklists.
- The user granted Claude permission to change file permissions in this project when work needs it (done for the whole project folder including `.git`, 2026-11-19). The user also asked Claude to run a memory plan to the end without asking between tasks.
- Environment: Node 24 lives in `~/.local/node-v24.22.3-darwin-arm64/bin` (prefix commands with `export PATH="$HOME/.local/node-v24.22.3-darwin-arm64/bin:$PATH"`); git author for this repo is set locally to the existing `asdf-dot888` identity.
- Working tree has many files that are CRLF locally but LF in HEAD (shown as modified; also `local-work.patch`, `.agents/`). Commit by explicit file path only, and convert a file you edit back to LF first (`sed -i '' $'s/\r$//' <file>`, then `git diff --numstat -- <file>` should be empty). Cleaning up line endings repo-wide is a separate task nobody has asked for yet.
- An unexplained flaky test failure happened once (P01-T01 of the previous plan; reruns passed); mention it if it recurs.

## Next Step (IMPORTANT)
No active task. Wait for the user's phone check of both touch plans (checklists in the previous plan's [P04-T02](./phases/2026-11-19-card-details-and-touch-drag/P04-guidance-and-verification/T02-audit-and-close-out.md)) and retune in a small follow-up plan, then release (version bump and deploy) only when the user asks. Also pending: rotate the Azure token.
