# Task: T02 Soul Bargain Pools and Enemy AI

## Status: done

## Goal

Make Soul Bargain available as a normal card reward to all three player classes and as a possible card in each enemy's generated 30-card deck. Have enemy AI use it only when its hand can still support a follow-up card and the temporary mana helps make that action possible.

## Decision Summary

- Source: `.memory/decisions/2026-10-28-soul-bargain-card.md`.
- The card is neutral (`classId` absent), `normal` reward tier, not `playerOnly`, and not a starter-deck addition.
- Enemy AI must not spend the card and discard randomly when the gained mana cannot help a later action that turn.

## Implementation

### I01. Wire the card into the card pools and AI scoring

- Related Files:
  - `packages/game-core/src/catalog.ts` :: `BASE_CARD_CATALOG`, `SHARED_STARTER_CARD_IDS`, `STARTER_DECK_CARD_IDS` — keep it reward/enemy-pool eligible and out of all starting lists; read-only except catalog correction if needed.
  - `packages/game-core/src/engine.ts` :: `createEnemyDeck`, `rewardChoices`, `isEnemyCardPlayable`, `scoreEnemyCard`, `selectEnemyCard`, `playEnemyCard`, `resolveEnemyTurnWithPlayback` — incorporate the card and follow-up heuristic; modify.
  - `packages/game-core/src/engine.test.ts` :: reward, enemy deck, AI decision and playback tests — add.

#### Details

- **Pool rules**:
  - Confirm neutral reward eligibility through `rewardChoices`: each player class may receive Soul Bargain in a normal reward when duplicate limits permit.
  - Confirm enemy deck generation may choose Soul Bargain through the existing `!playerOnly && !classId && !tokenOnly` filter.
  - Keep Soul Bargain absent from the 30-card initial player deck lists.
- **AI behavior**:
  - Mark the spell as playable for the enemy only when its 1-mana cost is affordable and the hand contains at least one other card that could benefit from the temporary mana after the discard.
  - Use the enemy's current regular-plus-temporary mana and candidate card costs. The heuristic must identify a plausible follow-up whose cost is above current usable mana and no greater than current usable mana plus 3.
  - Require that at least one other hand card remains after considering the random discard; when the spell is cast, let the existing enemy-turn loop resolve the discard and reevaluate the actual remaining hand before selecting the next action.
  - Give the spell a situational score based on the follow-up opportunity; avoid selecting it when it only creates unused temporary mana.
  - The enemy's own hand is the discard source; apply the common spell implementation from T01 and retain playback event ordering.
- **Test cases**:
  - Reward candidate is eligible for warrior, assassin, and demonist.
  - Enemy generated deck can contain the card under seeded generation; starting player decks do not.
  - AI does not cast it when no follow-up card can use the temporary mana; it casts when a follow-up card becomes affordable and a hand card remains after the discard.
  - After casting it, the AI spends the available mana on a follow-up action when still present and records each card action in playback order.

### I02. Validate enemy-turn behavior

- Related Files:
  - `packages/game-core/src/engine.test.ts` :: enemy turn resolution block — extend deterministic seeded scenarios; modify.

#### Details

- Assert the discard uses the enemy hand and enemy discard pile, the player's piles are unchanged, temporary mana is spent before enemy regular mana, and remaining temporary mana expires before the next player turn.
- Keep existing enemy action pacing and boss-area sequence unchanged outside the new card use.

## Acceptance Criteria

- [ ] Soul Bargain can appear as a reward for each player class and in enemy 30-card decks, but not in starter decks.
- [ ] AI saves it when no useful follow-up is possible and uses it when it enables a subsequent card action.
- [ ] Enemy discard and temporary mana follow the same rules as the player's, with deterministic playback.

## Validation

- `npm test -- packages/game-core/src/engine.test.ts` — all deck generation, reward, and AI tests pass.
- `npm run build --workspace @board-game/game-core` — TypeScript build succeeds.

## Commit Message

```text
feat(game-core): add Soul Bargain to rewards and enemy tactics

Plan: 2026-10-28-mangostone-game-polish
Phase: P01-core-mechanics
Task: T02-soul-bargain-ai

- Include the neutral spell in player rewards and enemy decks
- Use temporary mana only when enemy follow-up plays benefit
```

## Progress

- [x] Implementation complete
- [x] Validation passed
- commit: pending

