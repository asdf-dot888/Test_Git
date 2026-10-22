# Task: T03 타이머 HUD와 전투 연출 속도

## Status: done

## Goal

상단 턴 헤더에 타이머를 확정한 위치와 형식으로 표시하고 임박 경고·전투 연출 속도를 UI에 연결한다. 메뉴는 기존 전체 배경 blur만 사용하며 pause label은 추가하지 않는다.

## Decision Summary
- `TURN N` 바로 오른쪽에 `00:20` 형식으로 표시한다. 전투 효과 중 timer를 숨긴다.
- 5초 이하는 빨간 글씨로 깜빡인다. 현재 620ms 이동을 930ms로 바꾸고 impact도 약 1.5배 늘린다.

## Implementation

### I01. Turn header timer presentation
- Related Files:
  - `apps/web/src/components/GameBoard.tsx` :: `GameBoardProps`, topbar `run-meta`; modify
  - `apps/web/src/components/GameBoard.test.tsx` :: content/visibility/boundary tests; modify
  - `apps/web/src/styles/board.css` :: `.run-meta`, `.turn-number`, responsive/reduced-motion rules; modify

#### Details
- Define `TurnTimerPresentation { text: string; remainingSeconds: number; visible: boolean }`; add required `turnTimer` prop to `GameBoardProps`. App passes T02 hook presentation.
- Immediately after existing `<span className="turn-number">TURN {battle.turnNumber}</span>`, render timer. Text uses clamped remaining seconds as `00:20`..`00:00`. `visible:false` hides timer without substantially shifting run-meta layout. Apply `is-critical` only for `remainingSeconds <= 5`.
- Add Korean `aria-label` for remaining time and `aria-live="off"` to avoid frequent announcements. Do not render pause text.
- Use tabular numerals and stable min-width. Keep header centered; verify responsive rules at 720px/520px do not overlap TURN, timer, menu, controls. Critical style red with 0.8..1s blink. `prefers-reduced-motion: reduce` removes blink but keeps red color.
- Tests verify timer immediately follows TURN, hidden timer is not shown, 6s is normal and 5s is critical.

### I02. Slow combat flight and impact together
- Related Files:
  - `apps/web/src/styles/board.css` :: `.combat-effect-sprite`, `.combat-effect-impact`, flight keyframes, reduced-motion; modify
  - `apps/web/src/components/CombatEffectLayer.tsx` :: impact delay and fallback completion; modify
  - `apps/web/src/components/CombatEffectLayer.test.tsx` :: event completion lifecycle; modify

#### Details
- Change card-frame and minion portrait flight 620ms→930ms; preserve keyframe targets, easing, z-index, and ordering. Start impact at the flight's 930ms arrival and set impact duration 280ms→420ms, for about 1,350ms total CSS playback.
- Preserve current inter-event stagger. Set fallback completion to at least 1,400ms plus existing per-index stagger so it cannot clear an event before CSS impact ends and resume timer early. Keep animationend path and prevent duplicate completion.
- Preserve reduced-motion sprite/impact 160ms, zero forced delay, and JS fallback 220ms. Tests check completion once, normal fallback not early, and reduced-motion can complete promptly.

### I03. Menu/animation integration
- Related Files:
  - `apps/web/src/components/GameBoard.test.tsx` :: timer presentation under menu; modify
  - `apps/web/src/App.timer.test.tsx` :: hidden-during-effect pause/resume; modify
  - `apps/web/src/styles/board.css` :: existing `.game-menu-backdrop`; read-only unless narrow layout correction is required

#### Details
- Keep existing blurred full-screen menu backdrop only; no pause label. T02 pauses snapshot while menu is open.
- While any combat effect remains, hide HUD timer and preserve the pause snapshot. On final effect completion, show remaining time again.
- Verify timer hides during enemy action after end-turn and returns at `00:20` for next player turn. Check 1280/720/520 widths for overlap.

## Acceptance Criteria
- [x] Timer is immediately right of `TURN N` and reads `00:20`.
- [x] Menu uses existing blur only, no pause label; timer freezes there.
- [x] Timer hides during combat animation and resumes with preserved time.
- [x] At 5 seconds it is red and blinking; reduced motion removes blink.
- [x] Flight is 930ms, impact begins on arrival and lasts 420ms (about 1.35s total); completion does not resume clock early.
- [x] Header elements do not overlap at desktop/tablet/mobile widths.

## Validation
- `npm.cmd run test --workspace @board-game/web -- src/components/GameBoard.test.tsx src/components/CombatEffectLayer.test.tsx src/App.timer.test.tsx` — HUD/effect lifecycle tests pass
- `npm.cmd run lint --workspace @board-game/web` — lint passes
- `npm.cmd run build --workspace @board-game/web` — TypeScript/Vite build passes
- Manual Local Demo: verify 1280/720/520 widths, critical countdown, menu, attack/spell animation, timeout.

## Commit Message
```text
feat(ui): show the turn timer and slow combat effects

Plan: 2026-10-22-interaction-sounds-and-turn-timer
Phase: P01-interaction-feedback-and-turn-clock
Task: T03-timer-hud-and-combat-timing

- Add the countdown beside the turn label
- Slow card travel and impact animation together
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: pending
