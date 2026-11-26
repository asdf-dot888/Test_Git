# Current Context

## Active Plan
None — [Hero Power Cooldown and Spotlight Tutorial](./plans/2026-11-25-hero-power-cooldown-and-tutorial.md) is complete (7 tasks, 2026-11-25); not released. Decisions: [2026-11-25-hero-power-cooldown-and-tutorial](./decisions/2026-11-25-hero-power-cooldown-and-tutorial.md)

## Active Phase
None — P01 and P02 are done.

## Active Task
None — no active task.

## Plan Overview (7 tasks)
- P01: T01 engine cooldown (+API schema), T02 bot + 1000-run measurement (no tuning), T03 cooldown on the hero power button and in the texts.
- P02: T01 spotlight overlay component, T02 8-step tutorial flow (picker always first, hero power step), T03 one-time taunt/fatigue tips, T04 muted screen audit and close-out.

## Status
- P01 done: T01 engine cooldown (6a45de7), T03 button/texts (ca35b26), T02 measurement (c24cfb8). Measurement (1000 runs, docs/balance/2026-11-25-hero-power-cooldown.md): normal 53.3 % (below 55-65; warrior 58.3 / assassin 46.3 / demonist 55.2), hard 8.1 % (in range; 12.3 / 6.4 / 5.6), class gap normal 12.0 / hard 6.7 %p. Proposals awaiting the user's confirmation: assassin hero power 2 → 3 damage; if normal still < 55 %, normal boss health −1.
- P02 done: T01 spotlight overlay (bc51765, 6d66158), T02 8-step tutorial flow (32112f9), T03 taunt/fatigue tips (2bcfd9f), T04 muted screen audit (step 4 became "카드 내기" because a turn-1 hand can hold only a spell; callout placement uses its measured height). 1278 tests pass.
- 2026-11-26 balance (user-confirmed): assassin hero power damage 3 and assassin-only cooldown 1 turn (warrior/demonist stay 2). Report docs/balance/2026-11-26-assassin-damage3-cooldown1.md: normal 54.7 % (58.3 / 50.7 / 55.2, gap 7.6 %p), hard 8.9 % (12.3 / 8.7 / 5.6, gap 6.7 %p). Not released.
- Pending for the user: the checklist in [P02-T04](./phases/2026-11-25-hero-power-cooldown-and-tutorial/P02-spotlight-tutorial/T04-audit-and-close-out.md); confirm or reject the balance proposals; release (version and patch notes) only when asked.
- Released: the newest production release is **v1.0.7** (2026-11-25). Since then the main menu / battle-screen theme (`apps/web/src/styles/theme.css`, original board art kept) and the patch-notes redesign were deployed silently as v1.0.7 without patch-note entries, at the user's request. Deploying needs `SWA_CLI_DEPLOYMENT_TOKEN` in `.env`; the token was shared in chat on 2026-11-19 and **should still be rotated** in the Azure portal.
- Balance changes need the user's confirmation (D06): this plan only measures.
- Browser checks: always `--mute-audio`, no autoplay flag, force-kill headless Chrome afterwards (assistant memory `feedback-muted-browser-tests`). The dev-only `?design-preview` URL renders the game without signing in.
- Environment: Node 24 lives in `~/.local/node-v24.22.3-darwin-arm64/bin` (prefix commands with `export PATH="$HOME/.local/node-v24.22.3-darwin-arm64/bin:$PATH"`); git author for this repo is the existing `asdf-dot888` identity. Releases on this Mac are manual (assistant memory `project-release-process`, `links-three-at-once`, `feedback-version-numbering`).
- Commit by explicit file path only; never commit the user's `Feedback` file.
- The user wants memory plans run to the end without questions between tasks.

## Next Step (IMPORTANT)
No active task. Wait for the user: further balance tuning (normal average 0.3 %p below target; warrior highest), checklist feedback, and whether/how to release.
