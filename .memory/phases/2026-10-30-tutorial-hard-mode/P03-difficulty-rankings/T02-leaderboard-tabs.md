# Task: T02 Leaderboard Tabs

## Status: done

## Goal

Submit completed battle progress with the run's difficulty and let users switch the existing leaderboard modal between Normal and Hard top-ten lists.

## Decision Summary

- Put Normal and Hard tabs at the top of the existing leaderboard modal.
- Each tab loads and displays the selected difficulty's independent best progress.

## Implementation

### I01. Thread difficulty through the web leaderboard client and submission lifecycle

- Related Files:
  - `apps/web/src/leaderboard/leaderboardClient.ts` :: `LeaderboardRecord`, `getTopTen`, `submitProgress`, response validators; modify
  - `apps/web/src/leaderboard/leaderboardClient.test.ts` :: difficulty request/response validation; modify
  - `apps/web/src/App.tsx` :: leaderboard state, `loadLeaderboard`, `submitLeaderboardProgress`, `acknowledgeVictory`; modify
  - `apps/web/src/App.leaderboard.test.tsx` :: per-difficulty reads and submissions; modify

#### Details

- **Signatures & Types**:
  ```typescript
  export type RunDifficulty = "normal" | "hard";
  export interface LeaderboardRecord {
    id: "best-progress" | "best-progress:hard";
    userId: string;
    displayName: string;
    difficulty: RunDifficulty;
    completedBattles: number;
    recordedAt: string;
    schemaVersion: 2;
  }

  getTopTen(token: string, difficulty: RunDifficulty, fetcher?: typeof fetch): Promise<LeaderboardRecord[]>;
  submitProgress(token: string, completedBattles: number, difficulty: RunDifficulty, fetcher?: typeof fetch): Promise<{ record: LeaderboardRecord; updated: boolean }>;
  ```
- **Execution Flow / Logic**:
  1. Add the difficulty query string to GET and the difficulty field to POST JSON.
  2. Validate v2 responses strictly. Normalize a legacy v1 record missing difficulty as Normal for backward-compatible cached/test/API data only if needed; never classify a hard record as Normal.
  3. At victory acknowledgement, submit `run.difficulty` with `run.completedBattles`. Include difficulty in the de-duplication key so a Normal and Hard run cannot suppress each other's submission.
  4. Keep a `selectedLeaderboardDifficulty: RunDifficulty` state in `GameSessionContent`, default Normal; reload the selected tab when the user switches difficulty.

### I02. Add accessible Normal/Hard tabs in the leaderboard modal

- Related Files:
  - `apps/web/src/components/LeaderboardModal.tsx` :: props, tab group, selected list; modify
  - `apps/web/src/components/LeaderboardModal.test.tsx` :: tab accessibility and state; modify
  - `apps/web/src/styles/board.css` :: `.leaderboard-tabs` and selected/keyboard states; modify
  - `apps/web/src/App.leaderboard.test.tsx` :: load selected difficulty; modify

#### Details

- Add props `difficulty: RunDifficulty` and `onDifficultyChange(difficulty: RunDifficulty): void`.
- Render a `role="tablist"` with two tabs named `보통` and `하드`; each tab has `aria-selected` and controls the same list panel.
- On tab change, request that mode's data, show the existing loading/error/empty states for the newly selected mode, and preserve the prior tab's data only as cached data for that same mode.
- Label the list as the selected mode's top ten. Keep row contents (rank, display name, progress label, date), responsive layout, close control, and retry behavior.

## Acceptance Criteria

- [ ] Victory submissions include the run's exact difficulty.
- [ ] Switching tabs queries the correct API difficulty and never mixes records from both lists.
- [ ] Existing error/retry, empty-state, modal close, desktop, and mobile behavior remain available.
- [ ] Tabs are keyboard accessible and announce selected state to assistive technology.

## Validation

- `npm run test --workspace @board-game/web -- src/leaderboard/leaderboardClient.test.ts src/components/LeaderboardModal.test.tsx src/App.leaderboard.test.tsx`
- `npm run build --workspace @board-game/web`
- `npm run build`

## Commit Message

```text
feat(leaderboard): add normal and hard ranking tabs

Plan: 2026-10-30-tutorial-hard-mode
Phase: P03-difficulty-rankings
Task: T02-leaderboard-tabs

- Submit run difficulty with completed progress
- Add separate accessible Normal and Hard ranking tabs
```

## Progress

- [x] Implementation complete
- [x] Validation passed
- commit: pending
