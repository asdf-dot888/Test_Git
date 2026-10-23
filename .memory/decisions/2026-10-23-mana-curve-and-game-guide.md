# Decisions: Player Mana Curve and Main Menu Game Guide

- Date: 2026-10-23
- Status: Confirmed

## D01. Player mana recovery curve
- **Chosen**: Keep the mana maximum at 10 and add recovery to the player's unspent mana, capped at 10. The first player turn starts at 5/10. At the start of player turns 2–3, recover 1; turns 4–6, recover 2; turn 7 onward, recover 3. Enemy mana recovery remains unchanged.
- **Rationale**: The player gets a gradually stronger mana economy while retaining the existing carry-over rule for unused mana. The tier is determined by the incoming player turn, matching the current engine's turn-start recovery point.

## D02. Zero-cost mana spell
- **Chosen**: Add a player-only, normal-tier spell that costs 0 and grants 1 available mana, capped by the player's 10-mana maximum. Replace one of the two starter copies of `치유 안개` with this card, keeping the starter deck at 30 cards. The spell remains eligible for player rewards but is excluded from generated enemy decks.
- **Rationale**: `치유 안개` only heals the hero and is conditional on missing health, making one copy the least generally useful starter spell. The mana spell supports the stronger late-turn curve while preserving deck size. The enemy uses a separate fixed mana progression and should not receive the player-only card.

## D03. Main menu game guide entry
- **Chosen**: Add a `게임 방법` button directly below `새 원정 시작`. Clicking it opens a modal over the main menu; closing the modal returns to the menu.
- **Rationale**: The guide is accessible before starting a run and does not replace or hide the existing menu flow permanently.

## D04. Guide content scope
- **Chosen**: Keep the guide to core rules: the battle/phase structure, mana and playing cards, minion combat, and victory rewards.
- **Rationale**: The user asked for a rough overview, so the first version should explain the decisions needed to play without listing every edge case.

## Existing implementation notes

- Player and enemy mana already have separate turn-start recovery code. The player currently gains 1 mana each player turn, while the enemy has its own +1 recovery path.
- The player starts a battle at 5/10 mana. Existing mana recovery adds to the unused current mana and caps at 10.
- The card catalog is shared by player rewards and generated enemy decks. The new spell therefore needs an explicit player-only filter for enemy deck generation.
- The starter deck currently has 30 cards and includes two copies of `치유 안개`; replacing one copy keeps it at 30.
- The player spell effect model has no mana-gain effect yet. Implementing this card requires extending the effect type and handling it in the engine, card description, tests, and enemy card filters.
- Current draw rules are 3 cards at battle start, one card per player turn, and a 10-card hand limit. They are outside this request and are not part of the guide's first-version detail.
