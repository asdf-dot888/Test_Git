# Plan: Player Mana Curve and Main Menu Game Guide

## Goal

Give the player a stronger mana curve as the battle progresses, add a zero-cost mana spell to the player's 30-card starter deck, and explain the core rules through a modal opened from the main menu.

## Phases

| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `done` | Update player mana recovery, add the player-only mana spell and card art, and expose a core-rules guide from the main menu. | [P01](../phases/2026-10-23-player-mana-curve-and-menu-guide/P01-player-balance-and-menu-guide/phase.md) |

## Scope Notes

- The player's maximum mana stays 10 and unused mana carries over. Battle turn 1 starts at 5/10. When a player turn begins, turns 2–3 add 1 mana, turns 4–6 add 2, and turn 7 onward adds 3, capped at 10.
- Enemy mana recovery stays at +1 per turn. The new zero-cost spell is player-only, starts as one copy in the 30-card deck, and remains eligible for player card rewards. It must not enter generated enemy decks.
- Replace one `치유 안개` starter copy with `마력의 샘` (cost 0; gain 1 available mana). Keep one `치유 안개` copy and retain a 30-card deck.
- Add `게임 방법` immediately below `새 원정 시작`. It opens a modal; its close button returns to the menu.
- The guide covers the 3-phase/12-battle structure, mana and card use, minion combat, and victory rewards. It omits hand/draw limits and timer edge cases.
- No changes to authentication, enemy mana behavior, reward selection rules, game timer, draw rules, or battle progression are included.

## Task Sequence

1. Implement and test the player's tiered mana recovery.
2. Add the player-only mana spell, starter-deck replacement, enemy deck exclusion, card illustration, and engine coverage.
3. Add the main-menu game guide modal and interaction tests.
