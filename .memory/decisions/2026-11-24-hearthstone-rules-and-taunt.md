# Decisions: Hearthstone Rules, Taunt, Turn-Order Pick

- Date: 2026-11-24
- Status: Confirmed in a /grill-me interview ("하스스톤하고 규칙 똑같이 가고 하수인중에 밸런스 안맞는 카드에 도발 효과 추가해줘").
- Why: the 0 % completion simulation (`docs/balance/2026-11-24-hs-mana-baseline.md`, commit c4b9e7a) showed board stalemates: a hero can only be hit while the opposing board is empty, and 5 draws per turn refill boards every turn. Taunt replaces "any minion blocks the hero".
- Related: [2026-11-24-full-mana-and-triple-draw](./2026-11-24-full-mana-and-triple-draw.md). **Replaced here:** D02 (5 draws per turn) and the hero-attack rule "hero only attackable with an empty board"; D01 (Hearthstone mana) stays; D05 (enemy never holds back) stays, with taunt applied to its target choice.

## D01. Draw: 1 card per turn (replaces 5)
- **Chosen**: each side draws 1 card at the start of its own turn, including turn 1 for the first player. Mana stays the Hearthstone curve (1 on the first own turn, +1 per own turn up to 10, full refill, no carry-over). Hand limit 10 (the extra drawn card goes to the discard pile as today). Board limit stays **6**.

## D02. Fatigue instead of reshuffling
- **Chosen**: no reshuffle of the discard pile into the draw pile. Drawing from an empty deck deals fatigue damage to the drawer's hero: 1, 2, 3, ... (the counter grows by one per empty draw, per side, per battle). Both sides, same rule. Armor absorbs it like other hero damage. Spell/effect draws that hit an empty deck also cause fatigue.
- Saved runs: a battle without a fatigue counter starts at 0.

## D03. Taunt (new minion keyword), Hearthstone semantics
- While the opposing board holds at least one taunt minion, an attacker (minion) can only attack taunt minions. Without a taunt minion it may attack the hero or any minion. **The old "hero is only attackable when the board is empty" rule is removed.**
- Applies to the enemy as well (its attack planner chooses targets among legal ones only; it still never holds an attack back, D05).
- Spells, hero powers and battlecries ignore taunt (target any minion/hero as today).
- Data: `MinionState`/`CardDefinition.minion` gets a `taunt?: boolean` (keyword on the card); description shows "도발".

## D04. Which cards get taunt
- **Chosen (list A, 8 cards)**: imp-caller (3, 1/3), pit-ritualist (4, 2/3), shadow-duelist (4, 3/2), demon-houndmaster (5, 4/3), infernal-guardian (5, 3/5), summoner (6, 4/4), storm-crow (6, 6/4, boss tier), abyssal-matriarch (7, 5/5). Not included: executioner and shade-stalker (attack-heavy identity).
- **Warrior (user chose B)**: warrior-vanguard (1, 1/4) and warrior-stonewall (3, 2/6) also get taunt now. The balance task may adjust their cost or stats if warrior becomes too strong; other cards may get or lose taunt in tuning, but the list is recorded in the plan.
- Enemy decks use the same card definitions, so enemies get taunt too.

## D05. All-attack button
- **Chosen (A)**: remove the player's all-attack button, `attackAllReadyMinions` and its API/action wiring, tests and texts. The player attacks one minion at a time. The enemy all-attack playback record (`EnemyCombatRecord` `all-attack`) and its intent text stay as they are, but only when the enemy actually hits the hero with several minions.

## D06. Turn order pick and the Coin
- **Chosen**: at the start of **every battle** the player sees two face-down cards ("선공" and "후공", randomly placed) and picks one. The enemy gets the other role.
- First player: opening hand 3, draws 1 on turn 1 (4 cards). Second player: opening hand 4 and receives **the Coin** (a 0-cost spell, +1 temporary mana for this turn, then it leaves the game; it is not put in the discard pile or the deck and counts toward the hand limit while held). The existing "opening hand always holds a card of cost ≤ 1" and the one opening-hand redraw stay (redraw is the player's; the enemy never redraws).
- If the enemy is first, its turn runs first (`activeSide` starts as `enemy`); turn numbers/mana caps are per side (each side's n-th turn has `min(10, n)` mana). The boss area attack cadence counts the enemy's own turns. The simulation bot picks first or second at random.
- The pick UI is a new screen/overlay before the battle; the first-run tutorial text is updated for it; saved runs mid-battle keep working (no pick is asked).

## D07. Taunt presentation (user chose C)
- A taunt minion on the board has a shield-shaped border; the card description shows "도발". When a minion is selected to attack, targets that are not allowed (blocked by taunt) are dimmed and the allowed ones highlighted.
- A short synthesized sound cue (Web Audio, no new audio files; same approach as the hover cue in `game/audio.ts`) plays when a taunt minion is played and when an attack is blocked by taunt.

## D08. Difficulty and balance (not asked, default)
- Targets stay: normal 55-65 % average completion, hard 6-10 %, class gap <= 5 points reported. Retune with the simulation after the rule change; if the gap or the targets cannot be met with the existing knobs, stop and report to the user. The starter deck curve (D04 of the previous plan) is reviewed again because only 1 card is drawn per turn.
- Enemy deck cost weighting and enemy mana stay (enemy follows the same mana curve).

## D09. Texts and docs
- Update the game guide, tutorial, README, architecture pages and the card texts for: 1 draw, fatigue, taunt, no all-attack button, turn-order pick, the Coin. No release or version bump unless the user asks.

## Addendum (2026-11-24, P03-T01 balance retune): final numbers
These values were chosen with the simulation so that normal lands at 55-65 % and hard at 6-10 % average completion with a class gap of about 5 points (report `docs/balance/2026-11-24-hs-rules-final.md`, summary `docs/balance/2026-11-24-hs-rules-summary.md`). They go beyond what the interview fixed, because the new rules made the old numbers unwinnable (0 % completion):
- **Starter deck** (shared 20 cards): ash-wolf x2, cinder-imp x2, shadow-bolt x2, crypt-guard x2, ember-priest x2, dusk-raven, soul-lance, grave-knight x2, iron-hound x2, rune-smith, mire-witch, plague-bearer, thorn-brute (eleven 1-2 cost cards, one 5-cost card). Moon Stag, Shade Stalker and the second Thorn Brute, Mana Spring and Healing Mist left the starter deck (still reward cards).
- **Enemy health** (catalog): normal enemies 15/17/18, 16/18/21, 19/21/23; bosses 18/22/26 (were 19-27 and 34/40/48). Hard adds +2 (normal enemies) and +3 (bosses) on top.
- **Enemy bonuses**: normal none; hard minion attack +1 from the second battle on, no hero health bonus table (0/0/0).
- **Boss area attack**: every 4th turn on normal, every 3rd on hard (was 3 and 2).
- **Demonist**: the hero power needs 2 soul shards (was 3); costs lowered by 1: Demon Houndmaster 4, Infernal Guardian 4, Summoner 5, Abyssal Matriarch 6, Pit Ritualist 3.
- The taunt card list is unchanged (10 cards).
