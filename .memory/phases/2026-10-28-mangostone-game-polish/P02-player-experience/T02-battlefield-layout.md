# Task: T02 Battlefield Layout and Attack Readiness

## Status: done

## Goal

Reduce hand-card display size moderately so the battlefield gains usable screen space, visibly gray friendly minions that cannot attack, and move the all-attack button to the battlefield's upper-right corner.

## Decision Summary

- Source: `.memory/decisions/2026-10-28-battle-layout-audio-access.md`.
- Attack-ineligible friendly minions are those summoned this turn or already used to attack. Gray styling communicates attack unavailability, but must not block friendly-minion spell targeting.
- Keep existing all-attack enablement and sequential attack rules; add a sword icon and retain the localized “전체 공격” label.

## Implementation

### I01. Rebalance the board and hand dimensions

- Related Files:
  - `apps/web/src/styles/board.css` :: `.game-shell`, `.battle-board`, `.player-controls`, `.hand-panel`, `.hand-cards`, `.game-card`, and responsive media rules — adjust vertical space and card dimensions; modify.
  - `apps/web/src/components/GameBoard.test.tsx` — preserve board structure assertions; modify only if selectors/structure change.

#### Details

- Keep the existing full-width game layout and reduce hand card width/height and artwork height moderately; do not hide card name, cost, stats, description, or horizontal scrolling.
- Increase the battle board's flexible vertical share so both enemy and friendly lanes receive the recovered space. Preserve minimum usable board height and viewport scrolling on short/mobile screens.
- Ensure the hand remains reachable and selectable, and card hover/focus expansion or any current selection cues remain within the viewport.

### I02. Mark friendly attack-ineligible minions without blocking spell targets

- Related Files:
  - `apps/web/src/components/MinionLane.tsx` :: `MinionLane` and `MinionCard` props — compute attack readiness from `summonedTurn`, `turnNumber`, and `hasAttacked`; modify.
  - `apps/web/src/components/MinionCard.tsx` :: `MinionCardProps`, root button class and accessible label — add an exhausted state; modify.
  - `apps/web/src/styles/board.css` :: `.minion-card.is-exhausted` and enemy override — add muted grayscale/opacity styling only for attack-unavailable friendly minions; modify.
  - `apps/web/src/components/MinionLane.test.tsx`, `apps/web/src/components/MinionCard.test.tsx` — test readiness and target interactions; modify.

#### Details

- For friendly minions, compute `attackUnavailable = minion.summonedTurn >= turnNumber || minion.hasAttacked` independently of the current target mode. Render a stable `is-exhausted` class whenever that minion cannot attack.
- Keep the minion button enabled for valid spell targeting. In `targetMode === "spell"`, preserve targetSide checks and allow an exhausted friendly minion as a buff/heal target.
- In `targetMode === "none"`, clicking or dragging an exhausted friendly minion must not start an attack. Preserve existing behavior for minions that can attack.
- Do not gray enemy minions as exhausted based on the player's `turnNumber`; their controls remain governed by existing target mode.
- Test newly summoned minions, minions that have attacked, ready minions, spell target selection on a gray minion, and no attack selection from a gray minion.

### I03. Move all-attack control to field actions

- Related Files:
  - `apps/web/src/components/GameBoard.tsx` :: `.battle-board` action area and `.player-toolbar` — move the button into the board's upper-right; modify.
  - `apps/web/src/styles/board.css` :: `.all-attack-button`, new field action wrapper, responsive rules — style placement/icon; modify.
  - `apps/web/src/App.interactions.test.tsx`, `apps/web/src/components/GameBoard.test.tsx` — keep behavior and accessible name coverage; modify.

#### Details

- Render the control inside the battlefield at its upper-right, with a visible sword icon and text “전체 공격”.
- Preserve `allAttackDisabled = actionsDisabled || battle.enemyBoard.length > 0 || readyMinionCount === 0`; preserve `onAllAttack` dispatch and per-minion sequential animations.
- Use `aria-label` including the number of attack-ready minions and retain the existing explanatory title. Ensure the control does not cover enemy-intent preview or target picker; reserve top-edge space and use a mobile-safe size.
- Keep the turn-end button in its current toolbar position and verify the all-attack button is no longer adjacent to it.

## Acceptance Criteria

- [x] The field is visibly taller while hand cards stay readable and all card information remains accessible.
- [x] Newly summoned/already-attacked friendly minions look gray and cannot initiate attacks or all-attack, while remaining valid spell targets.
- [x] The sword-labeled all-attack control sits at the battlefield's upper-right and retains existing rules and sequence.
- [x] Board controls do not overlap on desktop or mobile viewports.

## Validation

- `npm test -- apps/web/src/components/MinionLane.test.tsx apps/web/src/components/MinionCard.test.tsx apps/web/src/components/GameBoard.test.tsx apps/web/src/App.interactions.test.tsx` — interactions and layout-related component tests pass.
- `npm run lint -- apps/web/src/components/GameBoard.tsx apps/web/src/components/MinionLane.tsx apps/web/src/components/MinionCard.tsx` — lint passes.
- `npm run build --workspace @board-game/web` — web build succeeds.

## Commit Message

Validation note: targeted ESLint passed on every changed TS/TSX file. The workspace lint script checks all of `src` and reports four pre-existing errors in `gameActions.ts` and `useLocalRun.ts`. The web build passed with existing bundle-size and MSAL dynamic-import warnings.

```text
feat(web): expand battlefield and clarify attack readiness

Plan: 2026-10-28-mangostone-game-polish
Phase: P02-player-experience
Task: T02-battlefield-layout

- Give the battlefield more height by moderately reducing hand cards
- Mark exhausted friendly minions and move all-attack to the field
```

## Progress

- [x] Implementation complete
- [x] Validation passed
- commit: pending

