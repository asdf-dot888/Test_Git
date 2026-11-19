# Current Context

## Active Plan
[Card Details (PC Hover Preview) and Touch Tap-Details / Touch Drag](./plans/2026-11-19-card-details-and-touch-drag.md) — in progress (P01 and P02 done, P03 and P04 left).

## Active Phase
[P03 Touch Drag](./phases/2026-11-19-card-details-and-touch-drag/P03-touch-drag/phase.md) — P01 and P02 are done.

## Active Task
[P03-T02 Touch Drag Engine](./phases/2026-11-19-card-details-and-touch-drag/P03-touch-drag/T02-touch-drag-engine.md)

## Status
- Plan has 4 phases and 10 tasks: P01 (1) PC hover preview, P02 (3) touch tap details, P03 (4) touch drag, P04 (2) guidance and verification.
- Decisions: [discard hover preview](./decisions/2026-11-19-discard-card-hover-preview.md), [mobile tap details and touch drag](./decisions/2026-11-19-mobile-card-tap-details-and-touch-drag.md). D08 of the mobile decision (assassin hero power stays tap-to-target on touch) was added while planning as a default and is not yet confirmed by the user.
- Previous plan (unique spell and hero power effects) is implemented; the user's visual/audio review is still pending (`npm run dev`, open `/?effects-preview`).
- Released: production serves **v1.0.5** (deployed 2026-11-19, release commit 9575aed). Deploying needs `SWA_CLI_DEPLOYMENT_TOKEN` in `.env`; the token was shared in chat on 2026-11-19 and should be rotated in the Azure portal. This plan is not released.
- Claude cannot test touch behavior on a phone; touch work is verified by unit/jsdom tests and the manual checklist in P04-T02.

## Next Step (IMPORTANT)
Run `/memory-execute` (or “current 보고 이어서 해줘”) to implement P03-T02. Until P03-T03 lands, touch users can read card details but cannot play cards (tap no longer selects); the plan ships as one release. Note: the P01-T01 full test run had one unexplained flaky failure (reruns passed); mention it if it recurs.
