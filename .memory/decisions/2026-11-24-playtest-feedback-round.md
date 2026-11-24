# Decisions: Playtest Feedback Round (UI, sound, mana, difficulty)

- Date: 2026-11-24
- Status: Confirmed (10 feedback items interviewed one by one; items 8 and 9 were checked in code)
- Source: the user's pasted playtest feedback list (PC and mobile).

## D01. All-attack button position (PC) and mobile button swap
- **PC chosen**: The all-attack button moves from the top-right corner of the board (`field-action-bar`) to the player toolbar, directly to the left of the end-turn button.
- **Mobile chosen** (viewport width <= 760px only): The end-turn button moves to the top of the player hero panel, above the portrait. It keeps the current gold style but is smaller and as wide as the panel. The all-attack button takes the old end-turn slot in the bottom toolbar.
- **Rationale**: All-attack is used right before ending the turn and already auto-ends the turn after attacking, so the two buttons belong together and close to the hand. On mobile the manual end-turn is the secondary action.

## D02. Whose turn it is
- **Chosen**: Three layers.
  1. A badge in the top bar that always shows `내 턴` (gold) or `상대 턴` (red), on PC and mobile.
  2. The battle board border changes colour with the turn (gold for the player, red for the enemy).
  3. A centre banner ("내 턴" / "상대 턴") for about 1 second at every turn change.
- **Defaults (not asked)**: The banner never blocks input (`pointer-events: none`). With `prefers-reduced-motion` the banner shows briefly without animation. The banner also shows on the first turn of a battle.

## D03. Damage and heal numbers
- **Chosen**: Floating numbers on **every** source: minion and hero attacks, retaliation, spells, hero powers, burn, boss area damage. Damage is a red `-N`; heal is a green `+N`. Boss area damage shows one number per affected target. Damage absorbed by hero armor shows the number with a shield mark.
- **Note**: Hit effects (impact, shake, blood splatter, three weight tiers) already exist in `CombatEffectLayer.tsx`; only the numbers are new. If the user later reports an attack that has no hit effect, check that case separately.
- **Not chosen**: A separate marker on the attacker for damage dealt.

## D04. Hover sound
- **Chosen**: Replace the current hover cue (two high triangle-wave notes at 1046.5 Hz and 1568 Hz in `playHoverCue`, `game/audio.ts`) with a soft card rustle ("사락"): a very short (about 0.1 s) band-filtered noise burst, quieter than now. The timer warning (`timer-warning.ogg`) stays unchanged.
- **Also**: Add a hover-sound preview button to `/?effects-preview` so the user can listen and tune it. Claude cannot hear it; the user makes the final call.

## D05. Turn time
- **Chosen**: 30 seconds per turn (was 20; `TURN_DURATION_MS` in `game/useTurnTimer.ts`), the same on both difficulties. Pausing during animations and the 5-second warning stay as they are.

## D06. Mana recovery and Mana Spring
- **Recovery chosen** (player, per turn, in `startPlayerTurn` in `packages/game-core/src/engine.ts`): turns 2-3 `+2`, turns 4-6 `+3`, turn 7 onward `+4` (was `+1`, `+2`, `+3`). Starting mana 5, cap 10, and carrying over unspent mana do not change.
- **Mana Spring chosen**: The starter deck gets 2 copies of `mana-spring` (was 1; `catalog.ts`), keeping the deck at 30 cards by removing one duplicate of a weak card. Which card to remove is decided with the balance simulation and reported to the user.
- **Rationale**: High-cost cards were hard to cast. Faster recovery makes the game easier, so the difficulty is retuned in D09.

## D07. Why the enemy sometimes plays no card (finding, no separate change)
- **Finding**: The enemy starts with 5 mana and recovers only `+1` per turn after the first turn (`resolveEnemyTurnWithPlayback`). After it spends its opening mana it has about 1 mana a turn, so a hand of expensive cards stays unplayed for several turns. This was confirmed by reading the code, not by reproducing it.
- **Resolution**: Solved by the enemy mana bonus in D09. No extra UI for it.

## D08. Boss area attack (finding and one fix)
- **Finding**: After the boss plays cards and its minions attack, `resolveBossAreaAttack` deals 1 damage to every player minion and to the player hero. It triggers on normal every 3rd turn (3, 6, 9...) and on hard every 2nd turn (2, 4, 6...). Damage stays 1.
- **Fix chosen**: The boss pattern panel (`boss-pattern-panel` in `GameBoard.tsx`) always says "3·6·9번째 턴", which is wrong on hard. Make the text depend on the difficulty.

## D09. Difficulty: remove the minion health bonus, raise enemy mana, smarter AI, tune with simulation
- **Chosen**: Option A of the interview, all four parts:
  1. **Enemy minion health bonus becomes 0** in every phase on both difficulties (it was +1 on normal, +2/+1/+2 on hard in `ENEMY_PHASE_BONUS`). The same card must have the same health for both sides.
  2. **Keep** the minion attack bonus and the enemy hero health bonus as starting values; they are tuning knobs.
  3. **Enemy mana recovery becomes `+2` per turn** after the first turn (was `+1`), on both difficulties.
  4. **Smarter enemy attacks**, on both difficulties: (a) evaluate trades before attacking (do not lose an expensive minion for a cheap one, take good trades); (b) ~~attack the hero when it is lethal or the player has no real threat on the board~~ — **corrected on 2026-11-24 while planning**: a side can only hit the hero while the opposing board is empty, and the enemy already does, so (b) becomes choosing the attacker order and holding bad attacks back so blockers get cleared (see the plan); (c) prefer card sequences that spend more mana when plan scores tie. Normal difficulty must not read the player's hand or draw pile (as today); hard keeps using hidden information as today.
- **Tuning rule (the user's instruction)**: Run `npm run balance:sim` (500+ runs per class and difficulty) and adjust until the average completion rate is inside the README targets: **normal 55-65%, hard 6-10%, class gap within 5 percentage points**. Allowed knobs: enemy minion attack bonus, enemy hero health bonus, AI strength (beam width and evaluation weights), enemy mana bonus. The result and the numbers go to `docs/balance/`.
- **Rationale**: The same card with higher enemy health felt unfair (the user accepted higher attack, not higher health). Difficulty now comes from mana and decision quality instead of raw stats.

## Codebase Findings
- All-attack button: `GameBoard.tsx` (`field-action-bar`), CSS `board.css`; `all-attack` always sets `autoEndTurnAfterAllAttack`, so the turn ends automatically after it on every platform.
- Turn status text lives in `TurnControls.tsx` (`내 턴` etc., hidden on mobile); the turn timer is in the top bar.
- Combat effects: `game/combatEffects.ts`, `components/CombatEffectLayer.tsx`; damage info already carries `amount` and outcome (`hit`, `miss`, `armor-block`).
- Mana: `INITIAL_MANA = 5`, `MAX_MANA = 10`, `gainRegularMana`, `startPlayerTurn`, `resolveEnemyTurnWithPlayback` in `engine.ts`; `mana-spring` in `catalog.ts`.
- Enemy AI: `scoreEnemyCard`, `selectEnemyCard`, `planEnemyTurn` (beam search from the second battle), `resolveEnemyMinionAttacks` (greedy target choice) in `engine.ts`.
- The balance bot uses only public engine functions, so engine and AI changes are measured automatically by `balance:sim`.
