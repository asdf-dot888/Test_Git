# Current Context

## Active Plan
[Card Details (PC Hover Preview) and Touch Tap-Details / Touch Drag](./plans/2026-11-19-card-details-and-touch-drag.md) — complete (implementation); the user's check on a real phone is pending.

## Active Phase
None — P01, P02, P03 and P04 are complete.

## Active Task
None — no active task.

## Status
- Plan done: 4 phases and 10 tasks (PC hover preview, touch tap details, touch drag, guidance and verification). 1095 tests, lint and build pass.
- Decisions: [discard hover preview](./decisions/2026-11-19-discard-card-hover-preview.md), [mobile tap details and touch drag](./decisions/2026-11-19-mobile-card-tap-details-and-touch-drag.md). D08 of the mobile decision (assassin hero power stays tap-to-target on touch) was added while planning as a default and is not yet confirmed by the user.
- Previous plan (unique spell and hero power effects) is implemented; the user's visual/audio review is still pending (`npm run dev`, open `/?effects-preview`).
- Released: production serves **v1.0.5** (deployed 2026-11-19, release commit 9575aed). Deploying needs `SWA_CLI_DEPLOYMENT_TOKEN` in `.env`; the token was shared in chat on 2026-11-19 and should be rotated in the Azure portal. This plan is not released.
- Claude cannot test touch behavior on a phone; it is verified by unit/jsdom tests and still needs the manual checklist in P04-T02.

## Next Step (IMPORTANT)
No active task. Wait for the user's phone check of the touch controls (checklist in [P04-T02](./phases/2026-11-19-card-details-and-touch-drag/P04-guidance-and-verification/T02-audit-and-close-out.md)) and retune in a small follow-up plan, then release (version bump and deploy) when the user asks. The P01-T01 full test run once had an unexplained flaky failure (reruns passed); mention it if it recurs.
