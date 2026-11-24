# Task: T03 Turn-Order Pick Overlay, Coin and Enemy-First Playback

## Status: todo

## Goal
At the start of every battle the player sees two face-down cards and picks one; the chosen role is revealed (first or second), the hands are dealt and, when the enemy is first, its turn plays out with the normal playback before the player's turn begins. The Coin appears in the hand like any card.

## Decision Summary
D06 and the architecture notes (the engine API is `chooseTurnOrder(run, cardIndex)`; `battle.firstSide === null` means pending).

## Implementation
### I01. Session action (`apps/web/src/game/gameActions.ts`, `useGameSession.ts`)
- New action `{ type: "choose-turn-order"; cardIndex: 0 | 1 }`: calls `chooseTurnOrder(session.run, cardIndex)`; if the result has `activeSide === "enemy"`, hand it to the same path as `end-turn` (`sessionForEnemyTurn(resolveEnemyTurnWithPlayback(run), session)`), otherwise `sessionForRun`. Keep a short "reveal" state: `session.turnOrderReveal: { role: "first" | "second" } | null` shown for about 1.2 s over the board (the `TurnBanner` mechanism can carry it: banner text `선공입니다` / `후공입니다 · 동전을 받았습니다`).
- `start-run` and `continue-run` call `createRun(...)` / `advanceRun(..., { pickTurnOrder: true })` (also the API's `newRun` in `apps/api/src/app.ts` and `apps/web/src/api/runClient.ts` if they create runs; the tutorial passes no option so it stays player-first); `restore-run` just restores whatever state was saved. The turn timer (`useTurnTimer`) must not start while `firstSide === null` and starts at the player's turn as today (check `App.timer.test.tsx`).
### I02. Overlay component `apps/web/src/components/TurnOrderPicker.tsx`
- Props `{ onPick(cardIndex: 0 | 1): void; disabled?: boolean }`. Shows the title `선후공을 정하세요`, two face-down card backs side by side (reuse the card-back art used by `EnemyHand`), hover/focus lift, keyboard operable (`button` elements with `aria-label="카드 1 선택"`/`"카드 2 선택"`), and the short hint `선공: 시작 손패 3장 · 후공: 4장과 동전`. After a pick the picked card flips to show `선공` or `후공` (CSS flip, no flip when `prefers-reduced-motion`), the other card stays face down until the overlay closes. Phone layout: cards stack comfortably within 360 px width; no horizontal scroll.
- `GameBoard.tsx` (or `App.tsx`) renders it above the board while `battle.firstSide === null`; the hand, enemy hand, end-turn and hero power controls are disabled meanwhile (the hands are empty anyway). The roadmap / start flows are unchanged.
### I03. Enemy-first playback
- With `firstSide === "enemy"`, the playback hook `useEnemyTurnPlayback` and `enemyTurnActive` run exactly like after `end-turn`; the turn badge shows `상대 턴` and the banner appears; `TurnBanner` keys must not clash (they derive from turn number and side). The opening-hand redraw control appears at the player's first turn (first battle only), also after an enemy-first turn, and works with a 4-card hand.
### I04. Coin in the UI
- `CardView` renders the Coin like any spell (name `동전`, cost 0, description `마나 1을 얻습니다.`); the Coin token art reuses the Mana Spring image. The hand-limit and discard pickers never offer it specially. Add the card to the card-details popup test list and to `spellEffectCatalog`/`spellEffectContent` if the spell-effect visual registry requires an entry for every spell (check `spellEffectCatalog.test.ts`; reuse the Mana Spring visual).
### I05. Tutorial (`App.tsx`, `FirstRunTutorial.tsx`, `tutorialProgress.ts`)
- The first-run tutorial battle always uses the "first" role: `App.tsx` auto-dispatches `choose-turn-order` with the index of the `first` card without showing the overlay while `tutorialMode !== "inactive"`. Text changes are in T04.
### I06. Tests
- `TurnOrderPicker.test.tsx` (renders two backs, picking calls `onPick` with the index, keyboard works, reveal text), `App.test.tsx` / `App.interactions.test.tsx` (new battle shows the picker; picking "first" gives 4 cards and the player's turn; picking "second" runs the enemy turn first, then the player's turn with the Coin in hand), `App.enemy-turn-playback.test.tsx` (enemy-first playback), `App.timer.test.tsx` (no timer while pending), `useGameSession.test.ts`, `gameActions.test.ts`, API restore of a pending battle (`firstSide: null`) shows the picker again. Update `App.testUtils.ts` helpers so existing tests pick "first" automatically.

## Acceptance Criteria
- [ ] Every new battle (first, later normal, boss) starts with the pick; picks work with mouse, touch and keyboard; enemy-first works with playback.
- [ ] A saved pending battle restores to the picker; an in-progress old battle restores as before.
- [ ] `npm run build`, `npm test`, `npm run lint` pass.

## Validation
- `npm run build`
- `npm test -- apps/web/src`
- `npm test`, `npm run lint`

## Commit Message
```text
feat(web): pick the turn order with two face-down cards and show the Coin

Plan: 2026-11-24-hearthstone-rules-and-taunt
Phase: P02-web-ui
Task: T03-turn-order-pick-and-coin-ui
```

## Progress
- [ ] done
