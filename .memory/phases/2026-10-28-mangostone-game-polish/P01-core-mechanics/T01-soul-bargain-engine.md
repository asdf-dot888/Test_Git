# Task: T01 Soul Bargain Engine and Temporary Mana

## Status: done

## Goal

Implement the rules and state needed for a 1-cost spell named “영혼의 거래”: discard one uniformly random card from the caster's remaining hand, then gain 3 temporary mana. Temporary mana may take current usable mana above the normal maximum of 10, is spent before regular mana, and expires at the end of its owner's turn. If there is no other card in hand, skip the discard and still grant the mana.

## Decision Summary

- Source: `.memory/decisions/2026-10-28-soul-bargain-card.md`.
- The spell is neutral/common, reward eligible for all player classes, and eligible for enemy decks; do not add it to the initial 30-card lists.
- The spell itself is removed from hand before effects resolve and is never a discard candidate. Discarded cards go to the caster's discard pile.
- Current mana includes temporary mana; keep the remaining temporary amount separately so unused temporary mana can expire without losing regular mana.

## Implementation

### I01. Model spell effects and mana pools

- Related Files:
  - `packages/game-core/src/types.ts` :: `SpellEffect`, `BattleState` — add typed discard and temporary-mana effects, and temporary counters to both mana pools; modify.
  - `packages/game-core/src/engine.ts` :: `beginEncounter`, `hydrateRunForCurrentBattle`, `applySpellEffect`, card payment and turn transitions — initialize/migrate and apply the new resource consistently; modify.

#### Details

- **Types and fields**:
  - Extend `SpellEffect` with `{ kind: "discardRandom" }` and `{ kind: "gainTemporaryMana"; amount: number }`.
  - Change both `BattleState.playerMana` and `BattleState.enemyMana` to `{ current: number; max: number; temporary: number }`.
  - `current` is total currently spendable mana, including `temporary`; `temporary` is the remaining temporary subset. New battles initialize both counters to `0` and keep `max` at `MAX_MANA` (10).
  - Migration in `hydrateRunForCurrentBattle` must set a missing `temporary` field to `0` independently for each mana pool, so existing locally saved runs remain valid.
- **Execution flow / logic**:
  1. On `discardRandom`, select uniformly with the battle's deterministic RNG from the caster's current hand. The spell being cast has already been removed. If the hand is empty, do nothing. Move the selected instance to `discardPile` for the player or `enemyDiscardPile` for the enemy and update `rngState` only when a card is selected.
  2. On `gainTemporaryMana`, add `amount` to both the selected mana pool's `current` and `temporary`. Do not clamp this effect to `max`.
  3. When paying card costs on either side, reduce `current` by cost and reduce `temporary` by `min(temporary, cost)`; this spends temporary mana first and preserves the regular-mana remainder.
  4. Keep regular `gainMana` capped at the regular pool's `max` while preserving any outstanding temporary mana. Compute regular mana as `current - temporary`, add only up to `max`, then recombine with `temporary`.
  5. Expire the player's remaining temporary mana when their turn ends, before enemy actions. Expire the enemy's remaining temporary mana after its card and minion actions and before the next player turn begins. Expiration subtracts the remaining temporary amount from `current`, then sets `temporary` to `0`.
- **Edge cases**:
  - Casting with no other cards still pays the spell's 1-mana cost and grants 3 temporary mana.
  - Spending all temporary mana leaves regular mana untouched except for any remaining cost.
  - A mix of current mana below max and temporary mana must not cause regular mana gain to erase temporary mana.

### I02. Add the spell definition and exact card text

- Related Files:
  - `packages/game-core/src/catalog.ts` :: `describeSpellEffects`, `BASE_CARD_CATALOG`, `CARD_CATALOG` — register and describe the card; modify.
  - `packages/game-core/src/engine.test.ts` :: catalog, player spell, enemy spell, migration, and mana lifecycle cases — add.

#### Details

- Add neutral card ID `soul-bargain`, name `영혼의 거래`, kind `spell`, cost `1`, reward tier `normal`, art key `soul-bargain`, with ordered effects `discardRandom` then `gainTemporaryMana` amount `3`.
- Leave `classId` and `playerOnly` unset. Do not add the ID to `SHARED_STARTER_CARD_IDS`, `STARTER_DECK_CARD_IDS`, or any class starter list.
- Generated description must state both effects precisely: discard one random card from hand, then gain 3 temporary mana for this turn. Use a player-neutral caster description; no vague “special effect” text.
- Add deterministic tests for random discard selection and discard-pile ownership on both sides, empty-hand behavior, temporary mana above 10, temporary-first payment, end-of-turn expiration, regular mana gain while temporary mana remains, and hydration of old saves lacking `temporary`.

## Acceptance Criteria

- [ ] Soul Bargain costs 1, discards one random remaining hand card when available, and grants 3 temporary mana even when there is no card to discard.
- [ ] The spell can raise usable mana above 10; temporary mana is spent first and any unused temporary amount expires at the correct turn boundary.
- [ ] Regular mana gain never removes temporary mana, and older saved battles hydrate with zero temporary mana.
- [ ] Player and enemy discard piles receive the correct discarded instance.
- [ ] The catalog description states the exact discard and temporary-mana effects.

## Validation

- `npm test -- packages/game-core/src/engine.test.ts` — all engine and catalog tests pass.
- `npm run build --workspace @board-game/game-core` — TypeScript build succeeds.

## Commit Message

```text
feat(game-core): add temporary mana and Soul Bargain effects

Plan: 2026-10-28-mangostone-game-polish
Phase: P01-core-mechanics
Task: T01-soul-bargain-engine

- Track and expire temporary mana for both combatants
- Resolve random hand discard and preserve mana pool invariants
```

## Progress

- [x] Implementation complete
- [x] Validation passed
- commit: pending

