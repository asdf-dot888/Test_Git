# Task: T03 One-Time Taunt and Fatigue Tips

## Status: done

## Goal
The first time a taunt minion is on either board, and the first time the player takes fatigue damage, a short tip appears once per account and never again. These two rules cannot be forced in the tutorial battle because the enemy deck is random.

## Decision Summary
- D05: taunt and fatigue are taught when they first happen, once each.

## Implementation

### I01. Seen-flags storage
- Related Files:
  - `apps/web/src/game/tutorialProgress.ts` :: new `loadSeenTips`, `markTipSeen`, `TutorialTipId` — modify
  - `apps/web/src/game/tutorialProgress.test.ts` — modify

#### Details
- **Signatures & Types**:
  ```typescript
  export type TutorialTipId = "taunt" | "fatigue";
  /** Tips this account has already seen. Storage errors and bad data count as "none seen". */
  export function loadSeenTips(storage: Storage, userId: string): Set<TutorialTipId>;
  export function markTipSeen(storage: Storage, userId: string, tip: TutorialTipId): { status: "saved" } | { status: "error"; error: unknown };
  ```
- Separate key: `board-card-roguelike:tutorial-tips:v1:${encodeURIComponent(userId)}`, value `{ schemaVersion: 1, userId, seen: TutorialTipId[] }`. Ignore unknown ids when loading.
- Tests: round trip; unknown/corrupt data → empty set; storage that throws → empty set / error result.

### I02. Tip display
- Related Files:
  - `apps/web/src/App.tsx` — modify (new effect + state near the tutorial state)
  - `apps/web/src/components/TutorialTip.tsx` — new (small non-blocking toast)
  - `apps/web/src/styles/board.css` — `.tutorial-tip` rules (reuse the look of `.first-run-tutorial-notice`) — modify

#### Details
- State: `const [activeTip, setActiveTip] = useState<TutorialTipId | null>(null)` and a ref with the account's seen set (loaded once per `auth.userId`).
- Effect on `session.run` (only when `screen === "game"`, `auth.userId` set, `tutorialMode !== "replay"`, no tip showing):
  - taunt: not seen and `[...battle.playerBoard, ...battle.enemyBoard].some(hasTaunt)` (import `hasTaunt` from `@board-game/game-core`).
  - fatigue: not seen and `(battle.playerFatigue ?? 0) > 0`.
  - On trigger: `setActiveTip(id)`, `markTipSeen(...)`, add to the ref set. If both trigger at once, show taunt first; fatigue triggers on a later run update.
- `TutorialTip` props: `{ tip: TutorialTipId; onClose(): void }`. Fixed bottom-centre toast (`role="status"`), title + one sentence + 닫기 button; auto-hides after 9 s; does not block clicks outside itself.
  - taunt: 도발 / "방패 표시가 있는 하수인이 도발입니다. 상대 전장에 도발이 있으면 그 하수인부터 공격해야 합니다."
  - fatigue: 탈진 / "덱이 비어 카드를 못 뽑으면 영웅이 피해를 받습니다. 뽑을 때마다 1, 2, 3…씩 커집니다."
- While the 8-step spotlight is active (first-run tutorial), postpone tips until `tutorialMode === "inactive"` so two overlays never compete.

### I03. Tests
- `apps/web/src/App.tutorial.test.tsx` (or a new `App.tips.test.tsx`): a completed account whose battle has a taunt minion sees the taunt tip once; after closing and another run update it does not come back; a stored "seen" flag suppresses it. Fatigue: set `playerFatigue = 1` in the restored run → fatigue tip.

## Acceptance Criteria
- [x] Each tip shows once per account on its first occurrence and never again (also after reload).
- [x] Tips never overlap the spotlight tutorial and never block play.

## Validation
- `export PATH="$HOME/.local/node-v24.22.3-darwin-arm64/bin:$PATH"; npm test` — all pass.
- `npm run lint`, `npx tsc -p apps/web --noEmit` — clean.

## Commit Message
```text
feat(web): explain taunt and fatigue once when they first happen

Plan: 2026-11-25-hero-power-cooldown-and-tutorial
Phase: P02-spotlight-tutorial
Task: T03-contextual-tips

- One-time tips per account for the first taunt minion and the first fatigue damage.
- Seen flags stored next to the tutorial completion record.
```

## Progress
- [x] 구현 완료
- [x] 검증 통과 (1278 tests / 106 files twice in a row, lint, web tsc). One run had `App.enemy-turn-playback` hit its 5 s timeout under load (5090 ms); it passes alone and in the two full reruns.
- Deviation: no `activeTip` state. The tip shown is derived from the battle (`pendingTip`) minus the stored flags and the tips closed in this session, and an effect only writes the "seen" flag (the lint rule forbids setState inside effects). A tip therefore counts as seen as soon as it appears.
- commit: see git log (feat(web): explain taunt and fatigue once when they first happen)
