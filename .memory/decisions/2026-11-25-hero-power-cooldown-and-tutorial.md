# Decisions: Hero Power Cooldown, Turn-Order Pick in the Tutorial, Spotlight Tutorial

- Date: 2026-11-25
- Status: Confirmed

## Context (checked in code, not asked)
- The turn-order picker exists and runs every battle (`TurnOrderPicker`, `pickTurnOrder: true` in `gameActions.ts`). The only exception: while the first-run tutorial is not marked completed for the account, the first battle auto-picks "first" without showing the picker (`App.tsx` ~346-348). Completion lives in the browser's localStorage per account, so a new browser or device shows the tutorial again and hides the picker in that first battle.
- The draw rule already matches Hearthstone: first side 3 cards, second side 4 cards plus the Coin, 1 draw at the start of every turn, hand limit 10, fatigue when the deck is empty. No change.
- The hero power is currently once per turn for 2 mana (`useHeroPower` in `packages/game-core/src/engine.ts`, `battle.heroPowerUsed` reset every turn); Demonist additionally pays 2 soul shards.

## D01. Hero power limit
- **Chosen**: Cooldown. After using the hero power, it is unavailable for the player's next 2 turns and ready again on the turn after (used on turn 3, locked on turns 4 and 5, ready on turn 6). Counted in the player's own turns. Mana cost stays 2; Demonist still also pays 2 soul shards. Same rule for all three classes.
- **Rationale**: The user found a hero power every turn too strong. A cooldown is the simplest rule to read and keeps the three classes on one rule for balancing.
- **UI**: The hero power button shows the remaining cooldown turns while locked.

## D02. Hero power at battle start
- **Chosen**: Ready from the first turn (no cooldown at battle start). In practice it is first usable on turn 2, because turn 1 has only 1 mana.
- **Rationale**: The user pointed out that turn 1 cannot afford it anyway, so a starting cooldown adds nothing.

## D03. Turn-order pick during the first-run tutorial
- **Chosen**: Show the two face-down cards in the tutorial battle too, but whichever card is picked, the player goes first. The tutorial text adds that the order is decided by these cards every battle and that the second side gets one more card and the Coin.
- **Rationale**: The player sees the real mechanic from the first battle while the tutorial's step order (written for going first) stays intact.

## D04. Tutorial format
- **Chosen**: Spotlight tutorial. The screen dims except the element being explained; an arrow and a short text point at it; the step advances when the player does the action.
- **Rationale**: The user found the current text-only box at the top unfriendly; it never shows where to look and skips most rules.

## D05. Tutorial steps
- **Chosen**:
  - First player turn: 1) turn-order cards (always first in the tutorial; mention the second side's extra card and the Coin), 2) mana display (grows by 1 per turn up to 10), 3) hand and card cost (the number at the card's top left; 1 draw per turn), 4) play a minion (highlight playable cards), 5) end turn.
  - Second player turn: 6) attack (highlight own minion and targets; a minion cannot attack on the turn it is played), 7) hero power (highlight the button; 2 mana, then 2 turns of rest; using it advances), 8) end turn, which ends the tutorial.
  - One-time contextual tips outside the scripted steps: taunt (the first time a taunt minion appears) and fatigue (the first time fatigue damage happens), each shown once.
- **Rationale**: Covers every rule the current tutorial leaves out. Taunt and fatigue cannot be forced in the tutorial battle because the enemy deck is random, so they are taught when they first happen.
- Touch devices keep their own wording (drag instead of click), as the current tutorial does.

## D06. Balance after the cooldown
- **Chosen**: Measure only. Update the simulation bot for the cooldown, run the usual 1000-run measurement (normal and hard, per class) and report the result. Do not change any balance numbers; Claude proposes adjustments and waits for the user's confirmation before applying them.
- **Rationale**: The user wants to approve balance changes personally.

## Out of scope (reported, not decided)
- Tutorial completion is stored only in the browser, so it repeats on every new browser or device.
- The battle-screen redesign (theme.css) is committed locally but not released. Release version and patch-note entry are decided when the user asks for a release.
