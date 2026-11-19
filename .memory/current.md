# Current Context

## Active Plan
[Unique Spell and Hero Power Effects (Visual and Sound)](./plans/2026-11-18-spell-and-hero-power-effects.md) — complete (implementation); review pending with the user.

## Active Phase
None — P01, P02 and P03 are complete.

## Active Task
None — no active task.

## Status
- All 35 effects (3 hero powers, 24 player spells, 8 boss spells) have unique CSS/SVG visuals and synthesized sound recipes; 997 tests, lint and build pass; the gallery and bot are not in the production bundle.
- Not verified by Claude: how the effects actually look and sound (no browser tool in this session). The user should run `npm run dev` and open `/?effects-preview`, then report effects to retune (timing, colors, glyphs, loudness).
- Released: production serves **v1.0.5** (deployed 2026-11-19, release commit 9575aed), verified against the live site (bundle contains 1.0.5; /changelog.html is served). v1.0.4 was never deployed (its content ships in v1.0.5). Deploying needs `SWA_CLI_DEPLOYMENT_TOKEN` in `.env` (the device-code login does not work with SWA CLI 2.1.0); the token was shared in chat on 2026-11-19, so it should be rotated in the Azure portal (Manage deployment token > reset) and the new value placed in `.env`.

## Next Step (IMPORTANT)
No active task. Wait for the user's review of the effects (retune in a small follow-up plan) or start a new feature with `/grill-me <feature>`.
