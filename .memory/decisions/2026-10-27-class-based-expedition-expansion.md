# Decisions: Class-Based Expedition Expansion

- Date: 2026-10-27
- Status: Confirmed
- Scope: Incorporate the gameplay and presentation feedback covering combat effects, viewport layout, cards and combos, hero powers, enemy intent, phase themes, and class-based decks.

## D01. Starting classes and deck composition
- **Chosen**: Start a new expedition by choosing one of three extensible classes: Warrior, Assassin, or Demonist. Each class starts with a 30-card deck containing 10 class-specific cards and 20 shared neutral cards.
- **Rationale**: The classes provide distinct strategies while retaining a shared pool and room to add classes later.
- **Class identities**:
  - Warrior: durable cards with high health.
  - Assassin: lower-health cards with high attack or special abilities.
  - Demonist: summoning and demon-focused abilities, including possible bonuses against demon enemies.
- **Rewards**: Offer cards from the chosen class and the shared neutral pool.

## D02. Deck size and reward flow
- **Chosen**: The initial deck has 30 cards and the deck limit is 35. When the deck already has 35 cards, show a warning before reward selection. After confirmation, the player chooses a reward card, then chooses one existing card to discard, returning the deck to 35.
- **Chosen**: Add close/X controls throughout the warning, reward, and discard steps. Closing at any point cancels the reward flow, returns to the roadmap, grants no reward, and restores the deck to its pre-reward state.
- **Rationale**: The player can grow and curate the deck without exceeding the agreed limit, and can leave the reward flow without a partial deck change.

## D03. Class hero powers
- **Chosen**: Every class power is activated manually, costs 2 mana, and can be used once per turn.
- **Warrior**: Gain 2 armor. Incoming damage removes armor before health; remaining armor disappears when the battle ends.
- **Assassin**: Deal 2 damage to a selected enemy minion or enemy hero. The hero remains a valid target while enemy minions are present.
- **Demonist**: When an enemy minion dies, gain a soul shard. At 3 shards, activate the power to spend 2 mana and summon one random demon from three custom demon choices. Shards reset at battle end. The shard capacity is 6; additional shards beyond capacity are lost.
- **Rationale**: The powers reinforce each class's core play style while sharing a consistent cost and once-per-turn limit.

## D04. Card effects and combat targeting
- **Chosen**: Add a common spell that deals a random 0 to 5 damage to a selected enemy minion or hero, even when enemy minions are present. A zero-damage result still consumes the spell and its mana.
- **Chosen**: Add designated cleave effects. They can target enemy minions only; the selected minion and its adjacent enemy minions are hit. Adjacent minions take half the primary damage, rounded down, with a minimum of 1.
- **Chosen**: Add a common spell that takes one random card from the enemy deck, removes it from that deck, and adds it to the player's hand. If the player's hand is full, the spell is disabled and cannot be used, so it consumes neither the spell nor mana.
- **Rationale**: These effects add controlled randomness, positional tactics, and deck interaction without changing the targeting rules for every card.

## D05. Playing cards and attacking
- **Chosen**: Preserve click interactions and also support drag-and-drop for playing cards, choosing a field slot for minions, and attacking enemy minions or the enemy hero with friendly minions.
- **Chosen**: Add an All Attack control. It is disabled when the enemy has any minions or the player has no attack-ready minions. When enabled, it sends all attack-ready friendly minions to attack the enemy hero one by one, using the normal combat rules and effects for each attack.
- **Rationale**: Players can use either interaction style and resolve an open enemy board with one action.

## D06. Minion fusion
- **Chosen**: Add 9 designated fusion pairs at launch, with 3 pairs associated with each class. Dragging one compatible friendly field minion onto the other consumes both and replaces them with a predefined upgraded minion. Fusion costs 1 mana.
- **Design constraint**: Fusion results should follow their class identity and have their own stats, effect, and illustration. Define the exact pairs and card values during implementation planning.
- **Rationale**: A small, explicit set of combinations makes positioning matter and keeps the first version bounded.

## D07. Enemy action pacing and intent preview
- **Chosen**: Before each enemy action, show the card illustration, name, and effect, and highlight its target. Hold the preview for 1 second, then execute the action.
- **Chosen**: At the start of a boss battle, show the boss's full area-attack pattern. Boss card actions happen before its area attack, and the area attack uses dangerous-feeling screen/board effects when it executes.
- **Rationale**: Players can understand what caused damage and react to the boss pattern while enemy turns retain the previously chosen deliberate pacing.
- **Related decision**: Enemy deck composition, opening hand, and mana progression are recorded in [2026-10-26-enemy-opening-stability.md](./2026-10-26-enemy-opening-stability.md).

## D08. Minion ability tooltip
- **Chosen**: Hovering a minion on the field shows a small tooltip containing its ability description only.
- **Rationale**: Players can inspect abilities without covering the board with a full card popup.

## D09. Visual effects and board size
- **Chosen**: Expand the game board to use nearly the full viewport width.
- **Chosen**: Give every card a distinct attack, spell, buff, or hit effect using its existing illustration with card-specific color, motion, and particles.
- **Chosen**: On minion death, use a dark-fantasy cracking/tearing effect with visible blood-stain emphasis.
- **Rationale**: The board gains space and visual feedback becomes easier to distinguish without requiring a separate animation illustration for every card.

## D10. Phase themes and character art
- **Chosen**: Use a distinct theme for each phase:
  1. Corrupted elves and a cursed forest.
  2. Demons.
  3. Ancient dragons and a fire legion.
- **Chosen**: Theme all three normal encounters and the boss in each phase, including their illustrations and boss art.
- **Chosen**: Character illustrations should depict adults in an alluring, provocative dark-fantasy style, including archetypes such as assassins, elves, and succubi.
- **Rationale**: The expedition should have a coherent visual identity that changes as the player advances.

## Codebase facts observed during the interview
- The board currently has a desktop maximum width of 1160px in `apps/web/src/styles/board.css`.
- `MinionCard.tsx` currently displays stats but has no ability tooltip.
- Combat already emits enemy action details such as card ID, spell effect, target, and boss-area action, which can support the preview.
- The current game model has no race/tribe tag and no class selection or class-specific starting deck system.
- Existing card effects include damage, healing, summoning, buffs, drawing, and mana gain. Fusion is not currently modeled.
- The enemy opening-hand and mana adjustment is tracked separately in the related decision listed under D07.

## Explicitly left for implementation planning
- Exact identities, stats, text, and illustrations for the class card pools, fusion recipes, and Demonist's three summon candidates.
- The specific card-by-card visual-effect palette and timing, provided each card receives a distinct effect and combat readability is preserved.
- Art production details for each phase's normal enemies and boss, within the confirmed adult dark-fantasy direction.

## Out of scope
- No implementation, deployment, or Azure configuration is included in this decision record.
