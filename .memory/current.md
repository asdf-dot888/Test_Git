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
- Not released. IMPORTANT correction: production still serves **v1.0.3**. The earlier "v1.0.4" and "v1.0.5" releases never reached Azure (the SWA CLI's device-code login fails with a keychainCache error and exits 0, which the old deploy script mistook for success); those records were reverted in commit 02ccd85. The deploy script now fails unless the CLI reports "Project deployed to" and the live site serves the new bundle. Deploying needs `SWA_CLI_DEPLOYMENT_TOKEN` (Azure portal > Static Web App > Manage deployment token) in `.env` or the environment; the next real release will be v1.0.4.

## Next Step (IMPORTANT)
No active task. Wait for the user's review of the effects (retune in a small follow-up plan) or start a new feature with `/grill-me <feature>`.
