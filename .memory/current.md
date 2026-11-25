# Current Context

## Active Plan
[Hero Power Cooldown and Spotlight Tutorial](./plans/2026-11-25-hero-power-cooldown-and-tutorial.md) — decisions: [2026-11-25-hero-power-cooldown-and-tutorial](./decisions/2026-11-25-hero-power-cooldown-and-tutorial.md)

## Active Phase
[P02 Spotlight Tutorial](./phases/2026-11-25-hero-power-cooldown-and-tutorial/P02-spotlight-tutorial/phase.md)

## Active Task
[T03 One-Time Taunt and Fatigue Tips](./phases/2026-11-25-hero-power-cooldown-and-tutorial/P02-spotlight-tutorial/T03-contextual-tips.md) — status `in_progress`.

## Plan Overview (7 tasks)
- P01: T01 engine cooldown (+API schema), T02 bot + 1000-run measurement (no tuning), T03 cooldown on the hero power button and in the texts.
- P02: T01 spotlight overlay component, T02 8-step tutorial flow (picker always first, hero power step), T03 one-time taunt/fatigue tips, T04 muted screen audit and close-out.

## Status
- P01 done: T01 engine cooldown (6a45de7), T03 button/texts (ca35b26), T02 measurement (c24cfb8). Measurement (1000 runs, docs/balance/2026-11-25-hero-power-cooldown.md): normal 53.3 % (below 55-65; warrior 58.3 / assassin 46.3 / demonist 55.2), hard 8.1 % (in range; 12.3 / 6.4 / 5.6), class gap normal 12.0 / hard 6.7 %p. Proposals awaiting the user's confirmation: assassin hero power 2 → 3 damage; if normal still < 55 %, normal boss health −1.
- P02 T01 spotlight overlay (bc51765, 6d66158) and T02 8-step tutorial flow done.
- Released: the newest production release is **v1.0.7** (2026-11-25). Since then the main menu / battle-screen theme (`apps/web/src/styles/theme.css`, original board art kept) and the patch-notes redesign were deployed silently as v1.0.7 without patch-note entries, at the user's request. Deploying needs `SWA_CLI_DEPLOYMENT_TOKEN` in `.env`; the token was shared in chat on 2026-11-19 and **should still be rotated** in the Azure portal.
- Balance changes need the user's confirmation (D06): this plan only measures.
- Browser checks: always `--mute-audio`, no autoplay flag, force-kill headless Chrome afterwards (assistant memory `feedback-muted-browser-tests`). The dev-only `?design-preview` URL renders the game without signing in.
- Environment: Node 24 lives in `~/.local/node-v24.22.3-darwin-arm64/bin` (prefix commands with `export PATH="$HOME/.local/node-v24.22.3-darwin-arm64/bin:$PATH"`); git author for this repo is the existing `asdf-dot888` identity. Releases on this Mac are manual (assistant memory `project-release-process`, `links-three-at-once`, `feedback-version-numbering`).
- Commit by explicit file path only; never commit the user's `Feedback` file.
- The user wants memory plans run to the end without questions between tasks.

## Next Step (IMPORTANT)
P02-T03 청사진을 읽고 `apps/web/src/game/tutorialProgress.ts`(`loadSeenTips`, `markTipSeen`), 새 `TutorialTip.tsx`, `App.tsx` 팁 표시 구현.
