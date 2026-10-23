# Task: T02 Player-Only Mana Spell

## Status: done

## Goal

Add one zero-cost spell that grants one available mana, replace one `치유 안개` in the player's starter deck, and keep the card out of generated enemy decks so it supports player balance without changing enemy behavior.

## Decision Summary

- Card: ID/art key `mana-spring`, name `마력의 샘`, normal reward tier, cost 0, effect `gainMana` amount 1, description `마나 1을 얻습니다.` Mark it player-only. The starter deck stays 30 cards with one copy of this card and one remaining copy of `치유 안개`.

## Implementation

### I01. Spell effect and card catalog

- Related Files:
  - `packages/game-core/src/types.ts` :: `SpellEffect`, `CardDefinition` — add mana-gain effect and optional player-only flag; modify.
  - `packages/game-core/src/catalog.ts` :: `describeSpellEffects`, `spell`, `CARD_CATALOG`, `STARTER_DECK_CARD_IDS` — register and describe the card and replace one starter copy; modify.
  - `packages/game-core/src/engine.ts` :: `applySpellEffect`, `createEnemyDeck` — apply capped mana gain and filter player-only cards from enemy generation; modify.

#### Details

- **Signatures & Types**:
  ```ts
  export type SpellEffect =
    | { kind: "damage"; amount: number; target: "enemyHero" | "enemyMinion" }
    | { kind: "heal"; amount: number; target: "playerHero" | "playerMinion" }
    | { kind: "summon"; cardId: string; count: number }
    | { kind: "buff"; attack: number; health: number; target: "playerMinion" }
    | { kind: "draw"; count: number }
    | { kind: "gainMana"; amount: number };

  export interface CardDefinition {
    // Preserve all existing fields.
    playerOnly?: boolean;
  }
  ```
- **Data & Schema Fields**:
  - `gainMana.amount` is a positive integer amount of current available mana gained; it does not raise `playerMana.max`.
  - `CardDefinition.playerOnly` is optional; missing/false means the card can enter generated enemy decks. Set it to `true` only for `mana-spring`.
  - Define `mana-spring` as a normal-tier spell with cost `0`, `artKey: "mana-spring"`, and `spellEffects: [{ kind: "gainMana", amount: 1 }]`.
- **Execution Flow / Logic**:
  1. Extend `describeSpellEffects` to produce exactly `마나 1을 얻습니다.` for the new effect.
  2. Add a final optional `playerOnly = false` argument to the local `spell(...)` catalog helper and include the field only when true; preserve existing card calls and reward tiers.
  3. Register `마력의 샘` as normal-tier and player-only. Its effect uses `caster` to select the acting side's mana state, then adds `amount` to `current`, capped at `max`. The player-only marker prevents this new spell from being used by enemies.
  4. In `createEnemyDeck`, exclude `card.playerOnly === true` before weighting/selecting candidates. The generated enemy deck must still contain 30 cards with no more than two copies of an ID.
  5. In `STARTER_DECK_CARD_IDS`, replace exactly one of the two `healing-mist` IDs with `mana-spring`. Keep 30 total cards, 20 minion cards, 10 spell cards, and no card above the existing two-copy limit. One `healing-mist` remains.
  6. Keep the player reward candidate logic unchanged: because the spell is normal-tier and is in `CARD_CATALOG`, it may be offered while the player's deck has fewer than two copies.
  7. Do not change enemy mana regeneration or enemy AI priorities.
  8. Keep `CardView`'s existing asset convention; the new `artKey` must resolve at `/art/cards/mana-spring.png` in both hand and reward card components.

### I02. Card data, effect, deck, and enemy-pool tests

- Related Files:
  - `packages/game-core/src/engine.test.ts` :: catalog descriptions, starter deck composition, player spell effects, and generated enemy deck tests — modify.
  - `apps/web/src/components/CardView.test.tsx` :: render the new card and check its image path, cost, and description; modify.

#### Details

- Update catalog totals from 30 to 31 unique definitions: 20 minion types and 11 spell types. Update the expected description map with `mana-spring: "마나 1을 얻습니다."`.
- Update starter deck assertions to 30 cards, 20 minion cards and 10 spell cards. Assert one `mana-spring`, one `healing-mist`, exactly two copies for other starter IDs, and no ID above two copies.
- Cast `mana-spring` from the player's hand with current mana below max; assert the spell moves to discard and mana increases by one. At current 9 assert it becomes 10; at current 10 assert it remains 10.
- Generate runs across deterministic seeds and assert every `enemyStarterDeck` has 30 cards, respects the two-copy cap, and contains no `mana-spring`.
- Update `CardView.test.tsx` to render a `mana-spring` instance and assert cost `0`, name `마력의 샘`, exact description, and image source `/art/cards/mana-spring.png`.

### I03. Card illustration

- Related Files:
  - `apps/web/public/art/cards/mana-spring.png` — new image used by `CardView` and reward cards.

#### Details

- Generate one square PNG illustration in the same dark-fantasy visual family as existing card art: a small luminous turquoise mana spring or crystal well in a shadowed stone shrine, gold highlights, dramatic painterly lighting, centered focal point, no text, no symbols resembling letters, no frame or UI elements.
- Keep `artKey: "mana-spring"` aligned with the exact path `/art/cards/mana-spring.png`; the image is used in both the hand card and reward screen.

## Acceptance Criteria

- [x] The spell displays cost 0 and the exact one-mana effect description.
- [x] Playing it increases current mana by 1 up to 10 and does not alter the maximum.
- [x] The starter deck remains 30 cards, with one mana spell replacing one `치유 안개`.
- [x] Generated enemy decks never contain the player-only card and remain 30 cards.
- [x] The card illustration loads from its `artKey` path.

## Validation

- `npm.cmd test --workspace @board-game/game-core -- src/engine.test.ts` — all engine/catalog tests pass.
- `npm.cmd run build --workspace @board-game/game-core` — game-core TypeScript build passes.
- `npm.cmd run build --workspace @board-game/web` — card art reference and shared game-core types compile/build.
- `npm.cmd run lint --workspace @board-game/game-core` — game-core lint passes.
- `npm.cmd test --workspace @board-game/web -- src/components/CardView.test.tsx` — the new card renders with its art path and readable effect.

## Commit Message

```text
feat(cards): add player-only mana gain spell

Plan: 2026-10-23-player-mana-curve-and-menu-guide
Phase: P01-player-balance-and-menu-guide
Task: T02-player-only-mana-spell

- Replace one healing spell with a zero-cost mana spell
- Keep the player-only card out of enemy decks
```

## Progress

- [x] Implementation complete
- [x] Validation passed
- commit: created
