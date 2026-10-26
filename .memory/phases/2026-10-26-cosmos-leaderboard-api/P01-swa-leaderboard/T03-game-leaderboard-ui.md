# Task: T03 Game Leaderboard UI

## Status: done

## Goal

Acquire the delegated leaderboard token only when the player uses leaderboard features, submit completed battle counts after victory without blocking gameplay, and expose the top ten from both a dedicated main-menu option and a crown button on the expedition roadmap.

## Decision Summary

- Request `api://86862438-ff66-4df4-8302-802115dfed70/leaderboard.access` only for leaderboard API calls; keep initial Entra sign-in's `openid profile` scopes unchanged.
- Post only `{ completedBattles }` when the player acknowledges a victory. Do not post on autosave, defeat, or unfinished battle.
- Display the Entra name and completed progress only; do not show current in-progress battle state. Keep the leaderboard view and errors separate from the active battle flow.
- Add a separate `랭킹` option to the main menu. Add a crown-shaped ranking button near the upper-right corner of the expedition roadmap only; do not add the crown button to the active battle, victory, or reward screens.
- Both entry points open the same top-ten modal. Closing it returns to the screen from which it was opened; opening from the roadmap must not change the expedition screen or run state.

## Implementation

### I01. MSAL token acquisition and API client

- Related Files:
  - `apps/web/src/auth/authConfig.ts` :: extend `createAuthRequests` with `leaderboardRequest`; modify
  - `apps/web/src/auth/authState.ts` :: add `getLeaderboardAccessToken`; modify
  - `apps/web/src/auth/AuthProvider.tsx` :: implement silent token acquisition and interaction-required recovery; modify
  - `apps/web/src/auth/authConfig.test.ts` :: verify login scopes remain OIDC-only and API scope is exact; modify
  - `apps/web/src/auth/AuthProvider.test.tsx` :: cover token acquisition and reauthentication behavior; modify
  - `apps/web/src/leaderboard/leaderboardClient.ts` :: add GET/POST typed client; new
  - `apps/web/src/leaderboard/leaderboardClient.test.ts` :: test bearer requests, payload, and HTTP failures; new

#### Details

- Add `leaderboardRequest: { scopes: [`api://${config.clientId}/leaderboard.access`] }`; do not add this scope to `loginRequest`.
- Add context signature `getLeaderboardAccessToken(): Promise<string>`. Use the active MSAL account and `acquireTokenSilent`; if MSAL reports `InteractionRequiredAuthError`, use an interactive MSAL redirect/popup path initiated from the leaderboard UI, preserving the requested destination so the user returns to the same screen.
- Create:
  ```ts
  export type LeaderboardRecord = {
    id: "best-progress";
    userId: string;
    displayName: string;
    completedBattles: number;
    recordedAt: string;
    schemaVersion: 1;
  };

  export function getTopTen(token: string, fetcher?: typeof fetch): Promise<LeaderboardRecord[]>;
  export function submitProgress(
    token: string,
    completedBattles: number,
    fetcher?: typeof fetch,
  ): Promise<{ record: LeaderboardRecord; updated: boolean }>;
  ```
- Call same-origin paths `/api/leaderboard` and `/api/leaderboard/progress`, set `Authorization: Bearer <token>` and JSON content type on POST, send exactly `{ completedBattles }`, and do not add Cosmos or user ID/name fields to the request.
- Parse and validate server JSON before returning it. Convert non-2xx, malformed JSON, and network failure to typed safe client errors with retryable messages; never log tokens.

### I02. Victory submission and leaderboard entry points

- Related Files:
  - `apps/web/src/App.tsx` :: submit after `acknowledge-victory`, render modal, manage loading/error/retry state; modify
  - `apps/web/src/components/MainMenu.tsx` :: add `onLeaderboard` callback and ranking button; modify
  - `apps/web/src/components/MainMenu.test.tsx` :: verify button invokes callback; modify
  - `apps/web/src/components/ExpeditionRoadmap.tsx` :: add the roadmap-only crown ranking button and `onLeaderboard` callback; modify
  - `apps/web/src/components/ExpeditionRoadmap.test.tsx` :: verify accessible name, click callback, and disabled behavior; modify
  - `apps/web/src/components/LeaderboardModal.tsx` :: render top-ten modal; new
  - `apps/web/src/components/LeaderboardModal.test.tsx` :: cover loading, empty, populated, retry, and accessibility states; new
  - `apps/web/src/App.leaderboard.test.tsx` :: cover victory-only one-time submission, non-blocking failure, both entry points, and returning to the opening screen; new
  - `apps/web/src/styles/board.css` :: style the roadmap crown button, modal, rank rows, progress labels, and responsive layout; modify

