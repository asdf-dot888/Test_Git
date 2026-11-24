# Task: T02 Turn Badge, Board Border and Turn Banner

## Status: todo

## Goal
Make it obvious whose turn it is: an always-visible `내 턴` / `상대 턴` badge in the top bar, a board border colour that follows the turn, and a centre banner for about 1 second at every turn change.

## Decision Summary
D02. Badge (gold for the player, red for the enemy) + border colour + 1-second banner. The banner never blocks input and is static when the user prefers reduced motion.

## Implementation
### I01. Turn side
- `apps/web/src/App.tsx`: pass a new prop `enemyTurnActive={Boolean(playback)}` to `GameBoard` (`playback = session.enemyTurnPlayback`, already computed in `App`).
- `apps/web/src/components/GameBoard.tsx`: new optional prop `enemyTurnActive?: boolean` (default `false`). Derive `const turnSide: "player" | "enemy" = enemyTurnActive || battle.activeSide === "enemy" ? "enemy" : "player";` and `const turnLive = battle.status === "active";`.
### I02. Badge and border
- In `.run-meta`, after `span.turn-number`, render `{turnLive && <span className={`turn-badge is-${turnSide}`} role="status" aria-live="polite">{turnSide === "player" ? "내 턴" : "상대 턴"}</span>}`.
- On `section.battle-board` add the class `is-player-turn` / `is-enemy-turn` while `turnLive` (keep `is-timer-critical`, which stays on top when both apply).
- `board.css`: `.turn-badge` (pill: 11px bold, padding 3px 10px, border 1px); `.turn-badge.is-player` gold (`#d4aa62` text and border, dark fill), `.turn-badge.is-enemy` red (`#f08a8a`, dark red fill); `.battle-board.is-player-turn { border-color: rgb(212 170 98 / 70%); box-shadow: 0 0 22px rgb(212 170 98 / 14%) }`, `.battle-board.is-enemy-turn { border-color: rgb(220 90 90 / 70%); box-shadow: 0 0 22px rgb(220 90 90 / 16%) }` (adapt to the existing border/shadow declarations of `.battle-board`). Show the badge on mobile too (the `.run-meta > span:first-child { display: none }` rule hides only the first span).
### I03. Banner
- New `apps/web/src/components/TurnBanner.tsx`: `TurnBanner({ turnKey, side }: { turnKey: string | null; side: "player" | "enemy" })`. Portal to `document.body`; visible for 1 000 ms after each new `turnKey` (same timer pattern as `TurnStartGlow.tsx`); markup `<div className={`turn-banner is-${side}`} aria-hidden="true" data-turn-key={turnKey}><span>{side === "player" ? "내 턴" : "상대 턴"}</span></div>`.
- `board.css`: `.turn-banner { position: fixed; inset: 0; z-index: 35; display: grid; place-items: center; pointer-events: none; }`, a large text span (clamp 28-56px, letter-spacing, text-shadow, gold or red), animation `turn-banner-pop` (scale .9 -> 1, opacity 0 -> 1 -> 0 over 1000 ms). `@media (prefers-reduced-motion: reduce)`: no animation, constant `opacity: .92`.
- `App.tsx`: new state `turnBanner: { key: string; side: "player" | "enemy" } | null`, rendered next to `<TurnStartGlow ...>`. Set it:
  - for the player: where `setTurnStartGlowId(activeTurnId)` is set today, and also for the first turn of a battle that starts in the current session (battle id changes while `run.runId` and `sync.loadVersion` are unchanged); never when the screen was just restored from storage or sync (the existing `lastObservedLoadVersion` guard);
  - for the enemy: when `playback` becomes non-null (key `enemy-${battle.battleId}-${battle.turnNumber}`).
  - Suppress the banner while `tutorialMode !== "inactive"`.
- Keep `TurnStartGlow` and the `turn-start` sound as they are.

## Acceptance Criteria
- [ ] During the player's active turn the badge reads `내 턴` and the board has `is-player-turn`; while `enemyTurnActive` (or `activeSide === "enemy"`) it reads `상대 턴` and the board has `is-enemy-turn`; no badge when the battle is won or lost.
- [ ] The badge is visible on mobile widths (no CSS rule hides it).
- [ ] The banner appears at the start of the player's turn, of the enemy's turn playback, and on the first turn of a new battle; it disappears after about 1 second; it is not rendered on a page load or resume, and not during the tutorial.
- [ ] The banner never receives clicks (`pointer-events: none` and `aria-hidden`).
- [ ] Existing turn-start glow and sound tests still pass. Build, lint and tests pass.

## Validation
- `npm run build`
- `npm test -- apps/web/src/components/GameBoard.test.tsx apps/web/src/App.enemy-turn-playback.test.tsx apps/web/src/components/TurnStartGlow.test.tsx apps/web/src/App.audio.test.tsx`
- Tests to add: `GameBoard.test.tsx` (badge text and classes for both sides and for a finished battle), `TurnBanner.test.tsx` (visible, then gone after 1 s with fake timers, new key restarts), `App.enemy-turn-playback.test.tsx` (badge `상대 턴` and the enemy banner during playback, `내 턴` afterwards), an App test that a restored run shows no banner.
- `npm test`, `npm run lint`

## Commit Message
```text
feat(web): show whose turn it is with a badge, board border and turn banner

Plan: 2026-11-24-playtest-feedback-round
Phase: P01-battle-layout-and-turn-clarity
Task: T02-turn-badge-and-banner
```

## Progress
- [ ] implementation complete
- [ ] validation passed
- commit: pending
