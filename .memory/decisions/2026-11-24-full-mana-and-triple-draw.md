# Decisions: Full Mana Every Turn and Three Cards Per Turn

- Date: 2026-11-24
- Status: Confirmed (user request "매 턴마다 마나 풀로 차고 턴마다 카드 3장씩 뽑는걸로 바꿔야될듯"; the mana meaning was chosen in an interview question)
- Related: [2026-11-24-playtest-feedback-round](./2026-11-24-playtest-feedback-round.md) D06 (mana recovery 2/3/4) is **replaced** by D01 here.

## D01. Mana: the Hearthstone rule (final; replaces "10 every turn")
- **Chosen** (user, after first answering "10 mana every turn from turn 1" and then sending the Hearthstone rules): turn 1 starts with 1 mana; the maximum grows by 1 every turn up to 10; at the start of each turn the side's mana is refilled completely; unspent mana does not carry over. Applies to **both** sides; the enemy's first turn is turn 1 as well, so its mana on turn n is `min(10, n)` like the player's.
- **Defaults not asked**: Mana Spring (cost 0, +1 mana) acts like the Hearthstone Coin: +1 mana for this turn, up to 10 (it may go above the turn's maximum). Temporary mana (Soul Bargain) still lasts only for the turn.
- Replaces the old recovery tiers (+2/+3/+4), the enemy `+2` and the "10 flat" step.

## D02. Draw: 5 cards at the start of every turn after the first (user said 3, then changed it to 5)
- **Chosen**: the player draws 5 cards at the start of every turn from turn 2 (as before it does not draw on turn 1); the enemy draws 5 on each of its turns, its first included, because it acts second. The opening hand stays 3 cards (with the one redraw).
- Hand limit stays 10. Cards that would exceed it go to the discard pile (as spell draws already do). The "choose a card to discard before drawing" picker no longer appears at turn start (saved runs that still have it pending keep working).
- Applies to both sides for fairness (the user complained before about the enemy having advantages). The enemy discards its lowest-scoring card only when its own hand is full before the draw, as today.

## D03. Consequences handled in the plan
- Mana Spring (cost 0, +1 mana) is nearly useless at a fixed 10 mana; it stays in the deck for now (a later decision may replace it).
- Texts that state the old numbers (guide, architecture page, README, tutorial wording if any) are updated; difficulty is retuned with the balance simulation (the game gets easier for the player and stronger for the enemy at the same time).

## D04. Starting deck: raise its cost curve (answer to the deck-ratio question)
- **Chosen** ("내 시작 덱을 올리고"): the player's starter deck gets a higher curve instead of lowering the enemy decks. Currently average cost 2.2 with 0-2 cards of cost 6+; enemy decks average 3.5-5.2 with 4-13 cards of cost 6+. Target: player average about 3 with about 5-6 cards of cost 5+, enemy decks unchanged.
- Implementation default: in the shared starter cards, swap cheap duplicates for existing mid/high-cost neutral minions (Moon Stag 5, Thorn Brute 5, Blood Oracle 6, Storm Crow 6, Hollow Giant 7) and drop the second Mana Spring added earlier.

## D05. Enemy all-attack (user chose options B and C)
- **B**: when the enemy attacks the hero (the player board is empty), all its ready minions attack together and are shown as one all-attack playback action (done: `EnemyCombatRecord` type `all-attack`).
- **C**: the enemy never holds an attack back; every ready minion attacks (the attack planner chooses order and targets but must use every ready attacker) (done).
