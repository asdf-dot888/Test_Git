# Current Context

## Active Plan
[Hero Power Cooldown and Spotlight Tutorial](./plans/2026-11-25-hero-power-cooldown-and-tutorial.md) — decisions: [2026-11-25-hero-power-cooldown-and-tutorial](./decisions/2026-11-25-hero-power-cooldown-and-tutorial.md)

## Active Phase
[P01 Hero Power Cooldown](./phases/2026-11-25-hero-power-cooldown-and-tutorial/P01-hero-power-cooldown/phase.md)

## Active Task
[T02 Simulation Bot Cooldown and Measurement](./phases/2026-11-25-hero-power-cooldown-and-tutorial/P01-hero-power-cooldown/T02-bot-and-measurement.md) — status `in_progress`.

## Plan Overview (7 tasks)
- P01: T01 engine cooldown (+API schema), T02 bot + 1000-run measurement (no tuning), T03 cooldown on the hero power button and in the texts.
- P02: T01 spotlight overlay component, T02 8-step tutorial flow (picker always first, hero power step), T03 one-time taunt/fatigue tips, T04 muted screen audit and close-out.

## Status
- P01-T01 done (6a45de7): `BattleState.heroPowerCooldown`, 2-turn rest after a use, hydration, API schema; 1264 tests pass.
- Released: the newest production release is **v1.0.7** (2026-11-25). Since then the main menu / battle-screen theme (`apps/web/src/styles/theme.css`, original board art kept) and the patch-notes redesign were deployed silently as v1.0.7 without patch-note entries, at the user's request. Deploying needs `SWA_CLI_DEPLOYMENT_TOKEN` in `.env`; the token was shared in chat on 2026-11-19 and **should still be rotated** in the Azure portal.
- Balance changes need the user's confirmation (D06): this plan only measures.
- Browser checks: always `--mute-audio`, no autoplay flag, force-kill headless Chrome afterwards (assistant memory `feedback-muted-browser-tests`). The dev-only `?design-preview` URL renders the game without signing in.
- Environment: Node 24 lives in `~/.local/node-v24.22.3-darwin-arm64/bin` (prefix commands with `export PATH="$HOME/.local/node-v24.22.3-darwin-arm64/bin:$PATH"`); git author for this repo is the existing `asdf-dot888` identity. Releases on this Mac are manual (assistant memory `project-release-process`, `links-three-at-once`, `feedback-version-numbering`).
- Commit by explicit file path only; never commit the user's `Feedback` file.
- The user wants memory plans run to the end without questions between tasks.

## Next Step (IMPORTANT)
T02 청사진을 읽고 `packages/game-core/src/balance/bot.ts` `heroPowerPhase` 가드에 쿨다운 추가 후 1000판 측정(`docs/balance/2026-11-25-hero-power-cooldown.md`) 실행. 수치 조정 금지.
