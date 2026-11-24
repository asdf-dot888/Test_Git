# Task: T03 Turn-Order Pick, Opening Hands and the Coin

## Status: done

## Goal
Every battle starts in a "turn order pending" state with two face-down cards; the player picks one (a random placement of "first" and "second"); the engine then deals Hearthstone opening hands (first side 3 cards, second side 4 cards plus the Coin) and starts the first side's turn. The enemy can be the first side.

## Decision Summary
D06 plus the architecture notes of the plan (round-number rule, saved-run defaults, API schema).

## Implementation
### I01. Types and errors
- `types.ts`: `BattleState.firstSide?: PlayerSide | null` (`null` = not chosen yet; `undefined` in saved data means `"player"`) and `BattleState.turnOrderCards?: [TurnOrderRole, TurnOrderRole]` with `type TurnOrderRole = "first" | "second"` (the roles behind face-down card 0 and 1, a random permutation made with `battle.rngState`).
- `errors.ts`: new code `TURN_ORDER_PENDING`.
### I02. Catalog
- New token card `the-coin` ("동전", cost 0, spell, `spellEffects: [{ kind: "gainMana", amount: 1 }]`, `tokenOnly: true`, `rewardTier: "normal"`, `artKey` reusing the Mana Spring art unless a coin art exists) exported as `COIN_CARD_ID`. It must never appear in rewards, enemy deck building or the starter deck (check `tokenOnly` filters in `rewardChoices` and `createEnemyDeck`).
### I03. `engine.ts`
- `beginEncounter`: the battle starts with `firstSide: null`, empty `hand`/`enemyHand`, the full shuffled decks in `drawPile`/`enemyDrawPile`, `turnNumber: 1`, `activeSide: "player"` (placeholder), `turnOrderCards` set. All player actions (`playMinion`, `castSpell*`, `attackWithMinion`, `attackAllReadyMinions`, `useHeroPower`, `fuseMinions`, `endPlayerTurn*`, `redrawOpeningHand`, `discardBeforeDraw`) fail with `TURN_ORDER_PENDING` while `firstSide === null` (put the check in `assertPlayerTurn`), and `resolveEnemyTurnWithPlayback` too.
- New export `chooseTurnOrder(run: RunState, cardIndex: 0 | 1): RunState`: validates pending state; role = `turnOrderCards[cardIndex]`; `firstSide = role === "first" ? "player" : "enemy"`. Deals hands from the front of each pile with `openingHandAndDrawPile(shuffled, handSize)` (generalize the existing helper: size 3 for the first side, 4 for the second; the "cheap card (cost ≤ INITIAL_MANA) guarantee" applies to both sides' hands of the human player; the enemy keeps its plain deal). The second side also gets a Coin instance (`makeInstance(run, COIN_CARD_ID, "coin")`) appended to its hand (the player's hand or `enemyHand`). Then: if the player is first, set `activeSide = "player"` and run the turn-start routine (mana `min(10, turnNumber)`, draw 1; do **not** increment the turn number on turn 1); if the enemy is first, set `activeSide = "enemy"` and return (the caller then runs `resolveEnemyTurnWithPlayback`, which draws and plays; its end calls `startPlayerTurn`).
- Turn counter rule: `startPlayerTurn` increments `turnNumber` only when `firstSide === "player"`... but never on the battle's very first player turn (track with a helper `isFirstTurnOfBattle` = the first side has not yet finished a turn; simplest: the first-turn start in `chooseTurnOrder` does not call `startPlayerTurn`, it calls a shared `beginPlayerTurnResources(run, battle)` that `startPlayerTurn` also uses). When `firstSide === "enemy"`, `endPlayerTurnWithPlayback` increments `turnNumber` before handing over to the enemy, and `startPlayerTurn` (called at the end of the enemy turn) must not increment. Mana for both sides is `manaCapForTurn(turnNumber)`.
- Boss area attack cadence keeps `battle.turnNumber % N === 0` (each side's n-th turn is round n).
- `castSpellWithResolution` and the enemy equivalent (`playEnemyCard`): a spell whose id is `COIN_CARD_ID` is removed from the game (not pushed to the discard pile).
- `redrawOpeningHand`: conditions become: `firstSide !== null`, `openingHandRedrawAvailable`, first battle (`completedBattles === 0` and `encounterInPhase === 0`), `activeSide === "player"`, `turnNumber === 1`, and the player has not acted yet (keep `consumeOpeningHandRedraw`). It shuffles all non-Coin hand cards back with the draw pile and redeals the same number of cards (with the cheap-card guarantee); the Coin stays.
- `hydrateRunForCurrentBattle`: a battle without `firstSide` gets `"player"` (it was started under the old rules); `turnOrderCards` may stay undefined then.
- `index.ts` exports `chooseTurnOrder`, `COIN_CARD_ID`, the new types.
### I04. API schema (`runRoutes.ts`)
- `battleSchema`: `firstSide: z.enum(["player", "enemy"]).nullable().optional()` and `turnOrderCards: z.tuple([z.enum(["first","second"]), z.enum(["first","second"])]).optional()`; a round-trip test in `runRoutes.test.ts` incl. `firstSide: null` (pending) and `"enemy"`.
### I05. Tests (`engine.test.ts`, helpers `createRun`)
- Test helper: the existing `createRun` wrapper (10 mana) additionally calls `chooseTurnOrder` for the "first" card so old tests keep their meaning; add `createRunPending` for the new tests. `asEnemyTurn` is adapted if needed.
- First: player hand 3 + 1 draw on turn 1 = 4 cards, mana 1, enemy 4 cards + Coin on its first turn (draws 1 → 6 cards incl. Coin); second: player 4 + Coin + draw 1; enemy-first: `resolveEnemyTurnWithPlayback` runs at turn 1 with mana 1, then the player's turn 1 has mana 1 (not 2) and `turnNumber` is still 1; after the player ends it, the enemy's turn is turn 2 with mana 2.
- Round-number rule for both orders over 4 turns (mana on each side's n-th turn is `min(10, n)`; minions summoned in a side's turn can attack on that side's next turn only).
- Coin: playing it gives +1 mana (capped at 10), it is not in the discard pile afterwards; the enemy can play it (covered further in T04).
- Pending state: every player action throws `TURN_ORDER_PENDING`; `chooseTurnOrder` twice throws; the card placement is deterministic for a seed; both cards are chosen about equally often across 200 seeds.
- Opening hand cheap-card guarantee for hands of 3 and 4; redraw keeps the Coin and works for the second player; saved battle without `firstSide` hydrates to `"player"`.
- Re-capture golden hashes (note it).

## Acceptance Criteria
- [ ] The turn-order flow works for both sides as specified; saved in-progress battles keep playing as player-first.
- [ ] `npm run build`, `npm test`, `npm run lint` pass; the web build still compiles (the web calls `createRun`/`startBattle` and will be adapted in P02-T03: until then the web tests that start a battle go through a helper that picks "first").

## Validation
- `npm run build`
- `npm test -- packages/game-core/src/engine.test.ts apps/api/src/routes/runRoutes.test.ts`
- `npm test`, `npm run lint`

## Commit Message
```text
feat(core): choose the turn order each battle and give the second side the Coin

Plan: 2026-11-24-hearthstone-rules-and-taunt
Phase: P01-engine-rules
Task: T03-turn-order-and-coin
```

## Progress
- [x] done. Implemented with an option instead of a test-helper wrapper: `createRun/startBattle/advanceRun(..., { pickTurnOrder })`; default = player first (hands dealt, turn started), `pickTurnOrder: true` = pending battle (`firstSide: null`, empty hands) until `chooseTurnOrder`. New: `COIN_CARD_ID` token spell (gainMana 1, artKey mana-spring, leaves the game after use), `TurnOrderRole`, `TURN_ORDER_PENDING`, `dealTurnOrder`, opening hand of 3/4 with the cheap-card guarantee, redraw keeps the Coin, round-number rule (`startPlayerTurn(run, advanceRound)`, increment in `endPlayerTurnWithPlayback` when the enemy is first), hydrate default `firstSide = player`, API schema fields. Web: coin reuses the Mana Spring visual and is excluded from the required spell-visual list; `ruleMessage` knows the new code. Tests: new describe 'turn order pick and the Coin', old expectations (4 cards, enemy 5 cards, catalog 90) updated, 11 golden hashes re-captured. 1245 tests (101 files), lint and build pass.
- commit: see Git history