#### Details

- Extend `MainMenu` with a mouse-accessible button labeled `랭킹` and an `onLeaderboard(): void` callback. Place this dedicated option alongside the existing `새 원정 시작` and `게임 방법` options.
- Extend `ExpeditionRoadmapProps` with `onLeaderboard(): void`. Render a crown-shaped button labeled `랭킹` near the roadmap panel's upper-right corner. This crown button appears only in the roadmap, not on the battle board or victory/reward screens. Honor the existing `disabled` prop. Add a visible focus style and a responsive position that does not cover the phase title or route nodes.
- In `App.tsx`, keep the current `screen` value (`menu` or `map`) unchanged while the leaderboard modal is open. Open the same modal from either entry point; closing it returns to the originating screen and leaves the run state unchanged. Load GET only when opened; include loading, empty, error/retry, and populated states.
- On the player's explicit victory confirmation, submit `run.completedBattles` once for that run/battle before dispatching `acknowledge-victory`. Do not await network completion before dispatching or rendering the reward flow. Deduplicate the same `${runId}:${completedBattles}` event for the mounted session and permit an explicit retry after a failed call.
- If API configuration, consent, or network is unavailable, keep victory acknowledgement, reward choice, and local run persistence usable. Show a non-blocking status with a link/button to open leaderboard consent/retry; do not discard a failed unsent score silently.
- Do not submit on defeat, end turn, state restoration, or every run save. Never submit the deck, current encounter, health, timer, or `RunState`.
- Display rank, `displayName`, completed progress, and `recordedAt`-based tie order supplied by API. For progress labels, map each group of four completed encounters to one phase: 1–3 = phase 1 normal victories, 4 = phase 1 boss defeated, 5–7 = phase 2 normal victories, 8 = phase 2 boss defeated, 9–11 = phase 3 normal victories, 12 = expedition complete. Use completed/victory wording, not “in progress.”
- Render at most ten entries and do not reveal `userId` in the UI.

## Acceptance Criteria

- [x] Initial login still asks only for `openid` and `profile`; API consent is requested on leaderboard use.
- [x] One victory submits only the completed count once, and gameplay/reward flow proceeds even when submission fails.
- [x] Defeats and autosaves never submit leaderboard progress.
- [x] The main menu has a dedicated `랭킹` option, and the expedition roadmap has a crown button near the upper-right corner; no crown button appears on battle or reward screens.
- [x] Both entry points open the same top-ten modal; closing it returns to the originating screen without changing the run.
- [x] The ranking modal shows loading, empty, error/retry, and up to ten ranked employee rows.
- [x] Full run data and bearer tokens never enter leaderboard request bodies, UI, or logs.

## Validation

- `npm test -- apps/web/src/auth/authConfig.test.ts apps/web/src/auth/AuthProvider.test.tsx apps/web/src/leaderboard apps/web/src/components/MainMenu.test.tsx apps/web/src/components/LeaderboardModal.test.tsx apps/web/src/App.leaderboard.test.tsx`
- `npm run build --workspace @board-game/web`
- `npm run lint -- apps/web/src`

## Commit Message

```text
feat(web): add Entra-backed progress leaderboard

Plan: 2026-10-26-cosmos-leaderboard-api
Phase: P01-swa-leaderboard
Task: T03-game-leaderboard-ui

- Request leaderboard access tokens only when leaderboard features are used
- Submit victories without blocking rewards and add the top-ten menu view
```

## Progress

- [x] Implementation complete
- [x] Validation passed: 31 targeted tests, web production build, and ESLint on all changed source/test files.
- Full `npm run lint -- apps/web/src` still reports three existing errors in `apps/web/src/game/useLocalRun.ts` (`useRef`, effect state update, `_reason`); no T03 files fail lint.
- commit: `feat(web): add Entra-backed progress leaderboard`
