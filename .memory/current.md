# Current Context

## Active Plan
[Assassin Hero Power on Touch (tap-then-tap and drag)](./plans/2026-11-19-assassin-hero-power-touch.md) — in progress, 2 phases and 4 tasks; P01 done (1107 tests, build and lint pass).

## Active Phase
[P02 Touch UI and Guidance](./phases/2026-11-19-assassin-hero-power-touch/P02-touch-ui-and-guidance/phase.md)

## Active Task
[P02-T01 Hero Power Button Drag](./phases/2026-11-19-assassin-hero-power-touch/P02-touch-ui-and-guidance/T01-hero-power-button-drag.md)

## Status
- Decision: [assassin-hero-power-touch](./decisions/2026-11-19-assassin-hero-power-touch.md) (confirmed 2026-11-19; replaces D08 of the mobile decision).
- Tasks: P01-T01 payload/origin/rules, P01-T02 App drop handling, P02-T01 button drag UI, P02-T02 guide text, whole-screen tests, phone checklist.
- Previous plan [card details and touch drag](./plans/2026-11-19-card-details-and-touch-drag.md): implemented (10/10 tasks), not released; the user's phone check is pending (checklist in its P04-T02). The user could not check a phone on 2026-11-19 and chose to plan this follow-up first.
- Previous plan (unique spell and hero power effects) is implemented; the user's visual/audio review is still pending (`npm run dev`, open `/?effects-preview`).
- Released: production serves **v1.0.5** (deployed 2026-11-19, release commit 9575aed). Deploying needs `SWA_CLI_DEPLOYMENT_TOKEN` in `.env`; the token was shared in chat on 2026-11-19 and should be rotated in the Azure portal. Neither touch plan is released.
- Claude cannot test touch behavior on a phone; it is verified by unit/jsdom tests and still needs the manual checklists.
- The user granted Claude permission to change file permissions in this project when work needs it (done for `.memory`, 2026-11-19).
- Working tree has unrelated modified/untracked files (including `.memory` files with CRLF warnings, `local-work.patch`, `.agents/`): commit by explicit file path only.
- An unexplained flaky test failure happened once (P01-T01 of the previous plan; reruns passed); mention it if it recurs.

## Next Step (IMPORTANT)
Run `/memory-execute` (or “current 보고 이어서 해줘”) to start P02-T01. Environment: Node 24 lives in `~/.local/node-v24.22.3-darwin-arm64/bin` (prefix commands with `export PATH="$HOME/.local/node-v24.22.3-darwin-arm64/bin:$PATH"`); git author for this repo is set locally to the existing `asdf-dot888` identity; some files are CRLF in the working tree but LF in HEAD (check with `git diff --stat` and convert the file you edit back to LF). Validation order: `npm run build`, `npm test`, `npm run lint`. After this plan, wait for the user's phone check of both touch plans, then release (version bump and deploy) only when the user asks.
