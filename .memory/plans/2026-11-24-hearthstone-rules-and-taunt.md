# Plan: Hearthstone Rules, Taunt, Turn-Order Pick

- Date: 2026-11-24
- Decisions: [2026-11-24-hearthstone-rules-and-taunt](../decisions/2026-11-24-hearthstone-rules-and-taunt.md) (D01-D09)
- Status: `todo` (nothing implemented yet)
- Replaces: the unfinished T03 of [2026-11-24-full-mana-and-triple-draw](./2026-11-24-full-mana-and-triple-draw.md) (balance retune), which is done here in P03-T01 under the new rules.
- Shell setup: `export PATH="$HOME/.local/node-v24.22.3-darwin-arm64/bin:$PATH"`, repository root `/Users/gimjinhyeon/Downloads/Mango_Stone`. `npm test` runs `src` and `dist` copies: run `npm run build` before testing.

## Goal
Make the game follow Hearthstone's rules: 1 draw per turn, fatigue instead of reshuffling, taunt instead of "any minion blocks the hero", a turn-order pick (two face-down cards) at the start of every battle with the Coin for the second player; remove the player's all-attack button; add taunt to 10 cards; then retune difficulty with the simulation (normal 55-65 %, hard 6-10 %).

## Architecture notes (read before starting)
- `BattleState.turnNumber` is the **round** number shared by both sides; each side's n-th turn has `min(10, n)` mana. The round number increases right after the **second** side of the round finishes its turn (today: in `startPlayerTurn`, because the player is always first). With the enemy first it increases in `endPlayerTurnWithPlayback` before the enemy turn. `minion.summonedTurn < turnNumber` therefore stays correct for both orders.
- New battle fields (all optional in saved data, filled by `hydrateRunForCurrentBattle`): `playerFatigue`, `enemyFatigue` (default 0), `firstSide` (`"player" | "enemy" | null`; `null` = turn order not chosen yet; saved in-progress battles default to `"player"`), `turnOrderCards` (what is behind the two face-down cards).
- The API (`apps/api/src/routes/runRoutes.ts`) parses runs with a zod `battleSchema` that **strips unknown keys**: every new battle field must be added there or a saved run silently loses it.
- The Coin is `gainMana` 1 (the existing Mana Spring effect: +1 mana for this turn, capped at 10), cost 0, `tokenOnly`, removed from the game after use.
- Turn-order API (decided while implementing P01-T03): `createRun`, `startBattle` and `advanceRun` take `{ pickTurnOrder?: boolean }`. Without it the battle starts with the player first (hands dealt, turn started), so tests and the tutorial keep working; with `pickTurnOrder: true` the battle is pending (`firstSide === null`) until `chooseTurnOrder(run, cardIndex)`. The web and the API switch to `pickTurnOrder: true` in P02-T03.
- `attackAllReadyMinions` stays in the engine (rewritten to hit the hero only when no taunt) until P02-T01 removes it together with the web button, so the web build stays green between tasks.

## Phases
| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `todo` | Engine: fatigue and 1 draw, taunt and attack rules, turn order and the Coin, enemy AI and bot | [P01](../phases/2026-11-24-hearthstone-rules-and-taunt/P01-engine-rules/phase.md) |
| P02 | `todo` | Web: attack targets, taunt visuals and sound, turn-order pick screen, texts and docs | [P02](../phases/2026-11-24-hearthstone-rules-and-taunt/P02-web-ui/phase.md) |
| P03 | `todo` | Balance retune with the simulation, audit and close-out | [P03](../phases/2026-11-24-hearthstone-rules-and-taunt/P03-balance-and-close-out/phase.md) |

## Rules for every task
- One task = one commit with the message in the task file plus the attribution trailer; stage by explicit path only (the repository has unrelated untracked files that must stay untouched).
- Characterization hashes in `engine.test.ts` (the 11 golden hashes) are re-captured in the task that changes them; say so in the task's Progress.
- Never release or deploy unless the user asks.
